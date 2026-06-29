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

  const { business, detail, angle, format, duration, item, channel } = body || {};
  if (!business || !angle) return res.status(400).json({ error: 'Missing business or angle' });

  const isVideo = format === 'video';
  const genPlatform = isVideo ? 'Google Flow (Veo)' : 'ChatGPT (GPT Image)';

  // Where the finished ad will be published. This shapes tone, pacing, and aspect ratio.
  const CHANNELS = {
    tiktok: {
      name: 'TikTok',
      ratio: '9:16 vertical',
      tone: 'Raw, native, and authentic — like a real person filmed it, NOT a polished ad. Hook MUST land in the first 1 second or viewers swipe away. Conversational, fast, trend-aware. Avoid corporate language entirely. Sound and a strong spoken or on-screen hook drive everything.',
      copyNote: 'Write the primary text like a TikTok caption: short, punchy, lowercase-friendly, a curiosity hook up front, casual. It should feel native to the feed, not like an ad.'
    },
    fb_reels: {
      name: 'Facebook Reels',
      ratio: '9:16 vertical',
      tone: 'Short-form vertical, slightly more produced than TikTok and skewing to a broader/older audience. Still hook fast, but a clear value message and a confident, friendly tone work well. Mild polish is fine.',
      copyNote: 'Write the primary text as a punchy Reels caption — clear hook, a line of value, and a nudge to act. A little more explicit about the offer than TikTok.'
    },
    ig_reels: {
      name: 'Instagram Reels',
      ratio: '9:16 vertical',
      tone: 'Polished, aesthetic, visually-driven short-form. Audience expects clean, attractive visuals and aspirational tone. Hook fast but lean on visual appeal and lifestyle framing.',
      copyNote: 'Write the primary text as a clean, aspirational Reels caption — visually evocative, benefit-led, with tasteful energy. Light, well-chosen emoji acceptable if it fits the brand.'
    },
    feed: {
      name: 'Facebook / Instagram Feed',
      ratio: isVideo ? '4:5 or 1:1' : '1:1 square or 4:5 portrait',
      tone: 'Direct-response feed ad. A more explicit sales tone is acceptable. Clear value proposition, social proof or offer, and an unambiguous call to action. Can be more produced and salesy than short-form.',
      copyNote: 'Write the primary text as a classic high-converting feed ad: hook, build the angle, present the offer/proof, and drive to the CTA. 2-3 short paragraphs.'
    }
  };
  const ch = CHANNELS[channel] || CHANNELS.feed;

  const itemLine = item
    ? `The user will attach a reference: "${item}". The visual prompt must treat it as the real hero subject and not invent a different product.`
    : `No reference will be attached; the visual prompt should describe a photoreal, on-brand scene to generate from scratch.`;

  // Google Flow / Veo caps each generation at 8 seconds. Longer ads are built by
  // chaining multiple 8s clips with the Extend feature. So we break the ad into beats.
  const segCount = isVideo ? Math.max(1, Math.ceil(parseInt(duration, 10) / 8)) : 0;
  const isMultiSeg = segCount > 1;

  const durationGuide = isVideo
    ? (isMultiSeg
        ? `This is a ${duration}-second ${ch.ratio} video ad for ${ch.name}.
IMPORTANT: Google Flow (Veo) generates a MAXIMUM of 8 seconds per clip. To reach ${duration}s, the user generates ${segCount} separate 8-second clips and chains them with Flow's "Extend" feature.
Break the video into exactly ${segCount} self-contained 8-second clips that connect visually. Carry the same subject, lighting, and style across all clips so they match when stitched.`
        : `This is an 8-second ${ch.ratio} video ad for ${ch.name} — a single Google Flow (Veo) generation, no chaining needed.`)
    : `This is a single still image for ${ch.name}, ${ch.ratio}, with clear negative space reserved for a headline overlay.`;

  // System prompt forces freshness and variety on every call.
  const system = `You are a senior direct-response creative director writing high-converting social ads for specific platforms.
You write fresh, original copy every single time — never reuse phrasings, never fall back on clichés like "Look no further" or "Say goodbye to".
Match the specific ANGLE you are given: an urgency angle must feel time-pressured; a trust angle must feel credible and reassuring; a proof angle must lean on visible results. Adapt all language to the actual business — never assume roofing unless told.
CRITICAL: tailor tone, pacing, and style to the TARGET CHANNEL. A TikTok ad and a Facebook feed ad are completely different animals — do not write the same copy for both.
Write like a real human marketer: specific, vivid, a little surprising. Vary sentence rhythm.
Return ONLY valid JSON, no markdown fences, no preamble.`;

  const user = `Generate a complete ad package.

BUSINESS: ${business}
${detail ? `OFFER / CONTEXT: ${detail}` : ''}
ANGLE: ${angle}
TARGET CHANNEL: ${ch.name}
CHANNEL TONE & STYLE: ${ch.tone}
COPY GUIDANCE FOR THIS CHANNEL: ${ch.copyNote}
TOOL THAT WILL GENERATE THE VISUAL: ${genPlatform}
${durationGuide}
${itemLine}

Return JSON with exactly these keys:
{
  "headline": "scroll-stopping primary headline tuned for ${ch.name}, under 12 words",
  "headlineAlt": "a distinctly different alternate headline",
  "primaryText": "post body copy tuned specifically for ${ch.name}. ${ch.copyNote}",
  "cta": "a 2-4 word call-to-action button label",
  ${isVideo
    ? `"clips": [ ${Array.from({length: segCount}, (_,i)=>`"the full prompt for clip ${i+1} of ${segCount}"`).join(', ')} ]`
    : `"visualPrompt": "a detailed, copy-paste-ready prompt for ${genPlatform}. Include shot type, composition, lighting, mood, aspect ratio (${ch.ratio}), and reserve space for a headline overlay. End by instructing the model NOT to bake text into the image."`}
}

${isVideo ? `RULES FOR THE "clips" ARRAY (very important):
- Return exactly ${segCount} clip${segCount>1?'s':''}.
- Each array item is the COMPLETE, copy-paste-ready prompt for ONE 8-second Google Flow generation — and NOTHING else.
- Do NOT include labels like "CLIP 1", timecodes, the word "Extend", or any meta-instructions inside the clip text. The user pastes each item directly into Flow exactly as written.
- Each clip describes only its own ~8 seconds: the action, camera motion, lighting, and audio for that beat.
- Keep subject, palette, lighting, and style consistent across all clips so they stitch seamlessly.
- Clip 1 opens with the hook. The final clip ends leaving empty space (lower third) for a CTA overlay — but do NOT render any text in the video.
- Match the pacing/energy to ${ch.name}.` : ''}

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

    // Normalize output so the frontend always gets a predictable shape.
    if (isVideo) {
      let clips = parsed.clips;
      if (!Array.isArray(clips)) {
        // Fallbacks if the model returned a string instead of an array.
        if (typeof parsed.visualPrompt === 'string') clips = [parsed.visualPrompt];
        else if (typeof clips === 'string') clips = [clips];
        else clips = [];
      }
      // Strip any stray "CLIP n" labels or leading timecodes the model may have added.
      clips = clips.map(c => String(c)
        .replace(/^\s*clip\s*\d+\s*[:\-–(]?[^\n]*?\)?\s*/i, '')
        .replace(/^\s*\(?\d+\s*[-–]\s*\d+\s*s\)?\s*[:\-–]?\s*/i, '')
        .trim());
      parsed.clips = clips;
      delete parsed.visualPrompt;
    }
    parsed.channel = channel || 'feed';

    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: 'Unexpected error', detail: String(e).slice(0, 200) });
  }
}
