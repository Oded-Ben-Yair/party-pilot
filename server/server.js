const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');
require('dotenv').config();

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// Initialize AI clients
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// The party planning system prompt - this is where the intelligence happens
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

// API endpoint for chatting with Anthropic
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'Anthropic API key is not configured' });
    }
    
    const response = await anthropic.messages.create({
      model: "claude-3-opus-20240229",
      system: SYSTEM_PROMPT,
      messages: messages,
      max_tokens: 2000,
      temperature: 0.7
    });
    
    res.json({ response: response.content[0].text });
    
  } catch (error) {
    console.error('Anthropic API error:', error);
    res.status(500).json({ error: 'Failed to get a response' });
  }
});

// API endpoint for generating invitations with OpenAI/DALL-E
app.post('/api/generate-invitation', async (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!process.env.ANTHROPIC_API_KEY || !process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'API keys are not configured' });
    }
    
    // First, use Anthropic to generate invitation text and DALL-E prompt
    const invitationPrompt = "Based on our conversation about the birthday party, create: 1) Invitation text with placeholders for date, time, and RSVP info, and 2) A detailed prompt for DALL-E to generate a beautiful invitation background image that matches the theme. Be visually descriptive in the DALL-E prompt.";
    
    const anthropicResponse = await anthropic.messages.create({
      model: "claude-3-opus-20240229",
      messages: [
        ...messages,
        { role: "user", content: invitationPrompt }
      ],
      max_tokens: 1000,
      temperature: 0.7
    });
    
    const responseText = anthropicResponse.content[0].text;
    
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
    res.status(500).json({ error: 'Failed to generate invitation' });
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