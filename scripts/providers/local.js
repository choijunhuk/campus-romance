/**
 * Local provider — Stable Diffusion via AUTOMATIC1111 WebUI REST API.
 *
 * Run A1111 with the API enabled:  webui --api   (or --api --listen)
 * Default endpoint: http://127.0.0.1:7860
 *
 * Required env: none (works out of the box if A1111 is running locally)
 * Optional env:
 *   SD_API_URL          (default: http://127.0.0.1:7860)
 *   SD_STEPS            (default: 28)
 *   SD_CFG              (default: 7)
 *   SD_WIDTH            (default: 832)
 *   SD_HEIGHT           (default: 1216)   portrait, good for sprites
 *   SD_SAMPLER          (default: DPM++ 2M Karras)
 *   SD_DENOISE          (default: 0.5)    img2img strength for ref consistency
 *   SD_NEGATIVE_EXTRA   (appended to every negative prompt)
 *
 * Consistency: when refImagePath is given, uses /sdapi/v1/img2img with the base
 * image + fixed seed so expressions keep the same face. Otherwise /sdapi/v1/txt2img.
 *
 * @implements {import('./base.js').Provider}
 */

import { readFileSync, existsSync } from 'node:fs';

const URL = (process.env.SD_API_URL || 'http://127.0.0.1:7860').replace(/\/$/, '');

function common(negative) {
  const neg = [negative, process.env.SD_NEGATIVE_EXTRA].filter(Boolean).join(', ');
  return {
    steps: Number(process.env.SD_STEPS || 28),
    cfg_scale: Number(process.env.SD_CFG || 7),
    width: Number(process.env.SD_WIDTH || 832),
    height: Number(process.env.SD_HEIGHT || 1216),
    sampler_name: process.env.SD_SAMPLER || 'DPM++ 2M Karras',
    negative_prompt: neg,
    n_iter: 1,
    batch_size: 1,
  };
}

async function post(path, body) {
  const res = await fetch(`${URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`A1111 ${path} ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  const b64 = data.images?.[0];
  if (!b64) throw new Error(`A1111 ${path}: no image in response`);
  // A1111 may prefix with "data:image/png;base64,"
  return Buffer.from(b64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
}

export default {
  name: 'local',

  /** @param {string} prompt @param {import('./base.js').GenerateOptions} opts */
  async generate(prompt, { seed, negative, refImagePath } = {}) {
    const base = common(negative);
    if (seed != null) base.seed = seed;

    if (refImagePath && existsSync(refImagePath)) {
      const initB64 = readFileSync(refImagePath).toString('base64');
      return post('/sdapi/v1/img2img', {
        ...base,
        prompt,
        init_images: [initB64],
        denoising_strength: Number(process.env.SD_DENOISE || 0.5),
      });
    }
    return post('/sdapi/v1/txt2img', { ...base, prompt });
  },
};
