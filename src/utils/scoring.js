// src/utils/scoring.js - Enhanced scoring calculations

export const calculateRizzScore = (baseScore, factors = {}) => {
  let score = baseScore;

  // Apply modifiers based on factors
  if (factors.confidence) score += factors.confidence * 5;
  if (factors.creativity) score += factors.creativity * 3;
  if (factors.authenticity) score += factors.authenticity * 4;
  if (factors.humor) score += factors.humor * 3;

  // Penalties
  if (factors.tryingTooHard) score -= 10;
  if (factors.generic) score -= 15;
  if (factors.cringe) score -= factors.cringe * 2;

  // Keep in range
  score = Math.max(0, Math.min(100, score));

  // Add uniqueness (prevent identical scores)
  const uniqueOffset = (Math.random() - 0.5) * 2;
  score = Math.round((score + uniqueOffset) * 100) / 100;

  return score;
};

export const getRankFromScore = (score) => {
  if (score >= 95) return { name: 'Rizz God', emoji: '🔥', color: '#FF0080', tier: 7 };
  if (score >= 90) return { name: 'Rizz Legend', emoji: '⭐', color: '#FFD700', tier: 6 };
  if (score >= 85) return { name: 'S-Tier', emoji: '💎', color: '#00D4FF', tier: 5 };
  if (score >= 80) return { name: 'A-Tier', emoji: '💫', color: '#9D4EDD', tier: 4 };
  if (score >= 75) return { name: 'B-Tier', emoji: '✨', color: '#06FFA5', tier: 3 };
  if (score >= 70) return { name: 'C-Tier', emoji: '🌟', color: '#FFB627', tier: 2 };
  return { name: 'Rising Star', emoji: '⭐', color: '#888888', tier: 1 };
};

export const getScoreBreakdown = (type, aiResponse) => {
  const breakdown = {
    overall: 0,
    categories: {},
    strengths: [],
    weaknesses: [],
    improvements: []
  };

  try {
    const text = aiResponse.toLowerCase();

    // Extract scores based on type
    if (type === 'linkedin') {
      breakdown.categories = {
        professionalism: extractNumber(text, 'professional', 75),
        clarity: extractNumber(text, 'clarity', 70),
        impact: extractNumber(text, 'impact', 65),
        authenticity: extractNumber(text, 'authentic', 80)
      };
    } else if (type === 'instagram') {
      breakdown.categories = {
        originality: 100 - extractNumber(text, 'cringe', 30),
        personality: extractNumber(text, 'personality', 70),
        appeal: extractNumber(text, 'appeal', 75),
        brevity: extractNumber(text, 'concise', 80)
      };
    } else if (type === 'dating') {
      breakdown.categories = {
        attraction: extractNumber(text, 'swipe-right', 70),
        personality: extractNumber(text, 'personality', 75),
        humor: extractNumber(text, 'funny', 65),
        authenticity: extractNumber(text, 'genuine', 80)
      };
    } else if (type === 'selfie') {
      breakdown.categories = {
        confidence: extractNumber(text, 'confidence', 75),
        style: extractNumber(text, 'style', 70),
        energy: extractNumber(text, 'energy', 80),
        vibe: extractNumber(text, 'vibe', 75)
      };
    }

    // Calculate overall from categories
    const categoryScores = Object.values(breakdown.categories);
    if (categoryScores.length > 0) {
      breakdown.overall = Math.round(
        categoryScores.reduce((a, b) => a + b, 0) / categoryScores.length
      );
    }

    // Extract strengths and weaknesses
    breakdown.strengths = extractListItems(aiResponse, ['good', 'great', 'strong', 'impressive', 'works']);
    breakdown.weaknesses = extractListItems(aiResponse, ['weak', 'lacking', 'needs', 'wrong', 'avoid']);
    breakdown.improvements = extractListItems(aiResponse, ['improve', 'fix', 'change', 'try', 'consider']);

  } catch (err) {
    console.error('Error creating score breakdown:', err);
  }

  return breakdown;
};

// Helper to extract numbers from text
const extractNumber = (text, keyword, defaultVal) => {
  const pattern = new RegExp(`${keyword}[:\\s]*(\\d+)`, 'i');
  const match = text.match(pattern);
  return match ? parseInt(match[1]) : defaultVal;
};

// Helper to extract list items
const extractListItems = (text, keywords) => {
  const items = [];
  const lines = text.split('\n');

  lines.forEach(line => {
    const matchesKeyword = keywords.some(kw => line.toLowerCase().includes(kw));
    if (matchesKeyword && line.trim().length > 10) {
      const cleaned = line.replace(/^[-•*\d.]+\s*/, '').trim();
      if (cleaned) items.push(cleaned);
    }
  });

  return items.slice(0, 3); // Top 3
};

export const calculateProgress = (oldScore, newScore) => {
  const diff = newScore - oldScore;
  const percentChange = oldScore > 0 ? ((diff / oldScore) * 100).toFixed(1) : 0;
  
  return {
    difference: diff,
    percentChange: percentChange,
    direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'same',
    message: diff > 0 ? '📈 Improving!' : diff < 0 ? '📉 Declined' : '➡️ Stable'
  };
};

export const getMotivationalMessage = (score, rank) => {
  if (score >= 95) return "You're absolutely crushing it! Keep that energy! 🔥";
  if (score >= 90) return "Top tier rizz! You're in the elite club! ⭐";
  if (score >= 85) return "Impressive! Just a few tweaks to perfection! 💎";
  if (score >= 80) return "Solid game! Keep pushing! 💪";
  if (score >= 75) return "Good foundation! Room for growth! 🌱";
  if (score >= 70) return "You're on the right track! Keep improving! ✨";
  return "Everyone starts somewhere! Let's level up! 🚀";
};