/**
 * OpenAI provider — gpt-image-1 via REST API.
 *
 * Required env:
 *   OPENAI_API_KEY
 * Optional env:
 *   OPENAI_MODEL  (default: gpt-image-1)
 *   OPENAI_SIZE   (default: 1024x1024)
 *
 * When refImagePath is provided and the file exists, uses the /images/edits
 * endpoint so the model maintains character appearance from the base image.
 * Falls back to /images/generations when no reference is available.
 *
 * @implements {import('./base.js').Provider}
 */

import { readFileSync, existsSync } from 'node:fs';
import { basename } from 'node:path';

const BASE_URL = 'https://api.openai.com/v1';

export default {
  name: 'openai',

  /** @param {string} prompt @param {import('./base.js').GenerateOptions} opts */
  async generate(prompt, { negative, refImagePath } = {}) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is not set');

    const model = process.env.OPENAI_MODEL || 'gpt-image-1';
    const size = process.env.OPENAI_SIZE || '1024x1024';
    // Negative prompt is not a first-class param; weave it into the prompt.
    const fullPrompt = negative
      ? `${prompt}\n\n[Do NOT include]: ${negative}`
      : prompt;

    if (refImagePath && existsSync(refImagePath)) {
      return generateWithReference(apiKey, model, size, fullPrompt, refImagePath);
    }
    return generateNew(apiKey, model, size, fullPrompt);
  },
};

async function generateNew(apiKey, model, size, prompt) {
  const res = await fetch(`${BASE_URL}/images/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, prompt, n: 1, size, response_format: 'b64_json' }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI generations ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error('OpenAI: no b64_json in generations response');
  return Buffer.from(b64, 'base64');
}

async function generateWithReference(apiKey, model, size, prompt, refImagePath) {
  // Node 18+ has global FormData and Blob
  const form = new FormData();
  const imgBytes = readFileSync(refImagePath);
  form.append('image', new Blob([imgBytes], { type: 'image/png' }), basename(refImagePath));
  form.append('model', model);
  form.append('prompt', prompt);
  form.append('n', '1');
  form.append('size', size);
  form.append('response_format', 'b64_json');

  const res = await fetch(`${BASE_URL}/images/edits`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI edits ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  // edits endpoint may return url or b64_json depending on response_format support
  const b64 = data.data?.[0]?.b64_json;
  if (b64) return Buffer.from(b64, 'base64');

  const url = data.data?.[0]?.url;
  if (url) return fetchUrl(url);

  throw new Error('OpenAI: no image in edits response');
}

async function fetchUrl(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download image from URL: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
