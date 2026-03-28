import express from 'express';
const router = express.Router();
import * as userController from '../controllers/user.controller.js';

// Sync Firebase User with MongoDB
router.post('/sync', userController.syncUser);

// Search users
router.get('/search', userController.searchUsers);

export default router;
