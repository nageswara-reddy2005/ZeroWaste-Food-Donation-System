import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './ChatsList.css';
import ChatWindow from './ChatWindow';

const ChatsList = () => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedChat, setSelectedChat] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const socketRef = useRef(null);

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    // Only fetch chats and initialize socket if we have a current user
    if (currentUser) {
      fetchChats();
      initializeSocket();
    }
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [currentUser]); // Re-run when currentUser changes

  useEffect(() => {
    if (searchQuery) {
      const filtered = chats.filter(chat => 
        chat.participants.some(p => 
          p.name.toLowerCase().includes(searchQuery.toLowerCase())
        ) ||
        (chat.lastMessage && chat.lastMessage.content.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      // You could set a filtered state here if needed
    }
  }, [searchQuery, chats]);

  const getCurrentUser = () => {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    console.log('Getting current user - userStr:', userStr, 'token:', !!token);
    
    if (userStr && token) {
      try {
        const user = JSON.parse(userStr);
        console.log('Parsed user:', user);
        if (user && user.id) {
          setCurrentUser(user);
          setError(''); // Clear any previous errors
        } else {
          console.error('Invalid user data structure:', user);
          setError('Invalid user session. Please log in again.');
          setCurrentUser(null);
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        setError('Invalid user session. Please log in again.');
        setCurrentUser(null);
      }
    } else {
      console.log('No user data or token found');
      setError('Please log in to view chats');
      setCurrentUser(null);
    }
  };

  const initializeSocket = () => {
    const token = localStorage.getItem('token');
    if (!token || !currentUser) {
      console.log('Cannot initialize socket - missing token or currentUser');
      return;
    }

    console.log('Initializing socket for user:', currentUser.name);
    
    // Disconnect existing socket if any
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    socketRef.current = io('http://localhost:5000', {
      auth: { token }
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to chat server');
      setIsConnected(true);
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from chat server');
      setIsConnected(false);
    });

    socketRef.current.on('new_message', (data) => {
      console.log('Received new message in chats list:', data);
      // Update the chat list with new message
      setChats(prevChats => 
        prevChats.map(chat => {
          if (chat.chatId === data.chatId) {
            return {
              ...chat,
              lastMessage: {
                content: data.message.content,
                sender: data.message.sender,
                timestamp: data.message.timestamp
              },
              lastActivity: data.message.timestamp,
              unreadCount: chat.unreadCount + 1
            };
          }
          return chat;
        })
      );
    });

    socketRef.current.on('messages_read', (data) => {
      // Update read status
      setChats(prevChats => 
        prevChats.map(chat => {
          if (chat.chatId === data.chatId) {
            return { ...chat, unreadCount: 0 };
          }
          return chat;
        })
      );
    });
  };

  const fetchChats = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token || !currentUser) {
        const errorMsg = !token ? 'Please log in to view chats' : 'User session invalid';
        setError(errorMsg);
        setChats([]);
        if (showLoading) setLoading(false);
        return;
      }

      console.log('Fetching chats for user:', currentUser.name, 'ID:', currentUser.id);
      const response = await fetch('http://localhost:5000/api/chats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Chats API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched chats data:', data);
        
        if (data && Array.isArray(data.chats)) {
          setChats(data.chats);
          setError('');
          console.log('Successfully loaded', data.chats.length, 'chats');
        } else {
          console.warn('Invalid chats data structure:', data);
          setChats([]);
          setError('Invalid chat data received');
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Chats API error:', response.status, errorData);
        throw new Error(errorData.error || `Failed to fetch chats (${response.status})`);
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
      setError(`Failed to load chats: ${error.message}`);
      setChats([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const refreshChats = () => {
    fetchChats(false); // Refresh without showing loading spinner
  };

  const openChat = (chat) => {
    console.log('Opening chat:', chat);
    console.log('Current user:', currentUser);
    
    if (!chat || !chat.donation) {
      console.error('Invalid chat data:', chat);
      setError('Invalid chat data');
      return;
    }
    
    // Structure the donation data properly for ChatWindow
    const donationData = {
      id: chat.donation.id,
      quantity: chat.donation.quantity,
      foodType: chat.donation.foodType,
      foodCategory: chat.donation.foodCategory || 'perishable', // Default fallback
      imagePath: chat.donation.imagePath,
      userId: chat.donation.userId,
      status: chat.donation.status
    };
    
    console.log('Structured donation data for ChatWindow:', donationData);
    
    // Validate required fields
    if (!donationData.id) {
      console.error('Missing donation ID in chat data');
      setError('Invalid donation data');
      return;
    }
    
    setSelectedChat(donationData);
    console.log('Selected chat set successfully');
  };

  const closeChat = () => {
    console.log('Closing chat window');
    setSelectedChat(null);
    // Refresh chats to update unread counts and get latest data
    if (currentUser) {
      refreshChats();
    }
  };

  const getOtherParticipant = (participants) => {
    return participants.find(p => p._id !== currentUser?.id);
  };

  const formatLastActivity = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    const diffInDays = (now - date) / (1000 * 60 * 60 * 24);

    if (diffInHours < 1) {
      const minutes = Math.floor((now - date) / (1000 * 60));
      return minutes < 1 ? 'now' : `${minutes}m`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h`;
    } else if (diffInDays < 7) {
      return `${Math.floor(diffInDays)}d`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const filteredChats = chats.filter(chat => 
    !searchQuery || 
    chat.participants.some(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) ||
    (chat.lastMessage && chat.lastMessage.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  


  if (loading) {
    return (
      <div className="chats-list">
        <div className="chats-header">
          <h2>💬 Chats</h2>
        </div>
        <div className="chats-loading">
          <div className="loading-spinner"></div>
          <p>Loading your conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chats-list">
      {/* Header */}
      <div className="chats-header">
        <div className="header-content">
          <h2>💬 Chats</h2>
          <div className="header-actions">
            <button 
              className="refresh-btn"
              onClick={refreshChats}
              title="Refresh chats"
            >
              🔄
            </button>
            <div className="connection-indicator">
              {isConnected ? (
                <span className="status-connected">🟢 Online</span>
              ) : (
                <span className="status-disconnected">🔴 Offline</span>
              )}
            </div>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="search-container">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button 
                className="clear-search"
                onClick={() => setSearchQuery('')}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">❌</span>
          {error}
          <button className="retry-btn" onClick={fetchChats}>
            🔄 Retry
          </button>
        </div>
      )}

      {/* Chats List */}
      <div className="chats-container">
        {filteredChats.length === 0 ? (
          <div className="no-chats">
            <div className="no-chats-icon">💬</div>
            <h3>No conversations yet</h3>
            <p>
              {searchQuery 
                ? 'No chats match your search.' 
                : 'Start chatting by contacting donors from the "Find Food" section.'
              }
            </p>
            {searchQuery && (
              <button 
                className="clear-search-btn"
                onClick={() => setSearchQuery('')}
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="chats-grid">
            {filteredChats.map((chat) => {
              const otherParticipant = getOtherParticipant(chat.participants);
              const isUnread = chat.unreadCount > 0;
              
              return (
                <div 
                  key={chat.chatId} 
                  className={`chat-item ${isUnread ? 'unread' : ''}`}
                  onClick={() => openChat(chat)}
                >
                  {/* Avatar */}
                  <div className="chat-avatar">
                    {chat.donation.imagePath ? (
                      <img 
                        src={`http://localhost:5000${chat.donation.imagePath}`} 
                        alt="Food"
                        className="food-image"
                      />
                    ) : (
                      <div className="food-placeholder">
                        {chat.donation.foodType === 'veg' ? '🥬' : '🍖'}
                      </div>
                    )}
                    {isUnread && <div className="unread-indicator"></div>}
                  </div>

                  {/* Chat Info */}
                  <div className="chat-info">
                    <div className="chat-header-row">
                      <h3 className="participant-name">
                        {otherParticipant?.name || 'Unknown User'}
                      </h3>
                      <span className="last-activity">
                        {formatLastActivity(chat.lastActivity)}
                      </span>
                    </div>
                    
                    <div className="donation-info">
                      <span className="food-type">
                        {chat.donation.foodType === 'veg' ? '🥬 Veg' : '🍖 Non-Veg'} • 
                        Qty: {chat.donation.quantity}
                      </span>
                      <span className={`donation-status status-${chat.donation.status}`}>
                        {chat.donation.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>

                    <div className="last-message-row">
                      {chat.lastMessage ? (
                        <p className="last-message">
                          <span className="message-sender">
                            {chat.lastMessage.sender._id === currentUser?.id ? 'You: ' : ''}
                          </span>
                          {chat.lastMessage.content}
                        </p>
                      ) : (
                        <p className="no-messages">No messages yet</p>
                      )}
                      
                      {isUnread && (
                        <div className="unread-count">
                          {chat.unreadCount}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Chat Window */}
      {selectedChat && (
        <ChatWindow
          donation={selectedChat}
          onClose={closeChat}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};

export default ChatsList;
