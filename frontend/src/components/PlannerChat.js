import React, { useState, useEffect, useRef } from 'react';
import './PlannerChat.css';

function PlannerChat() {
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      type: 'bot', 
      text: 'Hello! 👋 I\'m your AI Party Planner. I\'ll help you create an amazing celebration! What type of event are you planning?' 
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    // Add user message to chat
    addMessage(input, 'user');
    setInput('');
    
    // Get AI response
    await getAIResponse(input);
  };

  const addMessage = (text, type = 'bot') => {
    setMessages(prev => [...prev, { 
      id: Date.now(), 
      type, 
      text 
    }]);
  };

  const getAIResponse = async (userInput) => {
    setLoading(true);
    
    try {
      // Create conversation history for context
      const conversation = messages.map(msg => ({
        role: msg.type === 'bot' ? 'assistant' : 'user',
        content: msg.text
      }));
      
      // Add the new user input
      conversation.push({
        role: 'user',
        content: userInput
      });
      
      // Check for special keywords
      const input = userInput.toLowerCase();
      
      let endpoint = '/api/chat';
      if (input.includes('invitation') || input.includes('invite')) {
        endpoint = '/api/generate-invitation';
      }
      
      // Send request to backend
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messages: conversation })
      });
      
      if (!response.ok) {
        throw new Error('Failed to get response');
      }
      
      const data = await response.json();
      
      // Handle different response types
      if (endpoint === '/api/generate-invitation' && data.imageUrl) {
        addMessage('Here\'s your invitation design:');
        addMessage(`<img src="${data.imageUrl}" alt="Invitation" /><br>${data.invitationText}`);
      } else {
        addMessage(data.response || data.text || 'I\'m thinking about how to help with your party!');
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      addMessage('Sorry, I encountered a problem. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="planner-chat">
      <div className="chat-container">
        <div className="chat-messages">
          {messages.map(message => (
            <div 
              key={message.id} 
              className={`chat-message ${message.type}`}
              dangerouslySetInnerHTML={{ __html: message.text }}
            />
          ))}
          {loading && (
            <div className="chat-message bot typing">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <form onSubmit={handleSubmit} className="chat-input-form">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={loading}
          />
          <button type="submit" disabled={loading}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export default PlannerChat;