import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from "firebase/auth";
import { auth } from '../config/firebase.config';
import socketService from '../services/socket.service';
import ChatSidebar from '../components/chat/ChatSidebar';
import ChatWindow from '../components/chat/ChatWindow';
import useChatStore from '../store/useChatStore';

const Dashboard = () => {
  const [initializing, setInitializing] = useState(true);
  const { syncUser, clearChat, dbUser } = useChatStore();

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // --- Sync User with MongoDB ---
        try {
          await syncUser(currentUser);
          
          // --- Socket Authentication ---
          const token = await currentUser.getIdToken(true);
          socketService.connect(token);
        } catch (error) {
          console.error("Failed to sync user or connect socket:", error);
        } finally {
          setInitializing(false);
        }
      } else {
        socketService.disconnect();
        clearChat();
        setInitializing(false);
      }
    });

    return () => {
      unsubscribe();
      socketService.disconnect();
    };
  }, [syncUser, clearChat]);

  if (initializing) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50 text-gray-400">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="animate-pulse text-sm font-medium">Initializing Alpha Chat...</p>
        </div>
      </div>
    );
  }

  if (!dbUser) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50 text-gray-400">
        <p>User not found. Please log in again.</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex bg-gray-50 overflow-hidden font-sans antialiased text-gray-900">
      {/* Sidebar - Rooms/Users */}
      <ChatSidebar currentUser={dbUser} />
      
      {/* Main Chat Area */}
      <ChatWindow currentUser={dbUser} />
    </div>
  );
};

export default Dashboard;