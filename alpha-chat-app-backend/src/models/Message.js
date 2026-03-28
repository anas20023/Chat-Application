import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  message: {
    type: String,
    trim: true,
    required: function() { return !this.attachments || this.attachments.length === 0; }
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'voice'],
    default: 'text'
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'seen'],
    default: 'sent'
  },
  attachments: [{
    type: String // URLs to files in Cloud Storage
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Index for faster queries within a room
messageSchema.index({ roomId: 1, createdAt: -1 });

export default mongoose.model('Message', messageSchema);