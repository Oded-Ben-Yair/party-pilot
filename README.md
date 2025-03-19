# PartyPilot

PartyPilot is an AI-Agent birthday planning assistant that helps users create personalized celebration plans through natural conversation. The application generates custom party plans and digital invitations based on user preferences.

## Features

- Conversational interface for seamless birthday planning
- Generates three distinct party plans based on user preferences
- Creates custom digital invitations with AI-generated designs
- Smart detection of user intent and preferences
- Responsive design for various screen sizes

## Tech Stack

- **Frontend**: React.js
- **Backend**: Node.js with Express
- **AI Integration**: OpenAI (GPT-4 for conversation, DALL-E for invitation generation)

## Installation

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- OpenAI API key

### Setup

1. Clone the repository
   ```bash
   git clone https://github.com/Oded-Ben-Yair/party-pilot.git
   cd party-pilot
   ```

2. Install dependencies for both frontend and backend
   ```bash
   # Install frontend dependencies
   cd frontend
   npm install
   
   # Install backend dependencies
   cd ../server
   npm install
   ```

3. Create a `.env` file in the server directory
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   PORT=3001
   ```

4. Start the application

   In one terminal (backend):
   ```bash
   cd server
   npm start
   ```

   In another terminal (frontend):
   ```bash
   cd frontend
   npm start
   ```

5. Open http://localhost:3000 in your browser

## Usage

1. Start a conversation by telling PartyPilot what event you're planning
2. Share details about the birthday person, location, theme preferences, etc.
3. Review the generated party plans
4. Request an invitation design and see it generated in real-time

## Project Structure

```
party-pilot/
├── frontend/              # React frontend
│   ├── public/            # Static files
│   └── src/               # React components and styles
│       ├── components/    # React components
│       └── App.js         # Main application component
└── server/                # Express backend
    ├── server.js          # Main server file with API endpoints
    └── .env               # Environment variables (not in repo)
```

## API Endpoints

- `/api/chat`: Handles the main conversation with GPT-4
- `/api/generate-invitation`: Creates customized invitations using DALL-E
- `/api/health`: Health check endpoint