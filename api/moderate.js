// api/moderate.js - Content moderation for safety
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { content, type } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'No content provided' });
    }

    // Basic profanity and inappropriate content filters
    const inappropriatePatterns = [
      // Add your moderation patterns here
      /\b(explicit|harmful|hate)\b/gi, // Example patterns
    ];

    let flagged = false;
    let reason = '';

    // Check for inappropriate content
    for (const pattern of inappropriatePatterns) {
      if (pattern.test(content)) {
        flagged = true;
        reason = 'Contains inappropriate content';
        break;
      }
    }

    // Check content length
    if (content.length > 5000) {
      flagged = true;
      reason = 'Content too long';
    }

    // Check for spam (too many repeated characters)
    const repeatedChars = /(.)\1{10,}/;
    if (repeatedChars.test(content)) {
      flagged = true;
      reason = 'Potential spam detected';
    }

    // Use AI for advanced moderation
    if (!flagged && process.env.GROQ_API_KEY) {
      try {
        const moderationPrompt = `Analyze if this content is appropriate for a social platform. 
Reply with only "SAFE" or "UNSAFE: [reason]".

Content: ${content.substring(0, 500)}`;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: 'You are a content moderation AI. Be strict but fair.' },
              { role: 'user', content: moderationPrompt }
            ],
            temperature: 0.1,
            max_tokens: 50,
          }),
        });

        const data = await response.json();
        const aiResult = data.choices[0].message.content.trim();

        if (aiResult.startsWith('UNSAFE')) {
          flagged = true;
          reason = aiResult.replace('UNSAFE:', '').trim();
        }
      } catch (err) {
        console.error('AI moderation error:', err);
        // Continue with basic moderation if AI fails
      }
    }

    res.status(200).json({
      safe: !flagged,
      reason: flagged ? reason : null,
      content: flagged ? null : content,
    });

  } catch (error) {
    console.error('Moderation error:', error);
    res.status(500).json({ 
      error: 'Moderation check failed',
      safe: true // Default to safe if moderation fails
    });
  }
}