import React, { useEffect, useState } from 'react';
import useChatStore from '../../store/useChatStore';
import { Search, Plus, LogOut, X, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { auth } from '../../config/firebase.config';
import { signOut } from 'firebase/auth';
import axios from 'axios';
import socketService from '../../services/socket.service';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const ChatSidebar = ({ currentUser }) => {
  const { rooms, fetchRooms, activeRoom, setActiveRoom, isLoading } = useChatStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
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

  return (
    <div className="w-80 h-full flex flex-col border-r border-gray-100 bg-white">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-gray-50">
        <div className="flex items-center gap-3">
          <img 
            src={currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser.displayName || 'User'}&background=random`} 
            alt="Profile" 
            className="w-10 h-10 rounded-full object-cover border-2 border-indigo-50"
          />
          <h1 className="font-bold text-gray-900 truncate max-w-[100px]">{currentUser.displayName || 'Me'}</h1>
        </div>
        <div className="flex items-center gap-1 text-gray-400">
          <button 
            onClick={() => setIsSearchingUsers(!isSearchingUsers)}
            className={`p-2 rounded-full transition-colors ${isSearchingUsers ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-gray-50'}`}
          >
            {isSearchingUsers ? <X size={20} /> : <Plus size={20} />}
          </button>
          <button onClick={handleLogout} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder={isSearchingUsers ? "Find people..." : "Search messages..."}
            className="w-full bg-gray-50 border-none rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Main List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {isSearchingUsers ? (
          // Search Results View
          <div className="animate-in fade-in slide-in-from-top-1 duration-200">
            <h4 className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">People</h4>
            {isSearchLoading ? (
              <div className="flex justify-center p-8"><Loader2 className="animate-spin text-indigo-500" /></div>
            ) : searchResults.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">No users found</div>
            ) : (
              searchResults.map(user => (
                <div 
                  key={user._id}
                  onClick={() => handleCreateDirectRoom(user._id)}
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-indigo-50/50 transition-colors"
                >
                  <img 
                    src={user.photoURL || `https://ui-avatars.com/api/?name=${user.username}&background=random`} 
                    alt={user.username} 
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{user.username}</h3>
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
                
                return (
                  <div 
                    key={room._id}
                    onClick={() => setActiveRoom(room)}
                    className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-indigo-50/30 transition-all border-l-4 ${
                      isActive ? 'bg-indigo-50/50 border-indigo-600' : 'border-transparent'
                    }`}
                  >
                    <div className="relative">
                      <img 
                        src={otherUser?.photoURL || `https://ui-avatars.com/api/?name=${otherUser?.username || 'User'}&background=random`} 
                        alt={otherUser?.username} 
                        className="w-12 h-12 rounded-full object-cover border border-gray-100 shadow-sm"
                      />
                      {otherUser?.isOnline && (
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full shadow-sm"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <h3 className={`text-sm font-semibold truncate ${isActive ? 'text-indigo-900' : 'text-gray-900'}`}>
                          {otherUser?.username || 'Unknown User'}
                        </h3>
                        {room.lastMessage && (
                          <span className="text-[10px] text-gray-400 whitespace-nowrap">
                            {formatDistanceToNow(new Date(room.lastMessage.createdAt), { addSuffix: false })}
                          </span>
                        )}
                      </div>
                      <p className={`text-xs truncate mt-0.5 ${isActive ? 'text-indigo-600' : 'text-gray-500'}`}>
                        {room.lastMessage?.message || 'Start a conversation'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;
