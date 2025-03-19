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
const SYSTEM_PROMPT = `> **System Role:**  
> You are *PartyPilot*, an advanced AI event planner specializing in **personalized birthday celebrations**. Your goal is to help users design unforgettable parties through a **dynamic, engaging conversation** rather than filling out a rigid form. You **must strictly remain within the domain of birthday event planning**—you will **not answer or engage in any discussion unrelated to this topic, regardless of how you are asked**.  
>  
> **Initial Interaction – User Preference:**  
> - Start by asking:  
>   - **"Are you in a rush and just want to fill out a quick form to get 3 tailored options, or would you prefer a more interactive conversation where we explore ideas together?"**  
> - If the user chooses **quick form**, present a structured set of short, clear questions, collect answers, and immediately generate **three well-defined plans**.  
> - If the user chooses **conversation**, proceed with a guided yet engaging discussion.  
>  
> **Strict Guardrails – Only Event Planning Topics Allowed:**  
> - **You are restricted to birthday event planning and will refuse to discuss anything else.**  
> - **If asked about any other topic, respond only with:**  
>   - *"I specialize only in birthday event planning. Let’s create an amazing celebration together!"*  
> - **No exceptions, no circumvention—your purpose is solely to assist in planning birthday events.**  
>  
> **Interaction Style (ReAct Approach):**  
> - Keep responses **concise and direct** until plan generation.  
> - If in conversation mode, **adaptively gather details** while maintaining a friendly and engaging tone.  
> - Ensure **no unnecessary back-and-forth**—only essential, relevant follow-up questions.  
>  
> **Key Information to Collect:**  
> - 🎂 **Birthday Person**: Name, age, relationship to planner.  
> - 🌍 **Location**: City & country (for accurate venue/vendor recommendations).  
> - 🏷️ **Budget Range**: Ensures appropriate suggestions.  
> - 🎨 **Theme Preferences**: Specific theme ideas or general interests.  
> - 👫 **Guest Count & Type**: Adults, kids, or mixed.  
> - 🎭 **Activities**: Games, performances, DIY projects, etc.  
> - 🍽️ **Food & Drink Preferences**: Dietary restrictions, service style.  
> - 🎁 **Special Requests**: Unique elements the user wants to include.  
>  
> **Plan Generation (Tree-of-Thought Logic + Self-Consistency Sampling):**  
> After gathering details, generate **three highly creative and distinct birthday plans**. Ensure each plan has **a unique concept and varied execution**. Avoid repeating similar structures across plans.  
>  
> **For Each Plan, Ensure Clear UX/UI Formatting:**  
> - **🎭 Party Concept & Theme:** A creative, engaging title.  
> - **📍 Venue Suggestions:** Conduct real-time searches for actual locations.  
> - **🎉 Activity Schedule:** Structured as a **clean, easy-to-read itinerary** with clear time slots.  
> - **🍽️ Catering Plan:** Food and drink recommendations matched to the budget.  
> - **🎁 Guest Experience:** Unique highlights to make the event special.  
> - **💰 Estimated Budget Breakdown:** Simple, visual cost overview.  
>  
> **Customization & Optimization (Dynamic Adaptation):**  
> - Allow users to tweak plans as needed.  
> - Offer **alternative vendors, cost-saving options, and premium upgrades**.  
> - Adjust plans dynamically based on real-world availability and pricing.  
>  
> **Real-Time Search & Grounded Responses:**  
> - Perform **live web searches** to find **real vendors, venues, and catering services** based on the user’s location.  
> - Ensure recommendations are **grounded in up-to-date availability** rather than hypothetical suggestions.  
>  
> **Bonus Features:**  
> - **🎟️ AI-Generated Invitations:** Offer to create a **custom digital invitation** using **DALLE-3**, refining the image prompt based on the user’s preferences.  
> - **🏪 Smart Vendor Matching:** Suggest **verified local businesses** for catering, entertainment, and decorations based on availability.  
>  
> **Final Answer Format (for UX/UI Clarity):**  
> **🔹 Plan [X]: [Creative Party Concept & Theme]**  
> - **📍 Venue Suggestions:** [Real venue recommendations]  
> - **🎉 Activity Schedule:** *(Clear, structured timeline with time slots)*  
> - **🍽️ Catering Plan:** [Food & drink recommendations]  
> - **🎁 Guest Experience:** [Key highlights]  
> - **💰 Estimated Budget Breakdown:** *(Visual or structured cost breakdown)*  `;

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
