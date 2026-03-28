import React, { useEffect, useRef, useState } from 'react';
import useChatStore from '../../store/useChatStore';
import socketService from '../../services/socket.service';
import MessageBubble from './MessageBubble';
import { Send, Image, Smile, Search, Phone, Video, Info } from 'lucide-react';

const ChatWindow = ({ currentUser }) => {
  const { activeRoom, messages, addMessage, handleTyping, handleStopTyping, typingUsers } = useChatStore();
  const [message, setMessage] = useState('');
  const scrollRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    // Auto scroll to bottom
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!activeRoom) return;

    // Listen for incoming messages
    socketService.on('receive_message', (newMessage) => {
      addMessage(newMessage);
    });

    // Listen for typing events
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
    
    // Stop typing indicator immediately
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
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-gray-400 p-8 text-center">
        <div className="w-24 h-24 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6">
          <Smile size={48} className="text-indigo-200" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Welcome to Alpha Chat</h2>
        <p className="max-w-md">Select a conversation from the sidebar or start a new one to begin chatting in real-time.</p>
      </div>
    );
  }

  const otherUser = activeRoom.participants.find(p => p._id !== currentUser._id);
  const roomTypingUsers = typingUsers[activeRoom._id] || [];

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-gray-100 bg-white shadow-sm z-10 transition-all">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img 
              src={otherUser?.photoURL || `https://ui-avatars.com/api/?name=${otherUser?.username}&background=random`} 
              alt={otherUser?.username} 
              className="w-10 h-10 rounded-full object-cover border border-gray-100 shadow-sm"
            />
            {otherUser?.isOnline && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full shadow-sm"></div>
            )}
          </div>
          <div>
            <h2 className="font-bold text-gray-900 leading-tight">{otherUser?.username}</h2>
            <p className="text-[10px] text-gray-500 font-medium">
              {otherUser?.isOnline ? 'Online now' : 'Active some time ago'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-gray-400">
          <button className="p-2 hover:bg-gray-50 rounded-full transition-colors"><Search size={20} /></button>
          <button className="p-2 hover:bg-gray-50 rounded-full transition-colors"><Phone size={20} /></button>
          <button className="p-2 hover:bg-gray-50 rounded-full transition-colors"><Video size={20} /></button>
          <button className="p-2 hover:bg-gray-50 rounded-full transition-colors"><Info size={20} /></button>
        </div>
      </div>

      {/* Message Feed */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#f8f9fa] custom-scrollbar"
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
            <div className="flex gap-2 items-center text-xs text-gray-400 mt-2 ml-1 animate-pulse">
              <div className="flex gap-1">
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
              <span>{roomTypingUsers[0].username} is typing...</span>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100 flex items-end gap-3">
        <div className="flex gap-1 mb-1">
          <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors">
            <Smile size={22} />
          </button>
          <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors">
            <Image size={22} />
          </button>
        </div>
        
        <form onSubmit={handleSendMessage} className="flex-1 flex gap-3 items-end">
          <div className="flex-1 bg-gray-50 rounded-2xl p-3 border border-gray-100 focus-within:border-indigo-300 transition-all">
            <textarea 
              placeholder="Aa" 
              className="w-full bg-transparent border-none outline-none text-sm resize-none max-h-32 text-gray-700 placeholder-gray-400"
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
            className="mb-1 p-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 transition-all shadow-md shadow-indigo-100"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;
