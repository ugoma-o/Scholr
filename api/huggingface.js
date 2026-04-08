export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, maxTokens = 800 } = req.body;
  const apiKey = process.env.HUGGING_FACE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const response = await fetch(
    'https://router.huggingface.co/hf-inference',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'meta-llama/Llama-2-7b-chat-hf',
          messages: messages,
          max_tokens: maxTokens,
          temperature: 0.7
        })
      }
    );

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
    console.error('Vercel API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
