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

  const { business, detail, angle, duration, item, style, ratio, voice, offerType, productImage, settingImage } = body || {};
  if (!business || !angle) return res.status(400).json({ error: 'Missing business or angle' });

  const isService = offerType === 'service';
  const offerWord = isService ? 'service' : 'product';

  // AdSpark is video-only. Everything generates Google Flow (Veo) video prompts.
  const isVideo = true;
  const genPlatform = 'Google Flow (Veo)';

  // Voiceover direction (video only). All optional.
  const v = voice || {};
  const voiceBrief = isVideo ? [
    v.gender && v.gender !== 'any' ? `Voice gender: ${v.gender}.` : '',
    v.nationality ? `Accent / nationality: ${v.nationality}.` : '',
    v.language ? `Language: ${v.language}.` : 'Language: English.',
    v.tone ? `Tone: ${v.tone}.` : ''
  ].filter(Boolean).join(' ') : '';

  // Physical descriptor of an on-camera presenter, derived from the voice details
  // (gender + nationality/ethnicity), so the VISIBLE person matches the voiceover.
  // Applied ONLY when a person actually appears on screen — never forced into product/scene clips.
  const personBits = isVideo ? [
    v.gender && v.gender !== 'any' ? v.gender : '',
    v.nationality ? v.nationality : ''
  ].filter(Boolean).join(' ').trim() : '';
  const personRule = (isVideo && personBits)
    ? `ON-CAMERA PERSON MATCHING: The voiceover talent is a ${personBits} person. IF — and only if — a person appears on camera in a clip (e.g. talking-head, presenter, or UGC creator), that person MUST visibly be ${personBits} so they match the voice. Describe their appearance accordingly in that clip's prompt, consistently across clips (same individual, same wardrobe). If a clip shows only the product, scene, or environment with no person, do NOT insert a person — keep it product/scene-only.`
    : '';

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

  // Quality directives applied to every clip, incorporating the user's proven Flow directive.
  const QUALITY = `RENDERING QUALITY (critical): ultra-realistic and convincing, photorealistic high detail, sharp focus, cinematic lighting, lifelike realistic skin texture and natural skin tones, professional camera work. PERFORMANCE: if a person is on camera, natural and energetic hand gestures and body language, believable expressions, a selling and persuasive energy without looking staged. IDENTITY: if a reference face is used, do NOT alter the face — keep it the same person. FRAMING (critical): keep all people and key subjects FULLY in frame — never crop faces, heads, or bodies awkwardly; leave appropriate headroom and margins; well-composed (centered or rule-of-thirds). Avoid distorted hands, extra limbs, warped faces, or unnatural proportions. Smooth, stable, intentional camera motion — no jitter.`;

  const hasProductImg = !!(productImage && productImage.data && productImage.media_type);
  const hasSettingImg = !!(settingImage && settingImage.data && settingImage.media_type);
  const hasAnyImg = hasProductImg || hasSettingImg;

  // Offer-type-aware locking. Physical product = strict exact-appearance lock.
  // Service = lock the accurate look of the work/result and depict it realistically.
  const lockInstruction = isService
    ? `
SERVICE ACCURACY & LOCKING (critical):
Build a precise "LOCK SHEET" describing the exact look of the SERVICE / its result and any people, so they stay identical across every clip.
- Lock the accurate appearance of the work or result (e.g. for roofing: roof type, material, color, seam style, condition) — depict the service truthfully and professionally, never misleading.
- If a worker or customer appears: lock age range, gender, ethnicity/skin tone, hair, build, and exact clothing/uniform.
- Lock the setting details that define the scene.
This LOCK SHEET must be embedded verbatim into EVERY clip so the same look repeats identically. Consistency comes from repeating the same precise description, never paraphrasing differently between clips.`
    : `
PRODUCT ACCURACY & LOCKING (critical):
Build a precise "LOCK SHEET" — an exact, reusable description of the PRODUCT (and any on-camera person) so it stays identical across every clip.
- Lock the product's exact type, shape, proportions, color(s), materials, texture, finish, packaging, logo, label, printed text, buttons, components, and every distinguishing detail.
- Do NOT redesign, replace, simplify, stylize, or swap the product for a generic look-alike. Do not add features not present; do not remove real ones. The product must remain immediately recognizable as the exact same item.
- If a person appears: lock age range, gender, ethnicity/skin tone, hair, build, and exact clothing.
This LOCK SHEET must be embedded verbatim into EVERY clip so the same product/person repeats identically. Consistency comes from repeating the same precise description, never paraphrasing differently between clips.`;

  // Reference-role guidance (dual image support).
  let refUsage = '';
  if (hasProductImg && hasSettingImg) {
    refUsage = `\nTWO REFERENCE IMAGES are provided. Image 1 = the ${offerWord.toUpperCase()} (use as the exact reference for the ${offerWord} / its appearance or result). Image 2 = the SETTING / MODEL (use as the reference for environment, person, pose, layout, angle, composition, and overall creative concept). Combine the important elements of both into the clips. Study both images carefully and describe what you actually see.`;
  } else if (hasProductImg) {
    refUsage = `\nA reference image of the ${offerWord.toUpperCase()} is provided. Use it as the exact reference for the ${offerWord}'s appearance/result. Study it carefully and describe what you actually see.`;
  } else if (hasSettingImg) {
    refUsage = `\nA reference image of the SETTING / MODEL is provided. Use it as the reference for environment, person, pose, layout, and creative concept. Study it carefully and describe what you actually see.`;
  }

  const itemLine = hasAnyImg
    ? `The user has UPLOADED reference image(s) (provided in this message).${refUsage} The user will attach the same image(s) in ${genPlatform} themselves.${item ? ` They also note: "${item}".` : ''}${lockInstruction}`
    : item
      ? `The user describes a reference they will attach in ${genPlatform}: "${item}". Treat it as the real hero subject; do not invent a different ${offerWord}.${lockInstruction}`
      : `No reference will be attached; invent a photoreal, on-brand subject. Still create a LOCK SHEET describing your chosen subject precisely, and repeat it in every clip.${lockInstruction}`;

  // Hard negative constraints applied to every clip (the "do not" contract).
  const negativeConstraints = `NEGATIVE CONSTRAINTS (every clip must avoid these): no watermarks, no random or fake logos, no incorrect labels, no gibberish or misspelled text, no duplicated objects, no distorted or extra hands/fingers, no deformed or warped faces, no morphing of the ${offerWord} between clips, no unrealistic proportions, no collage or split-screen, no on-screen text baked into the video. Prioritize exact reference accuracy over creative reinterpretation.`;

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
${isVideo && voiceBrief ? `VOICEOVER DIRECTION: ${voiceBrief}` : ''}
${personRule}
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
    ? `"speaker": "a one-line description of the voiceover talent based on the VOICEOVER DIRECTION (e.g. 'American man, warm and confident'). If no direction given, choose a fitting default.",
  "lockSheet": "the precise LOCK SHEET — an exact physical description of the key subject(s) (person and/or product) that is embedded identically into every clip for consistency. 2-5 sentences.",
  "framePrompt": "a complete, structured IMAGE prompt for generating the HERO FIRST FRAME as a still (to be used as the image-to-video input in Flow). Follow this exact sectioned format with these headers: REFERENCE USAGE, ${isService ? 'SERVICE ACCURACY' : 'CRITICAL PRODUCT ACCURACY'}, IMAGE STYLE, COMPOSITION, CREATIVE DIRECTION (with Product/Service, Target audience, Setting, Main selling point, Desired emotion, Image format ${aspect}, Visual angle), TEXT IN THE IMAGE: None, and FINAL REQUIREMENTS (the negative constraints). It must embed the lock sheet, match the ${st.name} style, and reflect the references. This is a self-contained prompt the user pastes into an image generator.",
  "clips": [ ${Array.from({length: segCount}, (_,i)=>`"the full prompt for clip ${i+1} of ${segCount} (must contain the lock sheet description)"`).join(', ')} ],
  "script": [ ${Array.from({length: segCount}, (_,i)=>`"the voiceover line spoken during clip ${i+1}"`).join(', ')} ]`
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
- REFERENCE CONSISTENCY: embed the LOCK SHEET description of the key subject (${offerWord} and/or person) into EVERY clip, word-for-word the same, so the subject does not change appearance between clips. This is the most important rule for a reference-based ad.
- ${negativeConstraints}
- Clip 1 opens with the hook. The final clip ends leaving empty space (lower third) for a CTA overlay — but do NOT render any text in the video.
${personBits ? `- WHENEVER a human appears on camera in a clip, that person must be a ${personBits} individual (matching the voiceover talent), described consistently across clips. Skip this for clips that show only product, scenery, or B-roll with no person.` : ''}

RULES FOR THE "script" ARRAY (write these so they sound like a REAL PERSON SPEAKING, not written ad copy):
- Exactly ${segCount} entr${segCount>1?'ies':'y'}, one per clip, in order.
- Each is ONLY the spoken VOICEOVER words for that ~8-second clip — short enough to say naturally in 8 seconds (roughly 12-20 words).
- CRITICAL — NATURAL SPEECH: Write how a real person actually TALKS out loud, casual and conversational. NOT slogans, NOT a list of adjectives, NOT marketing taglines. Avoid slogan-style phrasing like "walang ito, walang iyon" or "no this, no that". Use everyday spoken rhythm, contractions, and the way real people phrase things in casual conversation.
- ${voiceBrief ? `Suit the voiceover direction (${voiceBrief}).` : 'Use a natural, friendly speaker.'}
- LANGUAGE: ${(v.language && v.language.toLowerCase() !== 'english') ? `Write the lines in ${v.language}, using NATURAL, NATIVE, EVERYDAY SPOKEN ${v.language} — the way a real native speaker casually talks, including natural code-switching or common everyday words if that's how people genuinely speak. Do NOT write stiff, formal, or textbook ${v.language}, and do NOT write translated-sounding ad copy. It must sound like a real ${v.language} speaker talking to a friend.` : 'Write in natural, casual, everyday spoken English — the way a real person talks, not formal or salesy.'}
- Together they flow as ONE natural spoken message: a hook that grabs attention, then the point, then a casual nudge to act at the end. Make it feel like one person talking through the whole ad, not separate slogans.
- Just the spoken words — no speaker labels, no stage directions inside the line.` : ''}

Make this generation genuinely unique — imagine you've never written about this business before.`;

  // Build the message content. Include whichever reference image(s) were uploaded.
  let userContent;
  if (hasAnyImg) {
    const parts = [];
    if (hasProductImg) {
      parts.push({ type: 'text', text: `Reference Image 1 — the ${offerWord.toUpperCase()}:` });
      parts.push({ type: 'image', source: { type: 'base64', media_type: productImage.media_type, data: productImage.data } });
    }
    if (hasSettingImg) {
      parts.push({ type: 'text', text: `Reference Image 2 — the SETTING / MODEL:` });
      parts.push({ type: 'image', source: { type: 'base64', media_type: settingImage.media_type, data: settingImage.data } });
    }
    parts.push({ type: 'text', text: user });
    userContent = parts;
  } else {
    userContent = user;
  }

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
        max_tokens: 3000,
        temperature: 1, // high temperature = more variety between generations
        system,
        messages: [{ role: 'user', content: userContent }]
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
      parsed.speaker = parsed.speaker || '';
      parsed.lockSheet = parsed.lockSheet || '';
      parsed.framePrompt = parsed.framePrompt || '';

      // ---- Build the consolidated FINAL PROMPTS ----
      // Voice/speaker line shown in the bundle.
      const voiceLine = [
        parsed.speaker ? parsed.speaker : '',
        v.tone ? `tone: ${v.tone}` : '',
        (v.language && v.language.toLowerCase() !== 'english') ? `language: ${v.language}` : ''
      ].filter(Boolean).join(' · ');

      const imgCount = (hasProductImg?1:0) + (hasSettingImg?1:0);
      const refLine = imgCount > 0
        ? `REFERENCE IMAGE${imgCount>1?'S':''}: attach your uploaded reference image${imgCount>1?'s (the '+offerWord+' and the setting/model)':''} in Google Flow before generating — the result should match ${imgCount>1?'them':'it'}.`
        : '';

      const styName = (style || 'cinematic');
      // Per-clip final prompt: everything needed to make and narrate that one clip.
      parsed.finalClips = clips.map((clip, i) => {
        const vo = script[i] || '';
        return [
          `=== CLIP ${i+1} of ${clips.length} — ${aspect} ===`,
          ``,
          `VIDEO PROMPT (paste into Google Flow):`,
          clip,
          ``,
          vo ? `VOICEOVER${voiceLine ? ` (${voiceLine})` : ''}:` : '',
          vo ? `"${vo}"` : '',
          refLine ? `` : '',
          refLine
        ].filter(l => l !== '').join('\n');
      });
    }
    parsed.style = style || 'cinematic';
    parsed.ratio = ratio || 'vertical';
    parsed.voice = v;
    parsed.usedImage = hasProductImg || hasSettingImg;
    parsed.offerType = isService ? 'service' : 'product';

    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: 'Unexpected error', detail: String(e).slice(0, 200) });
  }
}
