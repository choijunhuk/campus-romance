/**
 * Replicate provider — SDXL (or any SD-family model) via Replicate REST API.
 *
 * Required env:
 *   REPLICATE_API_TOKEN
 * Optional env:
 *   REPLICATE_MODEL_VERSION  — Replicate version hash (default: SDXL 1.0)
 *   REPLICATE_IMG2IMG_STRENGTH — denoising strength 0–1 (default: 0.6)
 *
 * When refImagePath is provided, passes it as `image` (img2img mode).
 *
 * @implements {import('./base.js').Provider}
 */

import { readFileSync, existsSync } from 'node:fs';

const POLL_INTERVAL_MS = 2500;
// SDXL 1.0 stable version
const DEFAULT_VERSION = '7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd72c532b815';

export default {
  name: 'replicate',

  /** @param {string} prompt @param {import('./base.js').GenerateOptions} opts */
  async generate(prompt, { seed, negative, refImagePath } = {}) {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) throw new Error('REPLICATE_API_TOKEN is not set');

    const version = process.env.REPLICATE_MODEL_VERSION || DEFAULT_VERSION;

    const input = {
      prompt,
      ...(negative && { negative_prompt: negative }),
      ...(seed != null && { seed: Number(seed) }),
      num_outputs: 1,
    };

    if (refImagePath && existsSync(refImagePath)) {
      const bytes = readFileSync(refImagePath);
      input.image = `data:image/png;base64,${bytes.toString('base64')}`;
      input.strength = parseFloat(process.env.REPLICATE_IMG2IMG_STRENGTH || '0.6');
    }

    const headers = {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
    };

    const createRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers,
      body: JSON.stringify({ version, input }),
    });

    if (!createRes.ok) {
      const text = await createRes.text();
      throw new Error(`Replicate create ${createRes.status}: ${text.slice(0, 300)}`);
    }

    let prediction = await createRes.json();

    // Poll until terminal state
    while (prediction.status !== 'succeeded' && prediction.status !== 'failed' && prediction.status !== 'canceled') {
      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
      const pollRes = await fetch(prediction.urls.get, { headers });
      if (!pollRes.ok) throw new Error(`Replicate poll ${pollRes.status}`);
      prediction = await pollRes.json();
    }

    if (prediction.status !== 'succeeded') {
      throw new Error(`Replicate prediction ${prediction.status}: ${prediction.error ?? 'unknown'}`);
    }

    const outputUrl = Array.isArray(prediction.output)
      ? prediction.output[0]
      : prediction.output;
    if (!outputUrl) throw new Error('Replicate: empty output');

    const imgRes = await fetch(outputUrl);
    if (!imgRes.ok) throw new Error(`Replicate: download failed ${imgRes.status}`);
    return Buffer.from(await imgRes.arrayBuffer());
  },
};
