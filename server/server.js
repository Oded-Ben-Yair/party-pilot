const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
require('dotenv').config();

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key'
});

// The party planning system prompt
const SYSTEM_PROMPT = `You are PartyPilot, an expert event planner AI specializing in birthday celebrations. Your goal is to help users create unforgettable birthday experiences through natural conversation.

APPROACH:
- Be warm, friendly, and enthusiastic about planning a special celebration
- Have a natural conversation, not a form-filling experience
- Gather essential information organically through conversation
- When you have enough information, create 3 unique birthday plans
- Be helpful with specific venue suggestions, activities, and catering ideas based on the information provided

INFORMATION TO GATHER (conversationally):
- Birthday person's name, age, and relationship to the planner
- Location and venue preferences (indoor/outdoor, at home/venue)
- Guest count and demographic (adults, children, or mixed)
- Theme interests or preferences
- Budget range
- Food and drink preferences
- Special requirements or unique elements they want to include

PLAN GENERATION:
When you have enough information, generate 3 distinct birthday plans with clear headers:

PLAN 1: [THEME NAME] - [BRIEF DESCRIPTION]
- Venue: Suggest specific venue types appropriate for their city/location
- Activities: 3-5 themed activities with brief descriptions
- Catering: Food and drink suggestions that match the theme
- Guest Experience: How to make guests feel special
- Estimated Budget: Rough cost breakdown for major elements

[REPEAT FORMAT FOR PLANS 2 & 3, MAKING EACH DISTINCTLY DIFFERENT]

If the user asks about invitations, offer to design a digital invitation and get details about the style they prefer.`;

// API endpoint for chatting with OpenAI
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      console.log('Warning: Using OpenAI API without proper key configuration');
      return res.status(500).json({ 
        error: 'OpenAI API key is not configured',
        response: 'Sorry, I encountered a problem. The AI service is not properly configured.' 
      });
    }
    
    console.log('Sending request to OpenAI with', messages.length, 'messages');
    
    // Format messages for OpenAI
    const formattedMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages
    ];
    
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: formattedMessages,
      max_tokens: 2000,
      temperature: 0.7
    });
    
    res.json({ response: response.choices[0].message.content });
    
  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({ 
      error: 'Failed to get a response',
      response: 'Sorry, I encountered a problem. Please try again.' 
    });
  }
});

// API endpoint for generating invitations with OpenAI/DALL-E
app.post('/api/generate-invitation', async (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      return res.status(500).json({ 
        error: 'OpenAI API key is not configured',
        response: 'Sorry, I encountered a problem. The AI service is not properly configured.'
      });
    }
    
    // First, use OpenAI to generate invitation text and DALL-E prompt
    const invitationPrompt = "Based on our conversation about the birthday party, create: 1) Invitation text with placeholders for date, time, and RSVP info, and 2) A detailed prompt for DALL-E to generate a beautiful invitation background image that matches the theme. Be visually descriptive in the DALL-E prompt.";
    
    const formattedMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
      { role: "user", content: invitationPrompt }
    ];
    
    const textResponse = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: formattedMessages,
      max_tokens: 1000,
      temperature: 0.7
    });
    
    const responseText = textResponse.choices[0].message.content;
    
    // Extract invitation text and DALL-E prompt
    let invitationText = "Join us for a special celebration!";
    let dallePrompt = "A festive birthday invitation background with decorations";
    
    if (responseText.includes("Invitation Text:")) {
      invitationText = responseText
        .split("Invitation Text:")[1]
        .split("DALL-E Prompt:")[0]
        .trim();
    }
    
    if (responseText.includes("DALL-E Prompt:")) {
      dallePrompt = responseText
        .split("DALL-E Prompt:")[1]
        .trim();
    }
    
    // Generate image with DALL-E
    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: dallePrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard"
    });
    
    res.json({
      invitationText,
      imageUrl: imageResponse.data[0].url
    });
    
  } catch (error) {
    console.error('Invitation generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate invitation',
      response: 'Sorry, I encountered a problem generating your invitation.'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'online' });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});