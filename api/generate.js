// api/generate.js — Vercel serverless function
// Holds your Claude API key securely (server-side) and generates fresh, unique ad copy on every request.

export default async function handler(req, res) {
  // Basic CORS so the page can call this
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Server not configured: missing ANTHROPIC_API_KEY' });

  // --- simple daily spend guard (in-memory; resets when the function cold-starts) ---
  // For a hard cap, ALSO set a monthly spending limit in the Anthropic Console.
  const DAILY_LIMIT = parseInt(process.env.DAILY_REQUEST_LIMIT || '500', 10);
  globalThis.__count = globalThis.__count || { day: new Date().toDateString(), n: 0 };
  const today = new Date().toDateString();
  if (globalThis.__count.day !== today) globalThis.__count = { day: today, n: 0 };
  if (globalThis.__count.n >= DAILY_LIMIT) {
    return res.status(429).json({ error: 'Daily generation limit reached. Try again tomorrow.' });
  }
  globalThis.__count.n++;

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: 'Invalid request body' }); }

  const { business, detail, angle, format, duration, item } = body || {};
  if (!business || !angle) return res.status(400).json({ error: 'Missing business or angle' });

  const isVideo = format === 'video';
  const platform = isVideo ? 'Google Flow (Veo)' : 'ChatGPT (GPT Image)';
  const itemLine = item
    ? `The user will attach a reference: "${item}". The visual prompt must treat it as the real hero subject and not invent a different product.`
    : `No reference will be attached; the visual prompt should describe a photoreal, on-brand scene to generate from scratch.`;

  // Google Flow / Veo caps each generation at 8 seconds. Longer ads are built by
  // chaining multiple 8s clips with the Extend feature. So we break the ad into beats.
  const segCount = isVideo ? Math.max(1, Math.ceil(parseInt(duration, 10) / 8)) : 0;
  const isMultiSeg = segCount > 1;

  const durationGuide = isVideo
    ? (isMultiSeg
        ? `This is a ${duration}-second vertical (9:16) video for a paid-social ad.
IMPORTANT: Google Flow (Veo) generates a MAXIMUM of 8 seconds per clip. To reach ${duration}s, the user will generate ${segCount} separate 8-second clips and chain them together using Flow's "Extend" feature.
So the video prompt MUST be broken into exactly ${segCount} numbered segments (CLIP 1, CLIP 2, ...), each describing roughly 8 seconds of footage. Each clip must be self-contained enough to generate on its own, but they must connect visually so the chained result feels like one continuous ad. Carry the same subject, lighting, and style across all clips so they match when stitched.`
        : `This is an 8-second vertical (9:16) video — a single Google Flow (Veo) generation, no chaining needed. 8s is Veo's native clip length, the cleanest single take.`)
    : `This is a single still image, square 1:1 for feed, with clear negative space reserved for a headline overlay.`;

  // System prompt forces freshness and variety on every call.
  const system = `You are a senior direct-response creative director writing high-converting paid-social ads.
You write fresh, original copy every single time — never reuse phrasings, never fall back on clichés like "Look no further" or "Say goodbye to".
Match the specific ANGLE you are given: an urgency angle must feel time-pressured; a trust angle must feel credible and reassuring; a proof angle must lean on visible results. Adapt all language to the actual business — never assume roofing unless told.
Write like a real human marketer: specific, vivid, a little surprising. Vary sentence rhythm. No emoji unless it genuinely fits the brand.
Return ONLY valid JSON, no markdown fences, no preamble.`;

  const user = `Generate a complete ad package.

BUSINESS: ${business}
${detail ? `OFFER / CONTEXT: ${detail}` : ''}
ANGLE: ${angle}
TARGET PLATFORM FOR THE VISUAL: ${platform}
${durationGuide}
${itemLine}

Return JSON with exactly these keys:
{
  "headline": "scroll-stopping primary headline, under 12 words",
  "headlineAlt": "a distinctly different alternate headline",
  "primaryText": "2-3 short paragraphs of post body copy that hooks, builds the angle, and leads to action. Use line breaks between paragraphs.",
  "cta": "a 2-4 word call-to-action button label",
  "visualPrompt": "a detailed, copy-paste-ready prompt for ${platform} to generate the ${isVideo ? 'video' : 'image'}. ${isVideo
      ? (isMultiSeg
          ? `Structure it as exactly ${segCount} clearly labeled segments — 'CLIP 1 (0-8s)', 'CLIP 2 (8-16s)', and so on — each ~8 seconds, since Flow generates 8s at a time and the user will chain them with Extend. For each clip give the action, camera motion, lighting, and audio. Keep subject, palette, and style consistent across clips so they match when stitched. Open CLIP 1 with the hook and close the final clip with space for a CTA overlay. Add a one-line note at the top reminding the user to generate each clip in order and use Extend to join them.`
          : `Write it as a single 8-second clip with a beat-by-beat structure (timecodes within the 8s), camera motion, lighting, pacing, and audio direction.`)
      : 'Include shot type, composition, lighting, mood, aspect ratio, and reserve space for a headline overlay.'} End by instructing the model NOT to bake text into the creative."
}

Make this generation genuinely unique — imagine you've never written about this business before.`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        temperature: 1, // high temperature = more variety between generations
        system,
        messages: [{ role: 'user', content: user }]
      })
    });

    if (!r.ok) {
      const errText = await r.text();
      return res.status(502).json({ error: 'AI request failed', detail: errText.slice(0, 300) });
    }

    const data = await r.json();
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
    const clean = text.replace(/^```json\s*/i, '').replace(/```$/,'').trim();

    let parsed;
    try { parsed = JSON.parse(clean); }
    catch { return res.status(502).json({ error: 'Could not parse AI response', raw: clean.slice(0, 400) }); }

    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: 'Unexpected error', detail: String(e).slice(0, 200) });
  }
}
