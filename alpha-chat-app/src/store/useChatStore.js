import { create } from 'zustand';
import axios from 'axios';
import socketService from '../services/socket.service';

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
    set((state) => ({ 
      messages: [...state.messages, message] 
    }));
    
    // Update last message in rooms list for sidebar
    set((state) => ({
      rooms: state.rooms.map(room => 
        room._id === message.roomId 
          ? { ...room, lastMessage: message, updatedAt: new Date().toISOString() }
          : room
      ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    }));
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
    set((state) => ({
      messages: state.messages.map(msg => 
        msg.roomId === roomId && msg.senderId._id !== userId 
          ? { ...msg, status: 'seen' } 
          : msg
      )
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
