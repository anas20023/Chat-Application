import express from 'express';
const router = express.Router();
import * as messageController from '../controllers/message.controller.js';

// --- Room Routes ---

// Get all rooms for a user
router.get('/rooms/:userId', messageController.getRooms);

// Create or get a direct room between two users
router.post('/rooms/direct', messageController.getOrCreateDirectRoom);

// --- Message Routes ---

// Get messages for a specific room with pagination
router.get('/:roomId', messageController.getMessages);

export default router;