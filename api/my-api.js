export default async function handler(req, res) {
    // รับเฉพาะ Method POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // รับรูปภาพ (base64) จากหน้าเว็บ
    const { base64 } = req.body;
    if (!base64) {
        return res.status(400).json({ error: 'กรุณาส่งข้อมูลรูปภาพ' });
    }

    // ดึง API Key จาก Vercel Environment Variables
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'Server configuration error (Missing API Key)' });
    }

    const prompt = `Analyze this food image. Reply with ONLY a JSON object, no markdown, no extra text. Start with { end with }.
{"foodName":"ชื่อไทย","foodNameEn":"name","servingSize":"350g","foodGroups":{"grains":"150g","protein":"80g","vegetables":"50g","fruits":"none","dairy":"none","fat":"10g"},"calories":450,"protein_g":15,"carbs_g":55,"sugar_g":8,"fat_g":14,"saturatedFat_g":4,"sodium_mg":750,"fiber_g":3,"cholesterol_mg":60,"healthScore":6,"diseaseRisk":{"diabetes":"ต่ำ","hypertension":"ปานกลาง","heart":"ต่ำ","cholesterol":"ปานกลาง"},"warnings":["w1"],"benefits":["b1"],"ingredients":["i1"]}`;

    try {
        // เซิร์ฟเวอร์เราเป็นคนไปคุยกับ Gemini เอง
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { inline_data: { mime_type: "image/jpeg", data: base64 } },
                            { text: prompt }
                        ]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 8192
                    }
                })
            }
        );

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error((err.error?.message) || 'Gemini API error ' + response.status);
        }

        const data = await response.json();

        // ตรวจสอบข้อมูลแบบเดียวกับที่หน้าเว็บเคยทำ
        const finishReason = data.candidates?.[0]?.finishReason;
        if (finishReason && finishReason !== 'STOP') throw new Error('Gemini หยุดก่อนกำหนด: ' + finishReason);

        const rawText = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
        if (!rawText) throw new Error('Gemini ไม่ส่งข้อความกลับมา');

        // ดึงเฉพาะ JSON object ออกมา
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('ไม่พบ JSON ใน response');
        }

        const parsedData = JSON.parse(jsonMatch[0]);

        // ส่งข้อมูลที่ประมวลผลแล้วกลับไปให้หน้าเว็บ
        return res.status(200).json(parsedData);

    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ error: error.message });
    }
}
