import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from "firebase/auth";
import { auth } from '../config/firebase.config';
import socketService from '../services/socket.service';
import ChatSidebar from '../components/chat/ChatSidebar';
import ChatWindow from '../components/chat/ChatWindow';
import useChatStore from '../store/useChatStore';

const Dashboard = () => {
  const [initializing, setInitializing] = useState(true);
  const {
    syncUser,
    clearChat,
    dbUser,
    theme,
    activeRoom,
    handleUserStatus,
    setOnlineUsersList,
    handleMessagesRead,
    addMessage,
    handleRoomCreated,
    handleGroupUpdated
  } = useChatStore();

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          await syncUser(currentUser);
          const token = await currentUser.getIdToken(true);
          const socket = socketService.connect(token);
          
          if (socket) {
            socket.on("user_status_changed", handleUserStatus);
            socket.on("online_users_list", setOnlineUsersList);
            socket.on("messages_read", handleMessagesRead);
            socket.on("receive_message", addMessage);
            socket.on("room_created", handleRoomCreated);
            socket.on("group_updated", handleGroupUpdated);
            socketService.emit("get_online_users");
          }
        } catch (error) {
          console.error("Auth sync error:", error);
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
      socketService.off("user_status_changed");
      socketService.off("online_users_list");
      socketService.off("messages_read");
      socketService.off("receive_message");
      socketService.off("room_created");
      socketService.off("group_updated");
    };
  }, [syncUser, clearChat, handleUserStatus, setOnlineUsersList, handleMessagesRead, addMessage, handleRoomCreated, handleGroupUpdated]);

  if (initializing) {
    return (
      <div className={`h-screen w-full flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900 text-gray-400' : 'bg-gray-50 text-gray-400'}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="animate-pulse text-sm font-medium">Initializing Alpha Chat...</p>
        </div>
      </div>
    );
  }

  if (!dbUser) {
    return (
      <div className={`h-screen w-full flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900 text-gray-400' : 'bg-gray-50 text-gray-400'}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="animate-pulse text-sm font-medium">User not found. Please log in again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen w-full flex overflow-hidden font-sans antialiased ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Sidebar - Rooms/Users */}
      <div className={`${activeRoom ? 'hidden md:flex' : 'flex'} w-full md:w-80 h-full border-r ${theme === 'dark' ? 'border-gray-800' : 'border-gray-100'}`}>
        <ChatSidebar currentUser={dbUser} />
      </div>

      {/* Main Chat Area */}
      <div className={`${activeRoom ? 'flex' : 'hidden md:flex'} flex-1 h-full`}>
        <ChatWindow currentUser={dbUser} />
      </div>
    </div>
  );
};

export default Dashboard;