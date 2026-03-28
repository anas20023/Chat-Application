import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Search, Users, Loader2 } from 'lucide-react';
import useChatStore from '../../store/useChatStore';
import socketService from '../../services/socket.service';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const GroupCreateModal = ({ isOpen, onClose, currentUser }) => {
  const { theme } = useChatStore();
  const [groupName, setGroupName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.trim()) {
        setIsLoading(true);
        try {
          const response = await axios.get(`${BACKEND_URL}/api/users/search?query=${searchTerm}`);
          setSearchResults(response.data.filter(u => u._id !== currentUser._id));
        } catch (error) {
          console.error("Search error:", error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, currentUser._id]);

  const toggleUser = (user) => {
    if (selectedUsers.find(u => u._id === user._id)) {
      setSelectedUsers(selectedUsers.filter(u => u._id !== user._id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleCreate = () => {
    if (!groupName.trim() || selectedUsers.length === 0) return;

    socketService.emit('create_group', {
      name: groupName,
      participants: selectedUsers.map(u => u._id),
      description: `Group created by ${currentUser.username}`,
    });

    onClose();
    setGroupName('');
    setSelectedUsers([]);
    setSearchTerm('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`w-full max-w-md rounded-3xl shadow-2xl overflow-hidden transition-colors ${
        theme === 'dark' ? 'bg-[#1a1c22] border border-gray-800' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`p-6 flex items-center justify-between border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-100'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
              <Users size={20} />
            </div>
            <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Create New Group</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className={`text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Group Name</label>
            <input 
              type="text" 
              placeholder="e.g. Design Team"
              className={`w-full p-3 rounded-xl border-none outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all ${
                theme === 'dark' ? 'bg-[#252830] text-gray-200' : 'bg-gray-50 text-gray-900'
              }`}
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className={`text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Add Members</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input 
                type="text" 
                placeholder="Search users..."
                className={`w-full py-2 pl-10 pr-4 rounded-lg border-none outline-none text-sm ${
                  theme === 'dark' ? 'bg-[#252830] text-gray-200' : 'bg-gray-50 text-gray-900'
                }`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Search Results */}
          <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1">
            {isLoading ? (
              <div className="flex justify-center p-4"><Loader2 className="animate-spin text-indigo-500" /></div>
            ) : searchResults.map(user => (
              <div 
                key={user._id}
                onClick={() => toggleUser(user)}
                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                  selectedUsers.find(u => u._id === user._id) 
                    ? 'bg-indigo-600 text-white' 
                    : (theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-50')
                }`}
              >
                <div className="flex items-center gap-3">
                  <img src={user.photoURL} alt={user.username} className="w-8 h-8 rounded-full" />
                  <span className="text-sm font-medium">{user.username}</span>
                </div>
                {selectedUsers.find(u => u._id === user._id) && <X size={14} />}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="pt-4 flex gap-3">
            <button 
              onClick={onClose}
              className={`flex-1 py-3 font-bold rounded-xl transition-colors ${
                theme === 'dark' ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Cancel
            </button>
            <button 
              onClick={handleCreate}
              disabled={!groupName.trim() || selectedUsers.length === 0}
              className="flex-3 py-3 px-8 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:bg-gray-300 disabled:text-gray-500 transition-all shadow-lg shadow-indigo-500/20"
            >
              Create Group
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupCreateModal;
