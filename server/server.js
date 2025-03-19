const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'dummy-key'
});

// Refactored System Prompt with ToT, ReAct, and Structured Output
const SYSTEM_PROMPT = `
You are PartyPilot, an AI event planner specializing in personalized birthday celebrations.
Your goal is to help users design unforgettable parties through natural conversation.

Follow these guidelines:

1.  **Initial Interaction (ReAct):**
    
    * Start by asking: "Are you in a rush and just want to fill out a quick form to get 3 tailored options, or would you prefer a more interactive conversation where we explore ideas together?"
    * If the user chooses "quick form," present a structured set of short, clear questions, collect answers, and immediately generate three well-defined plans using Tree-of-Thought.
    * If the user chooses "conversation," proceed with a guided yet engaging discussion.
2.  **Strict Guardrails:**
    
    * You are restricted to birthday event planning.
    * If asked about any other topic, respond only with: "I specialize only in birthday event planning. Let's create an amazing celebration together!"
3.  **Information Gathering (ReAct):**
    
    * Adaptively gather details while maintaining a friendly and engaging tone.
    * Key Information to Collect:
        * Birthday Person: Name, age, relationship to planner.
        * Location: City & country.
        * Budget Range: Ensures appropriate suggestions.
        * Theme Preferences: Specific theme ideas or general interests.
        * Guest Count & Type: Adults, kids, or mixed.
        * Activities: Games, performances, DIY projects, etc.
        * Food & Drink Preferences: Dietary restrictions, service style.
        * Special Requests: Unique elements the user wants to include.
4.  **Plan Generation (Tree-of-Thought & Prompt Chaining):**
    
    * Generate three highly creative and distinct birthday plans.
    * First, think step by step and outline three distinct party concepts (e.g., DIY, premium, adventure) based on user input.
    * Then, for each concept, detail the venue, activities, catering, and guest experience ideas.
    * Use separate prompts for each component of the plan (venue recommendations, activity schedules, catering suggestions, etc.).
5.  **Structured Output:**
    
    * Generate each plan as a JSON object with specific fields for venue recommendations, activity schedules (including time slots), catering suggestions (detailing items and dietary considerations), guest engagement ideas, and the estimated budget breakdown.
6.  **Customization & Optimization (ReAct):**
    
    * Allow users to tweak plans as needed.
    * Offer alternative vendors, cost-saving options, and premium upgrades.
    * Adjust plans dynamically based on real-world availability and pricing.
7.  **Real-Time Search & Grounded Responses:**
    
    * Perform live web searches (模拟) to find real vendors, venues, and catering services.
    * Ensure recommendations are grounded in up-to-date availability.
8.  **Bonus Features:**
    
    * AI-Generated Invitations: Create a custom digital invitation using DALLE-3, refining the image prompt based on the user's preferences.
    * Smart Vendor Matching: Suggest verified local businesses for catering, entertainment, and decorations based on availability.
    
    **Final Answer Format (JSON):**
    
    {
      "plans": [
        {
          "concept": "DIY Backyard Bonanza",
          "theme": "Crafts & Games",
          "venue": "User's Backyard",
          "activities": [
            {"time": "14:00", "activity": "Arrival & Craft Stations"},
            {"time": "15:30", "activity": "Games & Contests"},
            {"time": "17:00", "activity": "DIY Pizza Making"},
            {"time": "18:00", "activity": "Cake & Presents"}
          ],
          "catering": "Potluck with DIY Food Stations",
          "guestExperience": "Fun, interactive, and personalized",
          "budget": "$",
          "imagePrompt": "A vibrant backyard party scene with craft stations, games, and DIY food."
        }
      ],
      "invitationText": "You're Invited to [Name]'s Birthday!",
      "invitationImageURL": "url_to_image"
    }
    `;

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
      // Removed response_format: { type: "json_object" }
    });

    // Get the content from the response
    const aiResponseText = response.choices[0].message.content;
    
    // Try to parse as JSON first (for structured responses)
    try {
      const jsonResponse = JSON.parse(aiResponseText);
      res.json(jsonResponse);
    } catch (parseError) {
      // If not valid JSON, return as a text response
      console.log('Response is not JSON, sending as text');
      res.json({
        response: aiResponseText
      });
    }

  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({
      error: 'Failed to get a response',
      response: 'Sorry, I encountered a problem. Please try again.'
    });
  }
});

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

    // Extract information from the conversation using AI
    const extractionPrompt = `
      From the following conversation, extract the birthday person's name, age (if mentioned), and the party theme (if mentioned).
      If the theme isn't explicitly stated, infer it from the context or respond with "None" if it cannot be determined.

      Conversation:
      ${messages.map(msg => `${msg.role}: ${msg.content}`).join("\n")}

      Respond with a JSON object in the following format:
      {
        "name": "Extracted Name",
        "age": "Extracted Age or null",
        "theme": "Extracted Theme or 'None'"
      }
    `;

    const extractionResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are an expert at extracting information from conversations." },
        { role: "user", content: extractionPrompt }
      ],
      max_tokens: 200,
      temperature: 0.5,
      response_format: { type: "json_object" }
    });

    let extractedData;
    try {
      extractedData = JSON.parse(extractionResponse.choices[0].message.content);
    } catch (parseError) {
      console.error('Error parsing extraction response:', parseError);
      return res.status(500).json({
        error: 'Failed to parse information from conversation',
        response: 'Sorry, I encountered a problem processing the conversation data.'
      });
    }

    const { name, age, theme } = extractedData;

    // First, generate the invitation text
    const invitationPrompt = `
      Based on our conversation, create a beautiful birthday invitation text for ${name}'s ${age ? age + "th " : ""}birthday.
      The theme is: ${theme === "None" ? "a general birthday" : theme}.
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
    let dallePrompt = `Create a beautiful digital birthday invitation for ${name}'s ${age ? age + "th " : ""}birthday with a ${theme === "None" ? "general birthday" : theme} theme. `;

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

app.get('/api/health', (req, res) => {
  res.json({ status: 'online' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
