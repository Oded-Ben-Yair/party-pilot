import React, { useState, useEffect, useRef } from 'react';
import './PlannerChat.css';

function PlannerChat() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: 'Hello! 👋 I\'m your AI Party Planner. I\'ll help you create an amazing celebration! Are you in a rush and just want to fill out a quick form to get 3 tailored options, or would you prefer a more interactive conversation where we explore ideas together?'
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

  const shouldGenerateInvitation = (text) => {
    const keywords = ['invitation', 'invite', 'i wish to receive the invitation', 'generate invitation', 'create invitation'];
    text = text.toLowerCase();
    return keywords.some(keyword => text.includes(keyword));
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

      // Check if this is an invitation request
      const generateInvite = shouldGenerateInvitation(userInput);

      let endpoint = generateInvite ? '/api/generate-invitation' : '/api/chat';
      console.log(`Sending request to ${endpoint}`, generateInvite ? 'Generating invitation' : 'Regular chat');

      // Send request to backend
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messages: conversation })
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Response data:', data);

      if (generateInvite && data.imageUrl) {
        // Handle invitation response
        addMessage('Here\'s the digital invitation I\'ve created based on our conversation:');

        // Create a message with the image
        const imageMessage = `<div class="invitation-container">
          <img src="${data.imageUrl}" alt="Birthday Invitation" class="invitation-image"/>
          <div class="invitation-text">${data.invitationText || 'Join us for a special celebration!'}</div>
        </div>`;

        addMessage(imageMessage);
        addMessage('How does this invitation look? Would you like me to make any changes?');
      } else if (data.response) {
        // Regular chat response
        addMessage(data.response);
      } else {
        // Try to handle plans if they exist
        try {
          if (data && data.plans) {
            let planDisplay = '';
            data.plans.forEach(plan => {
              planDisplay += `
                <div class="plan-container">
                  <h3>${plan.concept} (${plan.theme})</h3>
                  <p><strong>Venue:</strong> ${plan.venue}</p>
                  <h4>Activity Schedule:</h4>
                  <ul>
                    ${plan.activities.map(activity => `<li>${activity.time}: ${activity.activity}</li>`).join('')}
                  </ul>
                  <p><strong>Catering:</strong> ${plan.catering}</p>
                  <p><strong>Guest Experience:</strong> ${plan.guestExperience}</p>
                  <p><strong>Budget:</strong> ${plan.budget}</p>
                </div>
              `;
            });
            addMessage(planDisplay);
          } else {
            // If we have any content at all, try to display it
            addMessage(JSON.stringify(data));
          }
        } catch (e) {
          console.error('Error displaying plan data:', e);
          addMessage('I\'m thinking about how to help with your party!');
        }
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
