export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server configuration error (Missing API Key)' });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt + '\n\nIMPORTANT: Return ONLY a valid JSON object starting with { and ending with }. Do NOT include any markdown formatting (like ```json). Ensure all strings are properly escaped and the JSON syntax is strictly valid.' }] }],
          generationConfig: { 
            temperature: 0.1, 
            maxOutputTokens: 8192
          }
        })
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const errMsg = typeof err.error === 'object' ? JSON.stringify(err.error) : (err.error?.message || err.error || 'Gemini API Error ' + response.status);
      throw new Error(errMsg);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('ไม่พบข้อมูล JSON จาก AI (อาจจะจัดรูปแบบผิด) Response: ' + rawText.substring(0, 100));
    }

    const parsedData = JSON.parse(jsonMatch[0]);
    return res.status(200).json(parsedData);
  } catch (error) {
    console.error('Server error:', error);
    const errString = typeof error.message === 'object' ? JSON.stringify(error.message) : error.message;
    return res.status(500).json({ error: errString || String(error) });
  }
}
