/**
 * Gemini provider — Google Imagen via Generative Language REST API.
 *
 * Required env:
 *   GEMINI_API_KEY
 * Optional env:
 *   GEMINI_MODEL  (default: imagen-3.0-generate-002)
 *
 * Note: Imagen does not accept a reference image for img2img; the refImagePath
 * option is silently ignored. Use strong, detailed prompts (via appearance_lock
 * data) and a fixed seed for character consistency instead.
 *
 * @implements {import('./base.js').Provider}
 */

export default {
  name: 'gemini',

  /** @param {string} prompt @param {import('./base.js').GenerateOptions} opts */
  async generate(prompt, { seed, negative } = {}) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

    const model = process.env.GEMINI_MODEL || 'imagen-3.0-generate-002';
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`;

    const body = {
      instances: [{ prompt }],
      parameters: {
        sampleCount: 1,
        ...(seed != null && { seed: Number(seed) }),
        ...(negative && { negativePrompt: negative }),
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Gemini API ${res.status}: ${text.slice(0, 300)}`);
    }

    const data = await res.json();
    const b64 = data.predictions?.[0]?.bytesBase64Encoded;
    if (!b64) throw new Error('Gemini: no image bytes in response');
    return Buffer.from(b64, 'base64');
  },
};
