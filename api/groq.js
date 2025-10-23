// api/groq.js - Vercel Serverless Function (CommonJS)
const Groq = require('groq-sdk');

// Initialize Groq client
const getGroqClient = () => {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured');
  }
  return new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });
};

// Rate limiting (simple in-memory)
const rateLimitMap = new Map();
const RATE_LIMIT = 20;
const RATE_WINDOW = 60000;

function checkRateLimit(userId) {
  const now = Date.now();
  const userRequests = rateLimitMap.get(userId) || [];
  const recentRequests = userRequests.filter(time => now - time < RATE_WINDOW);
  
  if (recentRequests.length >= RATE_LIMIT) {
    return false;
  }
  
  recentRequests.push(now);
  rateLimitMap.set(userId, recentRequests);
  return true;
}

// CORS headers
const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-id');
};

module.exports = async function handler(req, res) {
  // Set CORS headers
  setCorsHeaders(res);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, type = 'chat', userProfile } = req.body;
    const userId = req.headers['x-user-id'] || 'anonymous';

    // Validate API key
    if (!process.env.GROQ_API_KEY) {
      console.error('GROQ_API_KEY not set');
      return res.status(500).json({ 
        error: 'AI service not configured. Add GROQ_API_KEY to environment variables.' 
      });
    }

    // Rate limiting
    if (!checkRateLimit(userId)) {
      return res.status(429).json({ 
        error: 'Too many requests. Wait a minute before trying again.' 
      });
    }

    // Validate input
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Invalid messages format' });
    }

    // Get Groq client
    const groq = getGroqClient();

    // Handle different request types
    let response;
    
    switch (type) {
      case 'selfie':
      case 'chat':
      case 'screenshot':
        response = await handleImageAnalysis(groq, messages, userProfile);
        break;
      
      case 'linkedin':
      case 'instagram':
      case 'dating':
        response = await handleTextAnalysis(groq, messages, type, userProfile);
        break;
      
      default:
        response = await handleChat(groq, messages, userProfile);
        break;
    }

    return res.status(200).json(response);

  } catch (error) {
    console.error('Groq API Error:', error);
    
    // Handle specific error types
    if (error.status === 429) {
      return res.status(429).json({ 
        error: 'AI service rate limit reached. Try again in a moment.' 
      });
    }
    
    if (error.status === 401 || error.message.includes('API key')) {
      return res.status(500).json({ 
        error: 'AI service authentication failed. Check API configuration.' 
      });
    }
    
    return res.status(500).json({ 
      error: 'AI service temporarily unavailable. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Image Analysis Handler - UPDATED WITH LLAMA 4 SCOUT (October 2025)
async function handleImageAnalysis(groq, messages, userProfile) {
  const systemPrompt = `You are Rizzculator AI, a brutally honest but hilarious vibe analyzer.
Rate this person's vibe on a scale of 1-100. Be funny, use Gen Z slang, and give specific observations.
Keep your response to 2-3 sentences max. Be playful but not mean.`;

  try {
    const completion = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct", // ✅ CURRENT WORKING MODEL (October 2025)
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        ...messages
      ],
      temperature: 0.9,
      max_tokens: 500,
    });

    const aiResponse = completion.choices[0]?.message?.content || "Looking good! 🔥";

    // Extract scores from response or generate
    const extractScore = (text, keyword) => {
      const match = text.match(new RegExp(`${keyword}[:\\s]+([0-9.]+)`, 'i'));
      return match ? parseFloat(match[1]) : 70 + Math.random() * 25;
    };

    return {
      message: aiResponse,
      scores: {
        overall: extractScore(aiResponse, 'score') || (75 + Math.random() * 20),
        mainCharacter: 70 + Math.random() * 28,
        rizz: 70 + Math.random() * 28,
        npc: 5 + Math.random() * 30
      }
    };
  } catch (error) {
    console.error('Image analysis error:', error);
    throw error;
  }
}

// Text Analysis Handler
async function handleTextAnalysis(groq, messages, type, userProfile) {
  let systemPrompt = '';
  
  switch (type) {
    case 'linkedin':
      systemPrompt = `You are a professional LinkedIn coach. Analyze this profile and provide:
1. A professional score (0-100)
2. Honest assessment
3. 3 specific improvements
Keep it constructive but real. 2-3 sentences max.`;
      break;
      
    case 'instagram':
      systemPrompt = `You are a social media expert. Roast this Instagram bio with humor.
Rate the cringe level (0-100). Be savage but funny. 2-3 sentences max.`;
      break;
      
    case 'dating':
      systemPrompt = `You are a dating coach. Rate this profile (0-100) and give honest feedback.
What's working? What's not? Be funny but helpful. 2-3 sentences max.`;
      break;
  }

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile", // ✅ Still working for text
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        ...messages
      ],
      temperature: 0.8,
      max_tokens: 400,
    });

    const aiResponse = completion.choices[0]?.message?.content || "Not bad! 👍";

    // Extract score
    const scoreMatch = aiResponse.match(/\b([0-9]{1,3})\b/);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 75 + Math.random() * 20;

    return {
      message: aiResponse,
      scores: {
        overall: Math.min(100, Math.max(0, score))
      }
    };
  } catch (error) {
    console.error('Text analysis error:', error);
    throw error;
  }
}

// Chat Handler
async function handleChat(groq, messages, userProfile) {
  const systemPrompt = `You are Rizzculator AI, a witty and fun chatbot that helps people with dating advice and rizz tips.
Be conversational, use Gen Z slang naturally, and keep responses short (2-3 sentences).
Be funny and helpful. User: ${userProfile?.username || 'Anonymous'} (Rizz Score: ${userProfile?.rizzScore || 0})`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile", // ✅ Still working for text
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        ...messages.slice(-10)
      ],
      temperature: 0.9,
      max_tokens: 300,
    });

    const aiResponse = completion.choices[0]?.message?.content || "Hey! What's up? 😊";

    return {
      message: aiResponse,
      type: 'chat'
    };
  } catch (error) {
    console.error('Chat error:', error);
    throw error;
  }
}