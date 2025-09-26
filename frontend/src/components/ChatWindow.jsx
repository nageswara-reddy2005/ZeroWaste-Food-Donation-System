import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './ChatWindow.css';

const ChatWindow = ({ donation, onClose, currentUser }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatId, setChatId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [otherParticipant, setOtherParticipant] = useState(null);
  const [error, setError] = useState('');
  
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    console.log('ChatWindow: Initializing chat for donation:', donation.id);
    
    // Reset state when switching chats
    setMessages([]);
    setIsLoading(true);
    setError('');
    setChatId(null);
    setOtherParticipant(null);
    
    initializeChat();
    
    return () => {
      console.log('ChatWindow: Cleaning up chat for donation:', donation.id);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [donation.id, currentUser.id]); // Also depend on currentUser.id

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeChat = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Authentication required');
        return;
      }

      // Initialize Socket.IO connection
      socketRef.current = io('http://localhost:5000', {
        auth: { token }
      });

      socketRef.current.on('connect', () => {
        console.log('Connected to chat server');
        setIsConnected(true);
        createOrJoinChat();
      });

      socketRef.current.on('disconnect', () => {
        console.log('Disconnected from chat server');
        setIsConnected(false);
      });

      socketRef.current.on('chat_history', (data) => {
        console.log('Received chat history:', data);
        setChatId(data.chatId);
        
        // Ensure messages have proper structure
        const formattedMessages = (data.messages || []).map(msg => ({
          ...msg,
          _id: msg._id || `${msg.timestamp}-${msg.sender}`,
          sender: typeof msg.sender === 'string' ? { _id: msg.sender, name: 'Unknown' } : msg.sender,
          timestamp: msg.timestamp || new Date().toISOString()
        }));
        
        setMessages(formattedMessages);
        
        // Find the other participant
        const otherUser = data.participants.find(p => p._id !== currentUser.id);
        setOtherParticipant(otherUser);
        setIsLoading(false);
      });

      socketRef.current.on('new_message', (data) => {
        console.log('Received new message:', data);
        console.log('Current chatId:', chatId);
        console.log('Current donation.id:', donation.id);
        
        // Always add the message if it's for this donation or if chatId matches
        if (data.message) {
          // Format the message to ensure proper structure
          const formattedMessage = {
            ...data.message,
            _id: data.message._id || `${data.message.timestamp || Date.now()}-${data.message.sender}`,
            sender: typeof data.message.sender === 'string' ? 
              { _id: data.message.sender, name: 'Unknown' } : 
              data.message.sender,
            timestamp: data.message.timestamp || new Date().toISOString()
          };
          
          console.log('Formatted message:', formattedMessage);
          
          setMessages(prev => {
            console.log('Previous messages count:', prev.length);
            console.log('New message:', formattedMessage.content);
            
            // More robust duplicate detection
            const messageExists = prev.some(msg => {
              // Check by ID first (most reliable)
              if (msg._id && formattedMessage._id && msg._id === formattedMessage._id) {
                return true;
              }
              
              // Check by content, sender, and timestamp (within 5 seconds)
              const sameContent = msg.content === formattedMessage.content;
              const sameSender = (msg.sender?._id || msg.sender) === (formattedMessage.sender?._id || formattedMessage.sender);
              const similarTime = Math.abs(new Date(msg.timestamp) - new Date(formattedMessage.timestamp)) < 5000;
              
              return sameContent && sameSender && similarTime;
            });
            
            if (messageExists) {
              console.log('Duplicate message detected, skipping');
              return prev;
            }
            
            const newMessages = [...prev, formattedMessage];
            console.log('Added new message, total count:', newMessages.length);
            return newMessages;
          });
        }
      });

      socketRef.current.on('chat_error', (data) => {
        console.error('Chat error:', data);
        setError(data.message);
        setIsLoading(false);
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('Connection error:', error);
        setError('Failed to connect to chat server');
        setIsConnected(false);
        setIsLoading(false);
      });

    } catch (error) {
      console.error('Error initializing chat:', error);
      setError('Failed to initialize chat');
      setIsLoading(false);
    }
  };

  const createOrJoinChat = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Create or get chat via REST API
      const response = await fetch('http://localhost:5000/api/chats', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          donationId: donation.id,
          receiverId: currentUser.id
        })
      });

      if (response.ok) {
        const chatData = await response.json();
        setChatId(chatData.chatId);
        
        // Join the chat room via Socket.IO
        socketRef.current.emit('join_chat', {
          donationId: donation.id,
          receiverId: currentUser.id
        });
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create chat');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error creating/joining chat:', error);
      setError('Failed to join chat');
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !chatId || !isConnected) return;

    const messageContent = newMessage.trim();
    setNewMessage('');

    // Create optimistic message for immediate UI update
    const optimisticMessage = {
      _id: `temp_${Date.now()}_${currentUser.id}`,
      content: messageContent,
      sender: {
        _id: currentUser.id,
        name: currentUser.name
      },
      timestamp: new Date().toISOString(),
      isOptimistic: true
    };

    // Add message optimistically to UI
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      // Send only via Socket.IO for real-time delivery
      // The backend Socket.IO handler will handle message persistence
      socketRef.current.emit('send_message', {
        chatId,
        message: messageContent,
        donationId: donation.id
      });

      console.log('Message sent via Socket.IO:', messageContent);

    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg._id !== optimisticMessage._id));
      // Re-add message to input if sending failed
      setNewMessage(messageContent);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleMarkAsDelivered = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/donations/${donation.id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'delivered' })
      });

      if (response.ok) {
        // Send a system message to the chat
        const deliveryMessage = {
          content: '✅ Food has been marked as delivered by the donor!',
          isSystemMessage: true
        };
        
        socketRef.current.emit('send_message', {
          chatId,
          message: deliveryMessage.content,
          donationId: donation.id,
          isSystemMessage: true
        });

        // Update donation status locally
        donation.status = 'delivered';
        
        setError('✅ Donation marked as delivered successfully!');
        setTimeout(() => setError(''), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to mark as delivered');
      }
    } catch (error) {
      console.error('Error marking as delivered:', error);
      setError('Error updating delivery status');
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  if (isLoading) {
    return (
      <div className="chat-window">
        <div className="chat-header">
          <div className="chat-title">
            <h3>Loading Chat...</h3>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="chat-loading">
          <div className="loading-spinner"></div>
          <p>Connecting to chat...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chat-window">
        <div className="chat-header">
          <div className="chat-title">
            <h3>Chat Error</h3>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="chat-error">
          <div className="error-icon">❌</div>
          <p>{error}</p>
          <button className="retry-btn" onClick={initializeChat}>
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      {/* Chat Header */}
      <div className="chat-header">
        <div className="chat-info">
          <div className="donation-info">
            <span className="food-icon">
              {donation.foodType === 'veg' ? '🥬' : '🍖'}
            </span>
            <div className="donation-details">
              <h3>{donation.foodType === 'veg' ? 'Vegetarian' : 'Non-Vegetarian'} Food</h3>
              <p>Quantity: {donation.quantity}</p>
            </div>
          </div>
          {otherParticipant && (
            <div className="participant-info">
              <div className="participant-avatar">
                {otherParticipant.name.charAt(0).toUpperCase()}
              </div>
              <div className="participant-details">
                <span className="participant-name">{otherParticipant.name}</span>
                <span className="connection-status">
                  {isConnected ? '🟢 Online' : '🔴 Offline'}
                </span>
              </div>
            </div>
          )}
        </div>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      {/* Messages Area */}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="no-messages">
            <div className="no-messages-icon">💬</div>
            <p>Start the conversation!</p>
            <span>Send a message to coordinate the food pickup</span>
          </div>
        ) : (
          messages.map((message, index) => {
            // Ensure we have proper sender information
            const senderId = message.sender?._id || message.sender;
            const senderName = message.sender?.name || 'Unknown';
            const isOwnMessage = senderId === currentUser.id;
            const showAvatar = index === 0 || (messages[index - 1]?.sender?._id || messages[index - 1]?.sender) !== senderId;
            
            // Create a unique key combining message ID, timestamp, and index
            const messageKey = message._id || `${message.timestamp}-${index}-${senderId}`;
            
            return (
              <div
                key={messageKey}
                className={`message ${isOwnMessage ? 'own-message' : 'other-message'}`}
              >
                {!isOwnMessage && showAvatar && (
                  <div className="message-avatar">
                    {senderName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="message-content">
                  {!isOwnMessage && showAvatar && (
                    <div className="message-sender">{senderName}</div>
                  )}
                  <div className="message-bubble">
                    <p>{message.content}</p>
                    <span className="message-time">{formatTime(message.timestamp)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Delivery Actions */}
      {currentUser.id === donation.userId && donation.status === 'reserved' && (
        <div className="delivery-actions">
          <button 
            className="delivery-btn"
            onClick={() => handleMarkAsDelivered()}
          >
            ✅ Mark as Delivered
          </button>
        </div>
      )}

      {/* Message Input */}
      <div className="chat-input">
        <div className="input-container">
          <textarea
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            rows="1"
            disabled={!isConnected}
          />
          <button
            className="send-btn"
            onClick={sendMessage}
            disabled={!newMessage.trim() || !isConnected}
          >
            <span className="send-icon">📤</span>
          </button>
        </div>
        <div className="input-status">
          {isConnected ? (
            <span className="status-connected">🟢 Connected</span>
          ) : (
            <span className="status-disconnected">🔴 Disconnected</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
