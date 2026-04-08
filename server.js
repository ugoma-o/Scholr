import express from 'express';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const HF_API_URL = 'https://router.huggingface.co/models/meta-llama/Llama-2-7b-chat-hf/v1/chat/completions';
const HF_MODEL = 'meta-llama/Llama-2-7b-chat-hf';

const app = express();
app.use(express.json());
app.set('trust proxy', 1);

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60
});

// Serve only index.html (avoids exposing server-side files via static middleware)
app.get('/', limiter, (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

// POST /api/huggingface — proxy to Hugging Face API (keeps API key server-side)
app.post('/api/huggingface', limiter, async (req, res) => {
  const { messages, maxTokens = 800 } = req.body;
  const apiKey = process.env.HUGGING_FACE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages must be a non-empty array' });
  }

  const validRoles = new Set(['system', 'user', 'assistant']);
  const validMessages = messages.every(
    (m) => m && typeof m.role === 'string' && validRoles.has(m.role) && typeof m.content === 'string'
  );
  if (!validMessages) {
    return res.status(400).json({ error: 'each message must have a valid role and string content' });
  }

  const tokens = Number(maxTokens);
  if (!Number.isInteger(tokens) || tokens < 1 || tokens > 4096) {
    return res.status(400).json({ error: 'maxTokens must be an integer between 1 and 4096' });
  }

  try {
    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: HF_MODEL,
        messages,
        max_tokens: tokens,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('HF API error:', response.status, errText);
      return res.status(response.status).json({ error: errText });
    }

    const data = await response.json();

    if (data.error) {
      console.error('HF API returned error:', data.error);
      return res.status(400).json({ error: data.error });
    }

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid API response:', data);
      return res.status(500).json({ error: 'Invalid response structure' });
    }

    return res.status(200).json({
      content: data.choices[0].message.content
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Fallback: serve index.html
app.get('*', limiter, (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

// Only start the HTTP listener when running locally (Vercel handles this in production)
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
