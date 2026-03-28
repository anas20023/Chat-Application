import Message from "../models/Message.js";
import Room from "../models/Room.js";
import User from "../models/User.js";

// Fetch messages for a specific room with pagination
export const getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 20, lastMessageId } = req.query;

    if (!roomId) {
      return res.status(400).json({ error: "Room ID is required" });
    }

    // Build query for cursor-based pagination
    const query = { roomId };
    if (lastMessageId) {
      const lastMessage = await Message.findById(lastMessageId);
      if (lastMessage) {
        query.createdAt = { $lt: lastMessage.createdAt };
      }
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 }) // Get newest first for pagination
      .limit(parseInt(limit))
      .populate("senderId", "username photoURL");

    // Return in ascending order for the chat UI
    res.status(200).json(messages.reverse());
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Fetch all rooms for a user (Sidebar)
export const getRooms = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const rooms = await Room.find({
      participants: userId
    })
    .populate("participants", "username photoURL isOnline lastSeen")
    .populate("lastMessage")
    .sort({ updatedAt: -1 });

    res.status(200).json(rooms);
  } catch (error) {
    console.error("Error fetching rooms:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Create or get a direct room between two users
export const getOrCreateDirectRoom = async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;

    if (!senderId || !receiverId) {
      return res.status(400).json({ error: "Sender and Receiver IDs are required" });
    }

    // Check if room already exists
    let room = await Room.findOne({
      type: "direct",
      participants: { $all: [senderId, receiverId] }
    }).populate("participants", "username photoURL isOnline lastSeen");

    if (!room) {
      // Create new room
      room = new Room({
        type: "direct",
        participants: [senderId, receiverId]
      });
      await room.save();
      
      room = await Room.findById(room._id).populate("participants", "username photoURL isOnline lastSeen");
    }

    res.status(200).json(room);
  } catch (error) {
    console.error("Error in getOrCreateDirectRoom:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
