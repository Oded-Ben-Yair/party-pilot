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

// API endpoint for generating invitations with DALL-E
app.post('/api/generate-invitation', async (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      console.log('Warning: Using OpenAI API without proper key configuration');
      return res.status(500).json({ 
        error: 'OpenAI API key is not configured',
        response: 'Sorry, I encountered a problem. The AI service is not properly configured.' 
      });
    }
    
    console.log('Generating invitation with', messages.length, 'messages for context');
    
    // Extract information from the conversation
    let name = "Special Person";
    let age = ""; 
    let theme = "birthday";
    
    // Try to extract details from conversation
    for (const msg of messages) {
      const content = msg.content.toLowerCase();
      
      // Extract name
      const nameMatch = content.match(/name is (\w+)/) || 
                         content.match(/for (\w+)'s birthday/) ||
                         content.match(/(\w+) is turning/);
      if (nameMatch) name = nameMatch[1];
      
      // Extract age
      const ageMatch = content.match(/turning (\d+)/) || 
                       content.match(/age (\d+)/) ||
                       content.match(/(\d+)(st|nd|rd|th) birthday/);
      if (ageMatch) age = ageMatch[1];
      
      // Extract theme
      if (content.includes("theme")) {
        const themeKeywords = ["travel", "nature", "adventure", "princess", "superhero", 
                              "gaming", "music", "art", "sports", "vintage", "elegant"];
        for (const keyword of themeKeywords) {
          if (content.includes(keyword)) {
            theme = keyword;
            break;
          }
        }
      }
    }
    
    // First, generate the invitation text
    const invitationPrompt = `
      Based on our conversation, create a beautiful birthday invitation text for ${name}'s ${age ? age + "th " : ""}birthday.
      The theme is related to ${theme}.
      Make it warm, inviting, and concise (about 3-4 lines max).
      Include placeholders like [DATE], [TIME], and [LOCATION] for the event details.
    `;
    
    const textResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are an expert invitation writer." },
        { role: "user", content: invitationPrompt }
      ],
      max_tokens: 200,
      temperature: 0.7
    });
    
    const invitationText = textResponse.choices[0].message.content.trim();
    
    // Now, create DALL-E prompt based on the theme and details
    let dallePrompt = `Create a beautiful digital birthday invitation for ${name}'s ${age ? age + "th " : ""}birthday with a ${theme} theme. `;
    
    if (theme === "travel" || theme === "adventure") {
      dallePrompt += "Include vintage maps, compass, and travel elements with warm earthy tones. No text.";
    } else if (theme === "nature") {
      dallePrompt += "Include natural elements like trees, flowers, and outdoor scenery with soft green and blue tones. No text.";
    } else {
      dallePrompt += "The design should be festive and celebratory with balloons, confetti, and decorative elements. No text.";
    }
    
    console.log('Generating DALL-E image with prompt:', dallePrompt);
    
    // Generate image with DALL-E
    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: dallePrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard"
    });
    
    console.log('Image generated successfully');
    
    res.json({
      invitationText,
      imageUrl: imageResponse.data[0].url,
      dallePrompt
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