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

  const { business, detail, angle, format, duration, item, style, ratio } = body || {};
  if (!business || !angle) return res.status(400).json({ error: 'Missing business or angle' });

  const isVideo = format === 'video';
  const genPlatform = isVideo ? 'Google Flow (Veo)' : 'ChatGPT (GPT Image)';

  // Visual STYLE shapes how the creative looks and feels — this is what drives quality.
  const STYLES = {
    ugc: {
      name: 'UGC (authentic)',
      look: 'Authentic user-generated-content style, as if filmed on a modern phone by a real person. Handheld but steady, natural and slightly imperfect framing, real everyday lighting, genuine and relatable. NOT slick or corporate. Feels like a real customer or worker captured it.',
      copyNote: 'Conversational, first-person, casual and believable — like a real person talking, not an ad.'
    },
    cinematic: {
      name: 'Cinematic',
      look: 'High-end cinematic commercial: shallow depth of field, dramatic but natural lighting, smooth deliberate camera motion, rich color grading, premium film-like quality. Think a polished brand film.',
      copyNote: 'Confident, evocative, premium tone. Short impactful lines.'
    },
    product: {
      name: 'Product showcase',
      look: 'Clean studio-style product showcase: crisp lighting, uncluttered background, sharp focus on the product/subject, professional commercial photography quality, tasteful and modern.',
      copyNote: 'Benefit-led and clear, highlighting what the product/service does and why it matters.'
    },
    testimonial: {
      name: 'Testimonial / talking-head',
      look: 'A person speaking directly to camera in a natural setting (home, jobsite, or office). Warm, trustworthy, well-lit talking-head framing with the subject centered and fully in frame. Feels like a genuine recommendation.',
      copyNote: 'Written as a sincere personal recommendation or story, building trust.'
    }
  };
  const st = STYLES[style] || STYLES.cinematic;

  // Aspect ratio chosen by the user (vertical for reels/tiktok, square/portrait for feed).
  const RATIOS = { vertical: '9:16 vertical', portrait: '4:5 portrait', square: '1:1 square' };
  const aspect = RATIOS[ratio] || (isVideo ? '9:16 vertical' : '1:1 square');

  // Quality directives applied to every visual prompt to avoid the chopped / low-quality look.
  const QUALITY = isVideo
    ? `RENDERING QUALITY (critical): photorealistic, high detail, sharp focus, natural realistic lighting, lifelike skin tones and textures, professional camera work. FRAMING (critical): keep all people and key subjects FULLY in frame — never crop faces, heads, or bodies awkwardly; leave appropriate headroom and margins; subjects well-composed and centered or rule-of-thirds. Avoid distorted hands, extra limbs, warped faces, or unnatural proportions. Smooth, stable, intentional camera motion — no jitter.`
    : `RENDERING QUALITY (critical): photorealistic, high detail, sharp focus, natural realistic lighting, lifelike skin tones and textures. FRAMING (critical): keep all people and key subjects FULLY in frame — never crop faces or bodies awkwardly; leave headroom and margins; well-composed. Avoid distorted hands, extra limbs, or warped faces.`;

  const itemLine = item
    ? `The user will attach a reference: "${item}". The visual prompt must treat it as the real hero subject and not invent a different product.`
    : `No reference will be attached; the visual prompt should describe a photoreal, on-brand scene to generate from scratch.`;

  // Google Flow / Veo caps each generation at 8 seconds. Longer ads are built by
  // chaining multiple 8s clips with the Extend feature. So we break the ad into beats.
  const segCount = isVideo ? Math.max(1, Math.ceil(parseInt(duration, 10) / 8)) : 0;
  const isMultiSeg = segCount > 1;

  const durationGuide = isVideo
    ? (isMultiSeg
        ? `This is a ${duration}-second ${aspect} video ad in ${st.name} style.
IMPORTANT: Google Flow (Veo) generates a MAXIMUM of 8 seconds per clip. To reach ${duration}s, the user generates ${segCount} separate 8-second clips and chains them with Flow's "Extend" feature.
Break the video into exactly ${segCount} self-contained 8-second clips that connect visually. Carry the same subject, lighting, and style across all clips so they match when stitched.`
        : `This is an 8-second ${aspect} video ad in ${st.name} style — a single Google Flow (Veo) generation, no chaining needed.`)
    : `This is a single still image, ${aspect}, in ${st.name} style, with clear negative space reserved for a headline overlay.`;

  // System prompt forces freshness and variety on every call.
  const system = `You are a senior direct-response creative director and prompt engineer for AI image and video generators.
You write fresh, original copy every single time — never reuse phrasings, never fall back on clichés like "Look no further" or "Say goodbye to".
Match the specific ANGLE: an urgency angle must feel time-pressured; a trust angle credible; a proof angle must lean on visible results. Adapt all language to the actual business — never assume roofing unless told.
You are an expert at writing AI-video prompts that produce realistic, well-framed, high-quality results with no cropped subjects, distorted faces, or warped hands. Always include explicit framing and quality direction.
Write like a real human marketer: specific, vivid, varied. Return ONLY valid JSON, no markdown fences, no preamble.`;

  const user = `Generate a complete ad package.

BUSINESS: ${business}
${detail ? `OFFER / CONTEXT: ${detail}` : ''}
ANGLE: ${angle}
VISUAL STYLE: ${st.name} — ${st.look}
ASPECT RATIO: ${aspect}
TOOL THAT WILL GENERATE THE VISUAL: ${genPlatform}
${durationGuide}
${itemLine}

${QUALITY}

Every visual prompt you write MUST embody the ${st.name} style above AND include the rendering-quality and framing direction. The aspect ratio (${aspect}) must be stated in each prompt.

Return JSON with exactly these keys:
{
  "headline": "scroll-stopping primary headline, under 12 words",
  "headlineAlt": "a distinctly different alternate headline",
  "primaryText": "post body copy. ${st.copyNote}",
  "cta": "a 2-4 word call-to-action button label",
  ${isVideo
    ? `"clips": [ ${Array.from({length: segCount}, (_,i)=>`"the full prompt for clip ${i+1} of ${segCount}"`).join(', ')} ],
  "script": [ ${Array.from({length: segCount}, (_,i)=>`"the voiceover line(s) spoken during clip ${i+1}"`).join(', ')} ]`
    : `"visualPrompt": "a detailed, copy-paste-ready prompt for ${genPlatform} in ${st.name} style. Include shot type, composition, lighting, mood, the aspect ratio (${aspect}), the rendering-quality and framing direction above, and reserve space for a headline overlay. End by instructing the model NOT to bake text into the image."`}
}

${isVideo ? `RULES FOR THE "clips" ARRAY (very important):
- Return exactly ${segCount} clip${segCount>1?'s':''}.
- Each array item is the COMPLETE, copy-paste-ready prompt for ONE 8-second Google Flow generation — and NOTHING else.
- Do NOT include labels like "CLIP 1", timecodes, the word "Extend", or any meta-instructions inside the clip text. The user pastes each item directly into Flow exactly as written.
- Each clip describes only its own ~8 seconds: the action, camera motion, lighting, audio, AND explicit framing + quality direction so subjects are fully in frame and photorealistic.
- Embody the ${st.name} visual style in every clip.
- State the ${aspect} aspect ratio in each clip.
- Keep subject, wardrobe, palette, lighting, and style consistent across all clips so they stitch seamlessly (describe the same people the same way each time).
- Clip 1 opens with the hook. The final clip ends leaving empty space (lower third) for a CTA overlay — but do NOT render any text in the video.

RULES FOR THE "script" ARRAY:
- Exactly ${segCount} entr${segCount>1?'ies':'y'}, one per clip, in order.
- Each is the spoken VOICEOVER line for that ~8-second clip — natural, concise (roughly 12-22 words, what fits in 8 seconds), matching the ${st.name} tone.
- Together they form one coherent script across the whole ad: hook → build → call to action in the final line.
- Voiceover only — no camera or stage directions, no "[CLIP 1]" labels, just the spoken words.` : ''}

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
        max_tokens: 2000,
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

      // Normalize the voiceover script into an array aligned with the clips.
      let script = parsed.script;
      if (!Array.isArray(script)) script = (typeof script === 'string' && script) ? [script] : [];
      // Strip stray "Clip n:" prefixes from script lines too.
      script = script.map(s => String(s).replace(/^\s*clip\s*\d+\s*[:\-–]\s*/i, '').trim());
      parsed.script = script;

      delete parsed.visualPrompt;
    }
    parsed.style = style || 'cinematic';
    parsed.ratio = ratio || (isVideo ? 'vertical' : 'square');

    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: 'Unexpected error', detail: String(e).slice(0, 200) });
  }
}
