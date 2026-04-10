# K Care Clinic Backend API

Backend server for AI Assistant with Express and MongoDB.

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the backend folder:

```bash
# Copy the example file
cp env.example .env
```

Or create `.env` manually with these variables:

Edit `.env` and update:
- `PORT` - Server port (default: 3001)
- `FRONTEND_URL` - Your frontend URL for CORS
- `MONGODB_URI` - MongoDB connection string (optional)

### 3. MongoDB Setup (Optional)

#### Option A: Local MongoDB

1. Install MongoDB: https://www.mongodb.com/try/download/community
2. Start MongoDB service
3. Use: `mongodb://localhost:27017/kcare-clinic`

#### Option B: MongoDB Atlas (Cloud - Free)

1. Go to https://www.mongodb.com/cloud/atlas
2. Create free account
3. Create a cluster (free tier)
4. Get connection string
5. Update `MONGODB_URI` in `.env`

**Note:** MongoDB is optional. The server works without it (chat history won't be saved).

### 4. Start the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:3001`

## API Endpoints

### Health Check
```
GET /health
```

### Hugging Face API Proxy
```
POST /api/huggingface
Body: {
  inputs: {
    past_user_inputs: [],
    generated_responses: [],
    text: "user message"
  },
  parameters: {
    max_length: 200,
    temperature: 0.7
  }
}
```

### Save Chat Message (Optional - requires MongoDB)
```
POST /api/chat/save
Body: {
  sessionId: "unique-session-id",
  role: "user" | "assistant",
  content: "message content"
}
```

### Get Chat History (Optional - requires MongoDB)
```
GET /api/chat/history/:sessionId
```

## Frontend Configuration

Update your frontend `.env` file:

```
VITE_BACKEND_URL=http://localhost:3001
```

Or update `AIAssistant.jsx`:

```javascript
const BACKEND_PROXY_URL = 'http://localhost:3001';
```

## Troubleshooting

### MongoDB Connection Failed?
- The server works without MongoDB
- Chat history won't be saved, but AI API will work
- Check MongoDB is running: `mongosh` or check MongoDB service

### Port Already in Use?
- Change `PORT` in `.env` file
- Update frontend `VITE_BACKEND_URL` to match

### CORS Errors?
- Update `FRONTEND_URL` in `.env` to match your frontend URL
- Or update CORS settings in `server.js`

## Production Deployment

### Deploy to Railway
1. Connect GitHub repo
2. Set environment variables
3. Deploy

### Deploy to Render
1. Create new Web Service
2. Connect repo
3. Set build command: `cd backend && npm install`
4. Set start command: `cd backend && npm start`
5. Add environment variables

### Deploy to Heroku
1. `heroku create`
2. `heroku config:set MONGODB_URI=your-connection-string`
3. `git push heroku main`

## Notes

- MongoDB is **optional** - server works without it
- Chat history feature requires MongoDB
- AI API proxy works without MongoDB
- All features work with intelligent fallback if backend is down

