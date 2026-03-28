import { getAuth } from "firebase-admin/auth";
import Message from "../models/Message.js";
import User from "../models/User.js";
import Room from "../models/Room.js";

const chatSocket = (io) => {
  // Authentication middleware
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error: Token missing"));
    }

    try {
      // Verify Firebase ID token
      const decodedToken = await getAuth().verifyIdToken(token);
      
      // Find user in MongoDB using firebaseUid
      let user = await User.findOne({ firebaseUid: decodedToken.uid });
      
      // If user doesn't exist in DB, we could optionally create them here
      // but for production, they should have been created during registration
      if (!user) {
        return next(new Error("Authentication error: User not found in database"));
      }

      // Attach user info to socket
      socket.user = {
        _id: user._id,
        uid: decodedToken.uid,
        username: user.username,
        email: user.email
      };
      
      // Mark user as online
      user.isOnline = true;
      user.lastSeen = new Date();
      await user.save();

      next();
    } catch (error) {
      console.error("Socket authentication error:", error);
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.user.username} (${socket.id})`);

    // --- Core Events ---

    // Join Room
    socket.on("join_room", (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.user.username} joined room: ${roomId}`);
    });

    // Leave Room
    socket.on("leave_room", (roomId) => {
      socket.leave(roomId);
      console.log(`User ${socket.user.username} left room: ${roomId}`);
    });

    // Send Message
    socket.on("send_message", async (data) => {
      try {
        const { roomId, message, attachments } = data;

        if (!roomId || !message) {
          return socket.emit("error", { message: "RoomId and message are required" });
        }

        // 1. Save message to MongoDB BEFORE emitting
        const newMessage = new Message({
          senderId: socket.user._id,
          roomId,
          message,
          attachments: attachments || []
        });

        await newMessage.save();

        // 2. Populate sender info for the client
        const populatedMessage = await Message.findById(newMessage._id)
          .populate("senderId", "username photoURL");

        // 3. Emit only to room
        io.to(roomId).emit("receive_message", populatedMessage);

        // 4. Update Room's lastMessage
        await Room.findByIdAndUpdate(roomId, {
          lastMessage: newMessage._id,
          updatedAt: new Date()
        });

      } catch (error) {
        console.error("Error in send_message:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Typing Indicators
    socket.on("typing", (roomId) => {
      // Broadcast to others in the room
      socket.to(roomId).emit("user_typing", {
        userId: socket.user._id,
        username: socket.user.username
      });
    });

    socket.on("stop_typing", (roomId) => {
      socket.to(roomId).emit("user_stop_typing", {
        userId: socket.user._id
      });
    });

    // --- Presence ---
    socket.on("disconnect", async () => {
      console.log(`User disconnected: ${socket.user.username}`);
      
      try {
        // Mark user as offline
        await User.findByIdAndUpdate(socket.user._id, {
          isOnline: false,
          lastSeen: new Date()
        });
      } catch (error) {
        console.error("Error updating presence on disconnect:", error);
      }
    });
  });
};

export default chatSocket;
