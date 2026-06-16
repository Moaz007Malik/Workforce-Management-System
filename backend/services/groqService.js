const GROQ_BASE = 'https://api.groq.com/openai/v1';

export function isGroqConfigured() {
  return Boolean(process.env.GROQ_API_KEY?.trim());
}

export function getGroqModel() {
  return process.env.GROQ_MODEL?.trim() || 'llama-3.3-70b-versatile';
}

/**
 * @param {object} options
 * @param {string} options.systemPrompt
 * @param {Array<{role: string, content: string}>} options.messages
 */
export async function chatWithGroq({ systemPrompt, messages }) {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    const err = new Error('Groq API is not configured. Set GROQ_API_KEY in backend .env');
    err.code = 'GROQ_NOT_CONFIGURED';
    throw err;
  }

  const payload = {
    model: getGroqModel(),
    temperature: 0.25,
    max_tokens: 4096,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role === 'bot' ? 'assistant' : m.role,
        content: m.content,
      })),
    ],
  };

  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data?.error?.message || data?.error || `Groq API error (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }

  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error('Groq returned an empty response');
  }

  return {
    text,
    model: data?.model || getGroqModel(),
  };
}
