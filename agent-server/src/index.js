import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server });

let genAI = null;
let model = null;
let useAI = false;


const MODEL_OPTIONS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro-preview-03-25',
];

async function initializeGemini() {
  if (!process.env.GEMINI_API_KEY) {
    console.log('No GEMINI_API_KEY found - Using mock responses');
    return;
  }

  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  // Try each model until one works
  for (const modelName of MODEL_OPTIONS) {
    try {
      console.log(` Trying model: ${modelName}...`);
      const testModel = genAI.getGenerativeModel({ model: modelName });
      
      // Test the model with a simple request
      const result = await testModel.generateContent('Hi');
      const response = await result.response;
      const text = response.text();
      
      if (text) {
        model = testModel;
        useAI = true;
        console.log(`Successfully connected to model: ${modelName}`);
        return;
      }
    } catch (error) {
      console.log(`Model ${modelName} failed: ${error.message?.substring(0, 50)}...`);
    }
  }
  
  console.log('All models failed - Using mock responses');
  console.log('Make sure your API key is from: https://aistudio.google.com/app/apikey');
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', gemini: useAI });
});


wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('Received:', message);

      if (message.type === 'chat') {
        await handleChatMessage(ws, message.content);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      sendSafe(ws, { type: 'error', content: 'Failed to process message' });
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  sendSafe(ws, { type: 'connected', content: 'Connected to chat server' });
});

function sendSafe(ws, data) {
  if (ws.readyState === 1) { 
    ws.send(JSON.stringify(data));
    return true;
  }
  return false;
}

async function handleChatMessage(ws, userMessage) {
  sendSafe(ws, {
    type: 'thinking',
    content: 'Analyzing your question...'
  });

  if (useAI && model) {
    await streamGeminiResponse(ws, userMessage);
  } else {
    await sendMockResponse(ws, userMessage);
  }
}

async function streamGeminiResponse(ws, userMessage) {
  try {
    sendSafe(ws, { type: 'thinking_done' });


    const result = await model.generateContentStream(userMessage);

    let fullResponse = '';
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        fullResponse += text;
        sendSafe(ws, {
          type: 'stream',
          content: text
        });
      }
    }

    sendSafe(ws, {
      type: 'done',
      content: fullResponse
    });

  } catch (error) {
    console.error('Gemini Error:', error.message);
    await sendMockResponse(ws, userMessage);
  }
}

async function sendMockResponse(ws, userMessage) {
  await sleep(800);
  sendSafe(ws, { type: 'thinking_done' });
  const response = getMockResponse(userMessage);

 
  const words = response.split(' ');
  for (const word of words) {
    await sleep(40 + Math.random() * 80);
    sendSafe(ws, {
      type: 'stream',
      content: word + ' '
    });
  }

  
  sendSafe(ws, {
    type: 'done',
    content: response
  });
}

function getMockResponse(message) {
  const text = message.toLowerCase();

  if (text.includes('hi') || text.includes('hello')) {
    return 'Hello! How can I help you today? I am your AI assistant and ready to answer any questions you might have.';
  }
  if (text.includes('how are you')) {
    return "I'm doing great, thank you for asking! As an AI, I'm always ready and eager to help. What can I do for you today?";
  }
  if (text.includes('weather')) {
    return "I don't have access to real-time weather data, but I'd recommend checking a weather service like weather.com or your phone's weather app for accurate forecasts.";
  }
  if (text.includes('help')) {
    return "I'd be happy to help! You can ask me questions about various topics, get explanations, or have a conversation. What would you like to know?";
  }
  if (text.includes('thank')) {
    return "You're welcome! Is there anything else I can help you with?";
  }
  if (text.includes('name')) {
    return "I'm your friendly AI assistant! I'm here to help you with questions and have conversations.";
  }
  if (text.includes('what can you do')) {
    return "I can help you with a variety of tasks! I can answer questions, have conversations, provide explanations, and more. Just ask me anything!";
  }

  return `Thanks for your message: "${message}". I'm currently running in demo mode. To get real AI responses, make sure your Gemini API key from https://aistudio.google.com/app/apikey is set in the .env file!`;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const PORT = process.env.PORT || 8080;

async function start() {
  console.log('\n Initializing...\n');
  await initializeGemini();
  
  server.listen(PORT, () => {
    console.log(`\n Server running on http://localhost:${PORT}`);
    console.log(` WebSocket available at ws://localhost:${PORT}\n`);
  });
}

start();
