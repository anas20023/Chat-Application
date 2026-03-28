import React from 'react';
import { format } from 'date-fns';
import { Check, CheckCheck, Play, Pause, Volume2 } from 'lucide-react';
import useChatStore from '../../store/useChatStore';

const MessageBubble = ({ message, isMe }) => {
  const { theme } = useChatStore();

  const renderContent = () => {
    switch (message.messageType) {
      case 'image':
        return (
          <div className="mt-1 mb-1 max-w-full overflow-hidden rounded-xl">
            <img 
              src={message.attachments[0]} 
              alt="Sent image" 
              className="max-h-80 w-auto object-contain hover:scale-[1.02] transition-transform cursor-pointer"
            />
            {message.message && <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">{message.message}</p>}
          </div>
        );
      case 'voice':
        return (
          <div className={`flex items-center gap-3 p-2 rounded-xl min-w-[200px] ${
            isMe ? 'bg-indigo-500/50' : (theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50')
          }`}>
            <div className={`p-2 rounded-full ${isMe ? 'bg-white text-indigo-600' : 'bg-indigo-600 text-white'}`}>
              <Play size={16} fill="currentColor" />
            </div>
            <div className="flex-1 h-1.5 bg-gray-400/30 rounded-full relative overflow-hidden">
              <div className={`absolute left-0 top-0 h-full w-1/3 ${isMe ? 'bg-white' : 'bg-indigo-600'}`}></div>
            </div>
            <span className={`text-[10px] font-mono ${isMe ? 'text-indigo-100' : 'text-gray-500'}`}>0:12</span>
          </div>
        );
      default:
        return <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.message}</p>;
    }
  };

  return (
    <div className={`flex flex-col mb-4 ${isMe ? 'items-end' : 'items-start animate-in slide-in-from-left-2 duration-300'}`}>
      {!isMe && (
        <span className={`text-[10px] font-semibold mb-1 ml-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
          {message.senderId.username}
        </span>
      )}
      <div className={`max-w-[80%] md:max-w-[70%] px-4 py-2 rounded-2xl shadow-sm relative group transition-colors ${
        isMe 
          ? 'bg-indigo-600 text-white rounded-tr-none' 
          : (theme === 'dark' 
              ? 'bg-[#252830] text-gray-200 rounded-tl-none border border-gray-800' 
              : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
            )
      }`}>
        {renderContent()}
        
        <div className={`flex items-center mt-1 gap-1 text-[10px] ${
          isMe ? 'text-indigo-100 justify-end' : (theme === 'dark' ? 'text-gray-500' : 'text-gray-400')
        }`}>
          <span>{format(new Date(message.createdAt), 'HH:mm')}</span>
          {isMe && (
            <span className="flex items-center">
              {message.status === 'seen' ? (
                <CheckCheck size={12} className={theme === 'dark' ? 'text-indigo-400' : 'text-cyan-300'} />
              ) : (
                <Check size={12} className="opacity-70" />
              )}
            </span>
          )}
        </div>
      </div>
      {isMe && message.status === 'seen' && (
        <span className={`text-[9px] mt-1 font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-gray-700' : 'text-gray-300'}`}>
          Seen
        </span>
      )}
    </div>
  );
};

export default MessageBubble;
