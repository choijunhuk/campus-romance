/**
 * Provider interface (JSDoc only — no runtime code).
 *
 * Every provider module must export a default object matching this shape:
 *
 * @typedef {Object} GenerateOptions
 * @property {number|null}  [seed]         - Fixed seed for reproducibility.
 * @property {string|null}  [negative]     - Negative prompt text.
 * @property {string|null}  [refImagePath] - Absolute path to a reference PNG
 *                                           for img2img / character consistency.
 *
 * @typedef {Object} Provider
 * @property {string} name                           - Provider identifier.
 * @property {function(string, GenerateOptions): Promise<Buffer>} generate
 *   Generates an image from `prompt` and returns raw PNG/JPEG bytes as a Buffer.
 *   Throws on API errors — the caller handles retries.
 */

export {};
