const express = require('express');
const router = express.Router();
const Testimonial = require('../models/Testimonial');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Helper function to upload to Cloudinary
const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: 'image', folder: 'kcare/testimonials' },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
    uploadStream.end(buffer);
  });
};

// Get all testimonials
router.get('/', async (req, res) => {
  try {
    const testimonials = await Testimonial.find().sort({ order: 1, createdAt: -1 });
    res.json(testimonials);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get active testimonials
router.get('/active', async (req, res) => {
  try {
    const testimonials = await Testimonial.find({ isActive: true }).sort({ order: 1 });
    res.json(testimonials);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single testimonial
router.get('/:id', async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);
    if (!testimonial) {
      return res.status(404).json({ error: 'Testimonial not found' });
    }
    res.json(testimonial);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create testimonial (protected)
router.post('/', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { name, designation, content, rating, isActive, order } = req.body;
    
    if (!name || !content) {
      return res.status(400).json({ error: 'Name and content are required' });
    }

    // Upload image to Cloudinary if provided
    let image = '';
    if (req.file) {
      image = await uploadToCloudinary(req.file.buffer);
    } else if (req.body.image) {
      image = req.body.image; // If URL provided directly
    }

    const testimonial = new Testimonial({
      name,
      designation,
      content,
      image,
      rating: rating || 5,
      isActive: isActive !== undefined ? isActive : true,
      order: order || 0
    });

    await testimonial.save();
    res.status(201).json(testimonial);
  } catch (error) {
    console.error('Create testimonial error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update testimonial (protected)
router.put('/:id', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);
    if (!testimonial) {
      return res.status(404).json({ error: 'Testimonial not found' });
    }

    const { name, designation, content, rating, isActive, order } = req.body;

    if (name) testimonial.name = name;
    if (designation !== undefined) testimonial.designation = designation;
    if (content) testimonial.content = content;
    if (rating !== undefined) testimonial.rating = rating;
    if (isActive !== undefined) testimonial.isActive = isActive;
    if (order !== undefined) testimonial.order = order;

    // Upload new image if provided
    if (req.file) {
      testimonial.image = await uploadToCloudinary(req.file.buffer);
    } else if (req.body.image !== undefined) {
      testimonial.image = req.body.image;
    }

    await testimonial.save();
    res.json(testimonial);
  } catch (error) {
    console.error('Update testimonial error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete testimonial (protected)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const testimonial = await Testimonial.findByIdAndDelete(req.params.id);
    if (!testimonial) {
      return res.status(404).json({ error: 'Testimonial not found' });
    }
    res.json({ message: 'Testimonial deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

