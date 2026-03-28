import React, { useEffect, useRef, useState } from 'react';
import useChatStore from '../../store/useChatStore';
import socketService from '../../services/socket.service';
import MessageBubble from './MessageBubble';
import { FiImage, FiSmile, FiSearch, FiPhone, FiVideo, FiInfo, FiX } from 'react-icons/fi';
import { IoSend } from 'react-icons/io5';

const ChatWindow = ({ currentUser }) => {
  const { 
    activeRoom, 
    setActiveRoom,
    messages, 
    addMessage, 
    handleTyping, 
    handleStopTyping, 
    typingUsers,
    theme,
    onlineUsers
  } = useChatStore();
  const [message, setMessage] = useState('');
  const scrollRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!activeRoom) return;

    socketService.on('receive_message', (newMessage) => {
      addMessage(newMessage);
    });

    socketService.on('user_typing', (data) => {
      handleTyping(activeRoom._id, data);
    });

    socketService.on('user_stop_typing', ({ userId }) => {
      handleStopTyping(activeRoom._id, userId);
    });

    return () => {
      socketService.off('receive_message');
      socketService.off('user_typing');
      socketService.off('user_stop_typing');
    };
  }, [activeRoom, addMessage, handleTyping, handleStopTyping]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim() || !activeRoom) return;

    const messageData = {
      roomId: activeRoom._id,
      message: message.trim(),
    };

    socketService.emit('send_message', messageData);
    setMessage('');
    socketService.emit('stop_typing', activeRoom._id);
  };

  const handleInputChange = (e) => {
    setMessage(e.target.value);
    
    if (activeRoom) {
      socketService.emit('typing', activeRoom._id);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketService.emit('stop_typing', activeRoom._id);
      }, 2000);
    }
  };

  if (!activeRoom) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center p-8 text-center transition-colors duration-200 ${
        theme === 'dark' ? 'bg-[#1a1c22] text-gray-500' : 'bg-gray-50 text-gray-400'
      }`}>
        <div className={`w-24 h-24 rounded-3xl shadow-sm flex items-center justify-center mb-6 ${
          theme === 'dark' ? 'bg-[#252830]' : 'bg-white'
        }`}>
          <FiSmile size={48} className={theme === 'dark' ? 'text-gray-700' : 'text-indigo-200'} />
        </div>
        <h2 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>Welcome to Alpha Chat</h2>
        <p className="max-w-md">Select a conversation from the sidebar or start a new one to begin chatting in real-time.</p>
      </div>
    );
  }

  const otherUser = activeRoom.participants.find(p => p._id !== currentUser._id);
  const isOnline = onlineUsers.includes(otherUser?._id);
  const roomTypingUsers = typingUsers[activeRoom._id] || [];

  return (
    <div className={`flex-1 flex flex-col overflow-hidden relative transition-colors duration-200 ${
      theme === 'dark' ? 'bg-[#15171c]' : 'bg-white'
    }`}>
      {/* Header */}
      <div className={`p-4 flex items-center justify-between border-b z-10 ${
        theme === 'dark' ? 'bg-[#1a1c22] border-gray-800' : 'bg-white border-gray-100 shadow-sm'
      }`}>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setActiveRoom(null)}
            className={`md:hidden p-2 -ml-2 rounded-full hover:bg-opacity-10 ${theme === 'dark' ? 'text-gray-400 hover:bg-white' : 'text-gray-600 hover:bg-gray-900'}`}
          >
            <FiX size={20} className="rotate-0" />
          </button>
          <div className="relative">
            <img 
              src={otherUser?.photoURL || `https://ui-avatars.com/api/?name=${otherUser?.username}&background=random`} 
              alt={otherUser?.username} 
              className={`w-10 h-10 rounded-full object-cover border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100 shadow-sm'}`}
            />
            {isOnline && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full shadow-sm"></div>
            )}
          </div>
          <div>
            <h2 className={`font-bold leading-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{otherUser?.username || 'Group Chat'}</h2>
            <p className={`text-[10px] font-medium ${isOnline ? 'text-green-500' : 'text-gray-500'}`}>
              {isOnline ? 'Online now' : 'Offline'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-gray-400">
          <button className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`}><FiPhone size={20} /></button>
          <button className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`}><FiVideo size={20} /></button>
          <button className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`}><FiInfo size={20} /></button>
        </div>
      </div>

      {/* Message Feed */}
      <div 
        ref={scrollRef}
        className={`flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar ${
          theme === 'dark' ? 'bg-[#15171c]' : 'bg-[#f8f9fa]'
        }`}
      >
        <div className="flex flex-col">
          {messages.map((msg) => (
            <MessageBubble 
              key={msg._id} 
              message={msg} 
              isMe={msg.senderId._id === currentUser._id} 
            />
          ))}
          
          {roomTypingUsers.length > 0 && (
            <div className="flex gap-2 items-center text-xs text-gray-500 mt-2 ml-1 animate-pulse">
              <div className="flex gap-1">
                <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce"></div>
                <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
              <span>{roomTypingUsers[0].username} is typing...</span>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className={`p-4 border-t flex items-end gap-3 ${
        theme === 'dark' ? 'bg-[#1a1c22] border-gray-800' : 'bg-white border-gray-100'
      }`}>
        <div className="flex gap-1 mb-1">
          <button className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'text-gray-500 hover:text-indigo-400 hover:bg-gray-800' : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'}`}>
            <FiSmile size={22} />
          </button>
          <button className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'text-gray-500 hover:text-indigo-400 hover:bg-gray-800' : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'}`}>
            <FiImage size={22} />
          </button>
        </div>
        
        <form onSubmit={handleSendMessage} className="flex-1 flex gap-3 items-end">
          <div className={`flex-1 rounded-2xl p-3 border transition-all ${
            theme === 'dark' 
              ? 'bg-[#252830] border-gray-700 focus-within:border-indigo-500/50' 
              : 'bg-gray-50 border-gray-100 focus-within:border-indigo-300'
          }`}>
            <textarea 
              placeholder="Type a message..." 
              className={`w-full bg-transparent border-none outline-none text-sm resize-none max-h-32 placeholder-gray-500 ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}
              rows={1}
              value={message}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
            />
          </div>
          <button 
            type="submit"
            disabled={!message.trim()}
            className="mb-1 p-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 disabled:bg-gray-700 disabled:text-gray-500 transition-all shadow-lg shadow-indigo-500/10"
          >
            <IoSend size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;
