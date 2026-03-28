import { create } from 'zustand';
import axios from 'axios';
import socketService from '../services/socket.service';
import soundService from '../utils/sound.utils';

// URL normalization to prevent double slashes
const RAW_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
const BACKEND_URL = RAW_BACKEND_URL.replace(/\/$/, "");

const useChatStore = create((set, get) => ({
  rooms: [],
  activeRoom: null,
  messages: [],
  typingUsers: {}, // { roomId: [userId1, userId2] }
  onlineUsers: [], // Array of user IDs
  theme: localStorage.getItem('chat-theme') || 'light',
  isLoading: false,
  error: null,
  dbUser: null, // The MongoDB user record (synced from Firebase)

  // --- Auth/Sync Actions ---
  syncUser: async (firebaseUser, displayName) => {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/users/sync`, {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: displayName || firebaseUser.displayName,
        photoURL: firebaseUser.photoURL
      });
      
      const dbUser = response.data;
      set({ dbUser });
      return dbUser;
    } catch (error) {
      console.error("Failed to sync user with MongoDB:", error);
      throw new Error("User Already Exists");
    }
  },

  // --- Room Actions ---
  fetchRooms: async (mongodbUserId) => {
    if (!mongodbUserId) return;
    
    set({ isLoading: true });
    try {
      const response = await axios.get(`${BACKEND_URL}/api/messages/rooms/${mongodbUserId}`);
      set({ rooms: response.data, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  setActiveRoom: (room) => {
    const previousRoom = get().activeRoom;
    if (previousRoom) {
      socketService.emit('leave_room', previousRoom._id);
    }
    
    set({ activeRoom: room, messages: [] });
    
    if (room) {
      socketService.emit('join_room', room._id);
      get().fetchMessages(room._id);
      // Mark as read when entering
      socketService.emit('mark_as_read', { roomId: room._id });
    }
  },

  markAsRead: (roomId) => {
    socketService.emit('mark_as_read', { roomId });
  },

  // --- Message Actions ---
  fetchMessages: async (roomId, lastMessageId = null) => {
    try {
      const url = `${BACKEND_URL}/api/messages/${roomId}${lastMessageId ? `?lastMessageId=${lastMessageId}` : ''}`;
      const response = await axios.get(url);
      
      if (lastMessageId) {
        set((state) => ({ messages: [...response.data, ...state.messages] }));
      } else {
        set({ messages: response.data });
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  },

  addMessage: (message) => {
    const { activeRoom, dbUser } = get();
    
    // 1. Play "received" sound if the sender is not the current user
    const senderId = message.senderId?._id || message.senderId;
    if (dbUser && senderId !== dbUser._id) {
      soundService.play('received');

      // 2. If it's for the active room, mark as read automatically
      if (activeRoom && activeRoom._id === message.roomId) {
        socketService.emit('mark_as_read', { roomId: message.roomId });
      }
    }
    
    // 3. If the message belongs to the active room, add it to the messages list
    if (activeRoom && activeRoom._id === message.roomId) {
      set((state) => ({ 
        messages: [...state.messages, message] 
      }));
    }
    
    // 4. Update the room in the sidebar list (last message, timestamp, position)
    set((state) => {
      const roomIndex = state.rooms.findIndex(r => r._id === message.roomId);
      
      if (roomIndex === -1) return state; // Room not in list (yet)

      const updatedRooms = [...state.rooms];
      updatedRooms[roomIndex] = {
        ...updatedRooms[roomIndex],
        lastMessage: message,
        updatedAt: new Date().toISOString()
      };

      // Sort rooms by updatedAt descending
      return {
        rooms: updatedRooms.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      };
    });
  },

  // --- Socket Event Handlers ---
  handleTyping: (roomId, userData) => {
    set((state) => {
      const current = state.typingUsers[roomId] || [];
      if (current.find(u => u.userId === userData.userId)) return state;
      return {
        typingUsers: {
          ...state.typingUsers,
          [roomId]: [...current, userData]
        }
      };
    });
  },

  handleStopTyping: (roomId, userId) => {
    set((state) => {
      const current = state.typingUsers[roomId] || [];
      return {
        typingUsers: {
          ...state.typingUsers,
          [roomId]: current.filter(u => u.userId !== userId)
        }
      };
    });
  },

  handleUserStatus: ({ userId, isOnline }) => {
    set((state) => ({
      onlineUsers: isOnline 
        ? [...new Set([...state.onlineUsers, userId])]
        : state.onlineUsers.filter(id => id !== userId)
    }));
  },

  setOnlineUsersList: (userIds) => {
    set({ onlineUsers: userIds });
  },

  handleMessagesRead: ({ roomId, userId }) => {
    const { dbUser } = get();
    
    // Play "seen" sound if OUR message was read by the other person
    if (dbUser && userId !== dbUser._id) {
      const room = get().rooms.find(r => r._id === roomId);
      const lastMsg = room?.lastMessage;
      if (lastMsg) {
        const lastMsgSenderId = lastMsg.senderId?._id || lastMsg.senderId;
        if (lastMsgSenderId === dbUser._id && lastMsg.status !== 'seen') {
          soundService.play('seen');
        }
      }
    }

    set((state) => ({
      messages: state.messages.map(msg => 
        msg.roomId === roomId && (msg.senderId?._id || msg.senderId) !== userId 
          ? { ...msg, status: 'seen' } 
          : msg
      ),
      // Update lastMessage status in the rooms list as well
      rooms: state.rooms.map(room => 
        room._id === roomId && room.lastMessage && (room.lastMessage.senderId?._id || room.lastMessage.senderId) !== userId
          ? { ...room, lastMessage: { ...room.lastMessage, status: 'seen' } }
          : room
      )
    }));
  },

  handleRoomCreated: (newRoom) => {
    set((state) => {
      // Avoid duplicates
      if (state.rooms.find(r => r._id === newRoom._id)) return state;
      
      // Add to rooms and sort
      return {
        rooms: [newRoom, ...state.rooms].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      };
    });

    // Automatically join the socket room
    socketService.emit('join_room', newRoom._id);
  },

  handleGroupUpdated: (updatedRoom) => {
    set((state) => ({
      rooms: state.rooms.map(r => r._id === updatedRoom._id ? { ...r, ...updatedRoom } : r),
      activeRoom: state.activeRoom?._id === updatedRoom._id ? { ...state.activeRoom, ...updatedRoom } : state.activeRoom
    }));
  },

  setTheme: (theme) => {
    localStorage.setItem('chat-theme', theme);
    set({ theme });
  },

  // --- Utility ---
  clearChat: () => {
    set({ activeRoom: null, messages: [], typingUsers: {}, dbUser: null });
  }
}));

export default useChatStore;
