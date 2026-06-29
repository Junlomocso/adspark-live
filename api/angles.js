// api/angles.js — suggests fresh, business-specific ad angles live
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Server not configured: missing ANTHROPIC_API_KEY' });

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: 'Invalid request body' }); }
  const business = body && body.business;
  if (!business) return res.status(400).json({ error: 'Missing business' });

  const system = `You are a direct-response strategist. Given a business, propose 5 distinct, high-converting ad angles tailored to it.
Each angle = the core emotional or practical lever an ad would pull. Make them specific to THIS business, not generic.
Return ONLY valid JSON, no markdown fences.`;

  const user = `Business: ${business}

Return JSON: { "angles": [ { "icon": "a single emoji", "title": "3-4 word angle name", "description": "one short line: the pain point or hook it uses" } ] }
Exactly 5 angles. Make them genuinely different from each other.`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        temperature: 1,
        system,
        messages: [{ role: 'user', content: user }]
      })
    });
    if (!r.ok) { const t = await r.text(); return res.status(502).json({ error: 'AI request failed', detail: t.slice(0,300) }); }
    const data = await r.json();
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
    const clean = text.replace(/^```json\s*/i, '').replace(/```$/,'').trim();
    let parsed;
    try { parsed = JSON.parse(clean); } catch { return res.status(502).json({ error: 'Could not parse AI response' }); }
    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: 'Unexpected error', detail: String(e).slice(0,200) });
  }
}
