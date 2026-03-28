import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';
import MongoDBConnection from './src/config/db.js'
import FirebaseConfig from './src/config/firebase.config.js'
import chatSocket from './src/sockets/chat.socket.js';
import messageRoutes from './src/routes/messages.js';
import userRoutes from './src/routes/users.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Firebase Admin initialization
FirebaseConfig();

// MongoDB connection
MongoDBConnection();

// Routes
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Alpha Chat API' });
});

// Initialize Socket logic
chatSocket(io);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { app, server, io };