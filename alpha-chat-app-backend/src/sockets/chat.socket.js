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
      
      // Mark user as online and notify others
      user.isOnline = true;
      user.lastSeen = new Date();
      await user.save();

      // Notify all users about online status
      io.emit("user_status_changed", {
        userId: user._id,
        isOnline: true,
        lastSeen: user.lastSeen
      });

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

    // --- Read Receipts ---
    socket.on("mark_as_read", async ({ roomId }) => {
      try {
        await Message.updateMany(
          { roomId, senderId: { $ne: socket.user._id }, status: { $ne: 'seen' } },
          { $set: { status: 'seen' } }
        );
        
        io.to(roomId).emit("messages_read", {
          roomId,
          userId: socket.user._id
        });
      } catch (error) {
        console.error("Error marking messages as read:", error);
      }
    });

    // --- Group Management ---
    socket.on("create_group", async (data) => {
      try {
        const { name, participants, description, avatar } = data;
        
        // Add creator as admin and participant
        const newRoom = new Room({
          name,
          description,
          avatar,
          type: 'group',
          participants: [...new Set([...participants, socket.user._id])],
          admin: [socket.user._id]
        });

        await newRoom.save();
        
        // Populate participants for the clients
        const populatedRoom = await Room.findById(newRoom._id)
          .populate("participants", "username photoURL isOnline");

        // Notify all participants
        populatedRoom.participants.forEach(p => {
          io.to(p._id.toString()).emit("room_created", populatedRoom);
        });

      } catch (error) {
        console.error("Error creating group:", error);
        socket.emit("error", { message: "Failed to create group" });
      }
    });

    socket.on("update_group", async (data) => {
      try {
        const { roomId, name, description, avatar } = data;
        const room = await Room.findById(roomId);
        
        if (!room || !room.admin.includes(socket.user._id)) {
          return socket.emit("error", { message: "Unauthorized or group not found" });
        }

        room.name = name || room.name;
        room.description = description || room.description;
        room.avatar = avatar || room.avatar;
        room.updatedAt = new Date();
        
        await room.save();
        io.to(roomId).emit("group_updated", room);
      } catch (error) {
        console.error("Error updating group:", error);
      }
    });

    // Fetch initial online users
    socket.on("get_online_users", async () => {
      const onlineUsers = await User.find({ isOnline: true }).select("_id");
      socket.emit("online_users_list", onlineUsers.map(u => u._id));
    });

    // --- Presence ---
    socket.on("disconnect", async () => {
      console.log(`User disconnected: ${socket.user.username}`);
      
      try {
        const lastSeen = new Date();
        // Mark user as offline
        await User.findByIdAndUpdate(socket.user._id, {
          isOnline: false,
          lastSeen
        });

        // Notify all users
        io.emit("user_status_changed", {
          userId: socket.user._id,
          isOnline: false,
          lastSeen
        });
      } catch (error) {
        console.error("Error updating presence on disconnect:", error);
      }
    });
  });
};

export default chatSocket;
