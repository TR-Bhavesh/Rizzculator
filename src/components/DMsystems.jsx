// src/components/DMSystem.jsx - Real-time direct messaging system
import React, { useState, useRef, useEffect } from 'react';
import { Search, Send, ArrowLeft, MoreVertical, Circle, Clock, Check, CheckCheck, X, UserX } from 'lucide-react';
import { useRealtimeMessages, useConversations } from '../hooks/useRealtimeMessages';
import { useUserStatus } from '../hooks/useUserStatus';

const DMSystem = ({ currentUser, allUsers, onClose }) => {
  const [view, setView] = useState('conversations'); // 'conversations' or 'chat'
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const conversations = useConversations(currentUser?.uid);
  const { messages, loading, sendMessage, markAsRead } = useRealtimeMessages(
    currentUser?.uid,
    selectedUser?.id
  );
  const { isOnline, lastSeen } = useUserStatus(selectedUser?.id);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-focus input
  useEffect(() => {
    if (view === 'chat' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [view]);

  // Mark messages as read when viewing
  useEffect(() => {
    messages.forEach(msg => {
      if (msg.to === currentUser?.uid && !msg.read) {
        markAsRead(msg.id);
      }
    });
  }, [messages, currentUser, markAsRead]);

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;

    try {
      await sendMessage(messageInput);
      setMessageInput('');
    } catch (err) {
      alert('Failed to send message. Try again!');
    }
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setView('chat');
    setShowUserMenu(false);
  };

  const formatTimestamp = (date) => {
    if (!date) return '';
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const filteredUsers = allUsers.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Conversations View
  if (view === 'conversations') {
    return (
      <div className="flex flex-col h-full bg-gradient-to-br from-purple-900/50 via-pink-900/50 to-blue-900/50">
        {/* Header */}
        <div className="bg-black/40 backdrop-blur-xl border-b border-white/10 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-black text-white">Messages</h2>
            <button
              onClick={onClose}
              className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Users */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {searchQuery && filteredUsers.length > 0 ? (
            // Search Results
            filteredUsers.map(user => (
              <UserCard
                key={user.id}
                user={user}
                onClick={() => handleSelectUser(user)}
              />
            ))
          ) : conversations.length > 0 ? (
            // Recent Conversations
            conversations.map(conv => {
              const user = allUsers.find(u => u.id === conv.userId);
              if (!user) return null;
              
              return (
                <ConversationCard
                  key={conv.userId}
                  user={user}
                  lastMessage={conv.lastMessage}
                  timestamp={conv.timestamp}
                  unread={conv.unread}
                  onClick={() => handleSelectUser(user)}
                />
              );
            })
          ) : (
            <div className="text-center py-12 text-gray-400">
              <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-semibold">No conversations yet</p>
              <p className="text-sm mt-2">Search for users to start chatting!</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Chat View
  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-purple-900/50 via-pink-900/50 to-blue-900/50">
      {/* Chat Header */}
      <div className="bg-black/40 backdrop-blur-xl border-b border-white/10 p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setView('conversations');
              setSelectedUser(null);
            }}
            className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white truncate flex items-center gap-2">
              {selectedUser?.username}
              {isOnline && (
                <Circle className="w-2 h-2 fill-green-400 text-green-400" />
              )}
            </h3>
            <p className="text-xs text-gray-400">
              {isOnline ? 'Online' : lastSeen ? `Last seen ${formatTimestamp(lastSeen)}` : 'Offline'}
            </p>
          </div>

          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-all relative"
          >
            <MoreVertical className="w-5 h-5" />
            
            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 bg-black/90 backdrop-blur-xl rounded-xl border border-white/20 overflow-hidden shadow-2xl z-50 min-w-[200px]">
                <button className="w-full text-left px-4 py-3 hover:bg-white/10 transition-all flex items-center gap-2 text-sm text-white">
                  <UserX className="w-4 h-4 text-red-400" />
                  Block User
                </button>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-500 border-t-transparent"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center text-gray-400">
            <div>
              <Send className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-semibold">No messages yet</p>
              <p className="text-sm mt-2">Start the conversation! 👋</p>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.from === currentUser?.uid;
            const showTimestamp = index === 0 || 
              (messages[index - 1] && 
               msg.timestamp - messages[index - 1].timestamp > 300000); // 5 mins

            return (
              <div key={msg.id}>
                {showTimestamp && (
                  <div className="flex justify-center mb-4">
                    <span className="text-xs text-gray-500 bg-black/40 px-3 py-1 rounded-full">
                      {formatTimestamp(msg.timestamp)}
                    </span>
                  </div>
                )}

                <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-2`}>
                  <div
                    className={`
                      max-w-[75%] sm:max-w-[60%] rounded-2xl px-4 py-2 break-words
                      ${isMe
                        ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-br-sm'
                        : 'bg-white/10 backdrop-blur-lg text-white rounded-bl-sm border border-white/20'
                      }
                    `}
                  >
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                    <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-xs opacity-70">
                        {msg.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isMe && (
                        msg.read ? (
                          <CheckCheck className="w-3 h-3 text-blue-300" />
                        ) : (
                          <Check className="w-3 h-3 opacity-70" />
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-black/40 backdrop-blur-xl border-t border-white/10 p-4">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            placeholder="Type a message..."
            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
          <button
            onClick={handleSendMessage}
            disabled={!messageInput.trim()}
            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed p-3 rounded-xl transition-all transform hover:scale-105 active:scale-95"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// User Card Component (for search results)
const UserCard = ({ user, onClick }) => {
  const { isOnline } = useUserStatus(user.id);

  return (
    <div
      onClick={onClick}
      className="bg-white/5 hover:bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/10 cursor-pointer transition-all transform hover:scale-[1.02] active:scale-[0.98]"
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
            {user.username?.charAt(0).toUpperCase()}
          </div>
          {isOnline && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-black"></div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-white truncate">{user.username}</h4>
          <p className="text-sm text-gray-400 truncate">{user.country}</p>
        </div>

        <div className="text-right">
          <div className="text-lg font-bold text-pink-400">
            {user.rizzScore?.toFixed(0) || 0}
          </div>
          <p className="text-xs text-gray-500">{user.rank}</p>
        </div>
      </div>
    </div>
  );
};

// Conversation Card Component
const ConversationCard = ({ user, lastMessage, timestamp, unread, onClick }) => {
  const { isOnline } = useUserStatus(user.id);

  return (
    <div
      onClick={onClick}
      className={`
        bg-white/5 hover:bg-white/10 backdrop-blur-lg rounded-xl p-4 border cursor-pointer transition-all transform hover:scale-[1.02] active:scale-[0.98]
        ${unread ? 'border-pink-500/50 bg-pink-500/10' : 'border-white/10'}
      `}
    >
      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
            {user.username?.charAt(0).toUpperCase()}
          </div>
          {isOnline && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-black"></div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-bold text-white truncate">{user.username}</h4>
            <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
              {timestamp && formatTimestamp(timestamp)}
            </span>
          </div>
          <p className={`text-sm truncate ${unread ? 'text-white font-semibold' : 'text-gray-400'}`}>
            {lastMessage || 'No messages yet'}
          </p>
        </div>

        {unread && (
          <div className="w-2 h-2 bg-pink-500 rounded-full flex-shrink-0"></div>
        )}
      </div>
    </div>
  );
};

const formatTimestamp = (date) => {
  if (!date) return '';
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString();
};

export default DMSystem;