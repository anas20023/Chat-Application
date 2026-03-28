import React, { useEffect, useState } from 'react';
import useChatStore from '../../store/useChatStore';
import { FiSearch, FiPlus, FiLogOut, FiX } from 'react-icons/fi';
import { MdLightMode,MdNightlight  } from "react-icons/md";
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { formatDistanceToNow } from 'date-fns';
import { auth } from '../../config/firebase.config';
import { signOut } from 'firebase/auth';
import axios from 'axios';
// import socketService from '../../services/socket.service';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

import GroupCreateModal from './GroupCreateModal';

const ChatSidebar = ({ currentUser }) => {
  const { 
    rooms, 
    fetchRooms, 
    activeRoom, 
    setActiveRoom, 
    isLoading, 
    theme, 
    setTheme, 
    onlineUsers 
  } = useChatStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      fetchRooms(currentUser._id);
    }
  }, [currentUser, fetchRooms]);

  // Handle User Search
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.trim() && isSearchingUsers) {
        setIsSearchLoading(true);
        try {
          const response = await axios.get(`${BACKEND_URL}/api/users/search?query=${searchTerm}`);
          // Filter out current user from results
          setSearchResults(response.data.filter(u => u._id !== currentUser._id));
        } catch (error) {
          console.error("Search error:", error);
        } finally {
          setIsSearchLoading(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, isSearchingUsers, currentUser._id]);

  const handleCreateDirectRoom = async (otherUserId) => {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/messages/rooms/direct`, {
        senderId: currentUser._id, 
        receiverId: otherUserId 
      });
      
      const newRoom = response.data;
      setActiveRoom(newRoom);
      setIsSearchingUsers(false);
      setSearchTerm('');
      fetchRooms(currentUser._id); // Refresh room list
    } catch (error) {
      console.error("Error creating room:", error);
    }
  };

  const filteredRooms = rooms.filter(room => {
    const otherUser = room.participants.find(p => p._id !== currentUser._id);
    return otherUser?.username?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleLogout = () => {
    signOut(auth);
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <div className={`w-full h-full flex flex-col border-r transition-colors duration-200 ${theme === 'dark' ? 'bg-[#1a1c22] border-gray-800' : 'bg-white border-gray-100'}`}>
      {/* Header */}
      <div className={`p-4 flex items-center justify-between border-b ${theme === 'dark' ? 'border-gray-800/50' : 'border-gray-50'}`}>
        <div className="flex items-center gap-3">
          <img 
            src={currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser.name || 'User'}&background=random`} 
            alt="Profile" 
            className={`w-10 h-10 rounded-full object-cover border-2 ${theme === 'dark' ? 'border-gray-700' : 'border-indigo-50'}`}
          />
          <h1 className={`font-bold truncate max-w-25 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{currentUser.name || 'Me'}</h1>
        </div>
        <div className="flex items-center gap-1 text-gray-400">
          <button 
            onClick={toggleTheme}
            className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-gray-800 text-yellow-500' : 'hover:bg-gray-50 text-gray-500'}`}
          >
            {theme === 'dark' ? <MdLightMode  size={20} className="rotate-45" /> : <MdNightlight size={20} />}
          </button>
          <button 
            onClick={() => setIsSearchingUsers(!isSearchingUsers)}
            className={`p-2 rounded-full transition-colors ${isSearchingUsers ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-gray-50'}`}
          >
            {isSearchingUsers ? <FiX size={20} /> : <FiSearch size={20} />}
          </button>
          <button onClick={handleLogout} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors">
            <FiLogOut size={20} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4">
        <div className="relative">
          <FiSearch className={`absolute left-3 top-1/2 -translate-y-1/2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} size={18} />
          <input 
            type="text" 
            placeholder={isSearchingUsers ? "Find people..." : "Search chats..."}
            className={`w-full border-none rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none ${
              theme === 'dark' ? 'bg-[#252830] text-gray-200 placeholder-gray-500' : 'bg-gray-50 text-gray-900'
            }`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Main List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {isSearchingUsers ? (
          // Search Results View
          <div className="animate-in fade-in duration-200">
            <div className="flex items-center justify-between px-4 py-2">
              <h4 className={`text-[10px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>People</h4>
              <button 
                onClick={() => setIsGroupModalOpen(true)}
                className="text-[10px] font-bold text-indigo-500 hover:text-indigo-400 uppercase tracking-wider flex"
              >
                <FiPlus size={14} className="mr-1" /> Create Group
              </button>
            </div>
            {isSearchLoading ? (
              <div className="flex justify-center p-8"><AiOutlineLoading3Quarters className="animate-spin text-indigo-500" /></div>
            ) : searchResults.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">No users found</div>
            ) : (
              searchResults.map(user => (
                <div 
                  key={user._id}
                  onClick={() => handleCreateDirectRoom(user._id)}
                  className={`flex items-center gap-3 p-4 cursor-pointer transition-colors ${
                    theme === 'dark' ? 'hover:bg-gray-800/50' : 'hover:bg-indigo-50/50'
                  }`}
                >
                  <img 
                    src={user.photoURL || `https://ui-avatars.com/api/?name=${user.username}&background=random`} 
                    alt={user.username} 
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>{user.username}</h3>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          // Conversation List View
          <div>
            {isLoading ? (
              <div className="p-4 text-center text-gray-400 text-sm">Loading conversations...</div>
            ) : filteredRooms.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-400 text-sm mb-4">No active chats</p>
                <button 
                  onClick={() => setIsSearchingUsers(true)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-4 py-2 rounded-lg transition-colors"
                >
                  Start Chatting
                </button>
              </div>
            ) : (
              filteredRooms.map(room => {
                const otherUser = room.participants.find(p => p._id !== currentUser._id);
                const isActive = activeRoom?._id === room._id;
                const isOnline = onlineUsers.includes(otherUser?._id);
                
                return (
                  <div 
                    key={room._id}
                    onClick={() => setActiveRoom(room)}
                    className={`flex items-center gap-3 p-4 cursor-pointer transition-all border-l-4 ${
                      isActive 
                        ? (theme === 'dark' ? 'bg-[#252830] border-indigo-500' : 'bg-indigo-50 border-indigo-600') 
                        : 'border-transparent hover:bg-opacity-50'
                    } ${theme === 'dark' ? 'hover:bg-gray-800/40' : 'hover:bg-indigo-50/30'}`}
                  >
                    <div className="relative">
                      <img 
                        src={otherUser?.photoURL || `https://ui-avatars.com/api/?name=${otherUser?.username || 'User'}&background=random`} 
                        alt={otherUser?.username} 
                        className={`w-12 h-12 rounded-full object-cover border shadow-sm ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}
                      />
                      {isOnline && (
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full shadow-sm"></div>
                      )}
                    </div>
                    {/* Unread indicator logic */}
                    {(() => {
                      const isUnread = room.lastMessage && 
                                       (room.lastMessage.senderId?._id || room.lastMessage.senderId) !== currentUser._id && 
                                       room.lastMessage.status !== 'seen' &&
                                       !isActive;
                      
                      return (
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline">
                            <h3 className={`text-sm truncate ${
                              isActive 
                                ? 'text-indigo-500 font-bold' 
                                : isUnread 
                                  ? (theme === 'dark' ? 'text-white font-bold' : 'text-gray-900 font-bold') 
                                  : (theme === 'dark' ? 'text-gray-200 font-semibold' : 'text-gray-900 font-semibold')
                            }`}>
                              {otherUser?.username || 'Group Chat'}
                            </h3>
                            {room.lastMessage && (
                              <div className="flex items-center gap-2">
                                {isUnread && <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>}
                                <span className={`text-[10px] whitespace-nowrap ${isUnread ? 'text-indigo-500 font-bold' : 'text-gray-500'}`}>
                                  {formatDistanceToNow(new Date(room.lastMessage.createdAt), { addSuffix: false })}
                                </span>
                              </div>
                            )}
                          </div>
                          <p className={`text-xs truncate mt-0.5 ${
                            isActive 
                              ? (theme === 'dark' ? 'text-indigo-400 font-medium' : 'text-indigo-600 font-medium') 
                              : isUnread 
                                ? (theme === 'dark' ? 'text-gray-100 font-bold' : 'text-gray-900 font-bold') 
                                : 'text-gray-500'
                          }`}>
                            {room.lastMessage?.message || 'Start a conversation'}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
      <GroupCreateModal 
        isOpen={isGroupModalOpen} 
        onClose={() => setIsGroupModalOpen(false)} 
        currentUser={currentUser}
      />
    </div>
  );
};

export default ChatSidebar;
