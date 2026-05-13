export default async function handler(req, res) {
  try {
    res.setHeader("Content-Type", "application/json");

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const apiKey = process.env.HUGGING_FACE_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Missing HUGGING_FACE_API_KEY environment variable",
      });
    }

    const { messages, maxTokens = 800 } = req.body || {};

    if (!Array.isArray(messages)) {
      return res.status(400).json({
        error: "Missing or invalid messages array",
        receivedBody: req.body,
      });
    }

    const hfResponse = await fetch(
      "https://router.huggingface.co/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "Qwen/Qwen2.5-7B-Instruct",
          messages,
          max_tokens: maxTokens,
          temperature: 0.7,
        }),
      }
    );

    const raw = await hfResponse.text();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return res.status(502).json({
        error: "Hugging Face returned non-JSON",
        status: hfResponse.status,
        raw: raw.slice(0, 1000),
      });
    }

    if (!hfResponse.ok) {
      return res.status(hfResponse.status).json({
        error: parsed.error || parsed.message || "Hugging Face request failed",
        details: parsed,
      });
    }

    const content = parsed.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(502).json({
        error: "Invalid Hugging Face response structure",
        details: parsed,
      });
    }

    return res.status(200).json({ content });
  } catch (error) {
    console.error("Function crashed:", error);

    return res.status(500).json({
      error: "Server function crashed",
      message: error?.message || String(error),
      stack: error?.stack || null,
    });
  }
}
