import React from 'react';
import { format } from 'date-fns';
import { Check, CheckCheck } from 'lucide-react';

const MessageBubble = ({ message, isMe }) => {
  return (
    <div className={`flex flex-col mb-4 ${isMe ? 'items-end' : 'items-start'}`}>
      <div className={`max-w-[70%] px-4 py-2 rounded-2xl shadow-sm relative group ${
        isMe 
          ? 'bg-indigo-600 text-white rounded-tr-none' 
          : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
      }`}>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.message}</p>
        
        <div className={`flex items-center mt-1 gap-1 text-[10px] ${
          isMe ? 'text-indigo-100 justify-end' : 'text-gray-400'
        }`}>
          <span>{format(new Date(message.createdAt), 'HH:mm')}</span>
          {isMe && (
            <span>
              {message.status === 'seen' ? (
                <CheckCheck size={12} className="text-cyan-300" />
              ) : message.status === 'delivered' ? (
                <CheckCheck size={12} />
              ) : (
                <Check size={12} />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
