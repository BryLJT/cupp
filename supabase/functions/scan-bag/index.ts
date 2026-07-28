// scan-bag: the real bag-scan path (Block 3).
//
// The app uploads a photo to the private bag-scans bucket, then invokes this
// function with the storage path. Server-side we sign a short-lived URL for
// the photo and send it to the vision model with the grounding prompt proven
// by scripts/scan_spike.py + upload_and_scan.py. The AI key lives ONLY here
// (Supabase secret AI_API_KEY) — never in the app bundle.
//
// Hard-won reliability rule from the Block 3 batch runs (2026-07-22): the
// Agnes free tier intermittently returns HTTP 200 with EMPTY content
// (~1/3 of first calls). We retry those up to 3 attempts total.
//
// Response shape matches the client contract in lib/data/types.ts:
//   { isCoffeeBag: boolean, fields: Record<BeanFieldKey, BeanField> }
//   BeanField = { value: string|null, sourceText: string|null, basis }
//   (decaf → 'Decaf' | 'Caffeinated' | null; tasting notes → comma-joined)

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { encodeBase64 } from 'jsr:@std/encoding@1/base64';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BUCKET = 'bag-scans';
const MODEL_ATTEMPTS = 3;

const FIELDS = [
  'roaster',
  'coffee_name',
  'origin_country',
  'origin_region',
  'process',
  'variety',
  'roast_level',
  'altitude',
  'roast_date',
  'roaster_tasting_notes',
  'weight',
  'decaf',
] as const;

const SYSTEM =
  'You read specialty-coffee bag labels and extract structured data. ' +
  'You never invent information. If a value is not clearly printed on the bag, ' +
  'you leave it null. Marketing copy is not a substitute for a stated field.';

const INSTRUCTION = `Extract these fields from the coffee bag in the image: ${FIELDS.join(', ')}.

Return ONLY a JSON object of this exact shape:
{
  "is_coffee_bag": <true|false>,
  "fields": {
    "<field>": { "value": <value or null>, "source_text": <exact text you read it from, or null>, "basis": "read" | "inferred" | "not_visible" }
  }
}

Rules:
- "read": the value is literally printed on the bag. Put the exact snippet in source_text.
- "inferred": you are guessing from context, not reading it. Use sparingly.
- "not_visible": the field is not shown. Set value AND source_text to null.
- roaster_tasting_notes is an array of the ROASTER's printed flavour descriptors (e.g. ["blueberry","cocoa"]). Do not invent notes.
- decaf: value true only if the bag says decaf/decaffeinated; else false with basis "read" if it clearly states caffeinated/nothing, or "not_visible".
- Do not guess roaster or origin. If you cannot read them, they are not_visible.
Return the JSON and nothing else.`;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Tolerant parse: direct load, else grab the first {...} block. */
function parseModelJson(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function callModel(imageUrl: string): Promise<Record<string, unknown> | null> {
  const baseUrl = (Deno.env.get('AI_BASE_URL') ?? 'https://apihub.agnes-ai.com/v1').replace(/\/$/, '');
  const model = Deno.env.get('AI_MODEL') ?? 'agnes-2.0-flash';
  const apiKey = Deno.env.get('AI_API_KEY');
  if (!apiKey) throw new Error('AI_API_KEY secret is not set');

  const payload = (forceJson: boolean) => ({
    model,
    temperature: 0,
    max_tokens: 1500,
    ...(forceJson ? { response_format: { type: 'json_object' } } : {}),
    messages: [
      { role: 'system', content: SYSTEM },
      {
        role: 'user',
        content: [
          { type: 'text', text: INSTRUCTION },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ],
  });

  for (let attempt = 1; attempt <= MODEL_ATTEMPTS; attempt++) {
    let resp = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload(true)),
    });
    // Some gateways reject response_format — retry once without it.
    if (resp.status === 400 && (await resp.clone().text()).includes('response_format')) {
      resp = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload(false)),
      });
    }
    if (resp.status === 429) throw new ModelBusyError();
    if (!resp.ok) throw new Error(`model HTTP ${resp.status}`);

    const body = await resp.json();
    const content: string = body?.choices?.[0]?.message?.content ?? '';
    if (content.trim()) {
      return parseModelJson(content);
    }
    // Empty-content 200 — the known Agnes flake. Loop and retry.
  }
  return null;
}

class ModelBusyError extends Error {}

type Basis = 'read' | 'inferred' | 'not_visible';

interface ClientField {
  value: string | null;
  sourceText: string | null;
  basis: Basis;
}

/** Model JSON (snake_case, mixed value types) → client BeanFields contract. */
function toClientFields(parsed: Record<string, unknown>): Record<string, ClientField> {
  const rawFields = (parsed.fields ?? {}) as Record<string, Record<string, unknown>>;
  const out: Record<string, ClientField> = {};

  for (const key of FIELDS) {
    const cell = rawFields[key] ?? {};
    const basis: Basis = cell.basis === 'read' || cell.basis === 'inferred' ? cell.basis : 'not_visible';
    let value = cell.value ?? null;
    const sourceText = typeof cell.source_text === 'string' ? cell.source_text : null;

    if (basis === 'not_visible' || value === null) {
      out[key] = { value: null, sourceText: null, basis: 'not_visible' };
      continue;
    }
    if (key === 'roaster_tasting_notes') {
      value = Array.isArray(value) ? value.join(', ') : String(value);
    } else if (key === 'decaf') {
      value = value === true || value === 'true' ? 'Decaf' : 'Caffeinated';
    } else {
      value = String(value);
    }
    out[key] = { value: value as string, sourceText, basis };
  }
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Who's asking? Signed-in users only.
    const authHeader = req.headers.get('Authorization') ?? '';
    const admin = createClient(url, serviceKey);
    const { data: userData, error: userError } = await admin.auth.getUser(
      authHeader.replace(/^Bearer\s+/i, ''),
    );
    if (userError || !userData?.user) {
      return json({ error: 'Not signed in' }, 401);
    }

    const { path } = await req.json();
    if (typeof path !== 'string' || !path) {
      return json({ error: 'path is required' }, 400);
    }
    // Users may only scan photos in their own folder ({uid}/... per storage policy).
    if (!path.startsWith(`${userData.user.id}/`) || path.includes('..')) {
      return json({ error: 'Invalid path' }, 403);
    }

    // Embed the image in the request instead of handing the provider a signed
    // URL to fetch: the function sits next to the storage (same region), while
    // the provider fetching a Singapore URL cross-region cost ~2s per scan in
    // the 27 Jul A/B (median 8.0s URL vs 6.2s embedded).
    const { data: file, error: downloadError } = await admin.storage.from(BUCKET).download(path);
    if (downloadError || !file) {
      return json({ error: 'Photo not found' }, 404);
    }
    const mime = path.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    const dataUrl = `data:${mime};base64,${encodeBase64(await file.arrayBuffer())}`;

    const parsed = await callModel(dataUrl);
    if (!parsed) {
      return json({ error: 'The scanner could not read this photo. Try again or type it in manually.' }, 502);
    }

    return json({
      isCoffeeBag: parsed.is_coffee_bag === true,
      fields: toClientFields(parsed),
    });
  } catch (e) {
    if (e instanceof ModelBusyError) {
      return json({ error: 'The scanner is busy right now. Try again in a minute.' }, 503);
    }
    return json({ error: 'Unexpected error' }, 500);
  }
});
