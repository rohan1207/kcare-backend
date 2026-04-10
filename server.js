// Backend Server for K Care Clinic AI Assistant
// Express + MongoDB setup

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware - CORS configuration
const getCorsOrigins = () => {
  const defaultOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'https://kcare.onrender.com',
    'https://kcare-admin.onrender.com' // Production frontend on Render
  ];
  
  if (process.env.FRONTEND_URL) {
    // If FRONTEND_URL is set, check if it's comma-separated
    const envOrigins = process.env.FRONTEND_URL.split(',').map(url => url.trim()).filter(url => url);
    return [...new Set([...envOrigins, ...defaultOrigins])];
  }
  
  return defaultOrigins;
};

app.use(cors({
  origin: getCorsOrigins(),
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kcare-clinic';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
  })
  .catch((error) => {
    console.log('⚠️ MongoDB connection failed:', error.message);
    console.log('💡 Continuing without MongoDB (optional for chat history)');
  });

// Chat Message Schema (optional - for storing chat history)
const chatMessageSchema = new mongoose.Schema({
  sessionId: String,
  role: String,
  content: String,
  timestamp: { type: Date, default: Date.now }
});

const ChatMessage = mongoose.models.ChatMessage || mongoose.model('ChatMessage', chatMessageSchema);

// Import routes
const authRoutes = require('./routes/auth');
const blogRoutes = require('./routes/blogs');
const heroSectionRoutes = require('./routes/heroSection');
const testimonialRoutes = require('./routes/testimonials');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/hero-section', heroSectionRoutes);
app.use('/api/testimonials', testimonialRoutes);

// Uptime robot / ping – lightweight, no DB (for monitoring)
app.get('/ping', (req, res) => {
  res.status(200).json({ pong: true, timestamp: new Date().toISOString() });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'K Care Clinic Backend API is running',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// AI API proxy endpoint - Supports multiple free APIs
app.post('/api/ai-chat', async (req, res) => {
  try {
    console.log('📥 Received request for AI chat');
    
    const { message, conversationHistory = [] } = req.body;
    
    if (!message) {
      return res.status(400).json({ 
        error: 'Missing required field: message' 
      });
    }

    // Try Groq API (Primary AI provider)
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (GROQ_API_KEY) {
      try {
        console.log('🔄 Using Groq API...');
        
        // Enhanced system prompt for clinic recommendations
        const systemPrompt = `You are a helpful AI assistant for K Care Clinic, a specialized healthcare facility in Pune, India, focusing on robotic and laparoscopic surgery.

IMPORTANT INSTRUCTIONS:
1. When users ask about diseases, symptoms, medical conditions, or health concerns:
   - First provide helpful, informative details about the condition
   - Explain symptoms, causes, and general information
   - Then ALWAYS conclude with: "For proper diagnosis and treatment, I recommend visiting K Care Clinic. Our expert doctors specialize in advanced surgical procedures including robotic and laparoscopic surgery. Would you like to book a consultation?"

2. For general clinic inquiries (timings, location, services):
   - Provide accurate information about K Care Clinic
   - Be helpful and professional

3. Always maintain a professional, caring, and informative tone
4. Never provide specific medical diagnoses or treatment plans - always recommend professional consultation
5. Keep responses concise but informative (200-300 words)

Remember: After explaining any medical information, always recommend visiting K Care Clinic for proper treatment.`;

        const groqResponse = await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            model: 'llama-3.1-8b-instant',
            messages: [
              {
                role: 'system',
                content: systemPrompt
              },
              ...conversationHistory.slice(-6),
              { role: 'user', content: message }
            ],
            max_tokens: 400,
            temperature: 0.7,
          },
          {
            headers: {
              'Authorization': `Bearer ${GROQ_API_KEY}`,
              'Content-Type': 'application/json',
            },
            timeout: 15000,
          }
        );

        if (groqResponse.data?.choices?.[0]?.message?.content) {
          let response = groqResponse.data.choices[0].message.content;
          
          // Ensure clinic recommendation is added for medical/disease queries
          const lowerMessage = message.toLowerCase();
          const isMedicalQuery = 
            lowerMessage.includes('disease') || 
            lowerMessage.includes('symptom') || 
            lowerMessage.includes('pain') || 
            lowerMessage.includes('condition') || 
            lowerMessage.includes('treatment') ||
            lowerMessage.includes('diagnosis') ||
            lowerMessage.includes('illness') ||
            lowerMessage.includes('sick') ||
            lowerMessage.includes('health problem');
          
          if (isMedicalQuery && !response.toLowerCase().includes('k care clinic') && !response.toLowerCase().includes('visit')) {
            response += '\n\nFor proper diagnosis and treatment, I recommend visiting K Care Clinic. Our expert doctors specialize in advanced surgical procedures including robotic and laparoscopic surgery. Would you like to book a consultation?';
          }
          
          console.log('✅ Groq API response received');
          return res.json({ 
            response: response,
            source: 'groq'
          });
        }
      } catch (groqError) {
        console.log('⚠️ Groq API failed:', groqError.message);
        console.log('💡 Falling back to intelligent fallback system');
      }
    }

    // Fallback to intelligent system if Groq fails or not configured
    console.log('💡 Using intelligent fallback system');
    return res.status(200).json({
      response: null,
      source: 'fallback',
      message: 'Intelligent fallback system will handle the response.'
    });

  } catch (error) {
    console.error('❌ Error in AI chat endpoint:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Legacy endpoint for backward compatibility (uses Groq)
app.post('/api/huggingface', async (req, res) => {
  try {
    const { inputs } = req.body;
    const message = inputs?.text || '';
    const conversationHistory = [];
    
    if (inputs?.past_user_inputs && inputs?.generated_responses) {
      for (let i = 0; i < Math.max(inputs.past_user_inputs.length, inputs.generated_responses.length); i++) {
        if (inputs.past_user_inputs[i]) {
          conversationHistory.push({ role: 'user', content: inputs.past_user_inputs[i] });
        }
        if (inputs.generated_responses[i]) {
          conversationHistory.push({ role: 'assistant', content: inputs.generated_responses[i] });
        }
      }
    }

    // Use Groq API
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (GROQ_API_KEY) {
      try {
        const systemPrompt = `You are a helpful AI assistant for K Care Clinic, a specialized healthcare facility in Pune, India, focusing on robotic and laparoscopic surgery.

IMPORTANT: When users ask about diseases, symptoms, or medical conditions, provide helpful information and then ALWAYS recommend visiting K Care Clinic for proper diagnosis and treatment.`;

        const groqResponse = await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            model: 'llama-3.1-8b-instant',
            messages: [
              {
                role: 'system',
                content: systemPrompt
              },
              ...conversationHistory.slice(-6),
              { role: 'user', content: message }
            ],
            max_tokens: 400,
            temperature: 0.7,
          },
          {
            headers: {
              'Authorization': `Bearer ${GROQ_API_KEY}`,
              'Content-Type': 'application/json',
            },
            timeout: 15000,
          }
        );

        if (groqResponse.data?.choices?.[0]?.message?.content) {
          return res.json({ generated_text: groqResponse.data.choices[0].message.content });
        }
      } catch (error) {
        // Continue to fallback
      }
    }

    // Fallback indicator
    return res.status(200).json({
      error: 'No AI API configured',
      fallback: true,
      message: 'Intelligent fallback system will handle the response'
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Internal server error',
      fallback: true
    });
  }
});

// Save chat message (optional - for chat history)
app.post('/api/chat/save', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'MongoDB not connected' });
    }

    const { sessionId, role, content } = req.body;
    
    if (!sessionId || !role || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const message = new ChatMessage({
      sessionId,
      role,
      content
    });

    await message.save();
    res.json({ success: true, message: 'Chat message saved' });
  } catch (error) {
    console.error('Error saving chat message:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get chat history (optional)
app.get('/api/chat/history/:sessionId', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'MongoDB not connected' });
    }

    const { sessionId } = req.params;
    const messages = await ChatMessage.find({ sessionId }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 K Care Clinic Backend Server running on http://localhost:${PORT}`);
  console.log(`🤖 AI Chat API: http://localhost:${PORT}/api/ai-chat`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
  console.log(`📦 MongoDB: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Not connected'}`);
  console.log(`🔑 Groq API: ${process.env.GROQ_API_KEY ? 'Configured' : 'Not configured'}`);
});

