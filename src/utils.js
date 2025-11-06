/* global Document, GM_addStyle, GM_addElement */

/**
 * Waits until <head> exists (or DOM is ready) for the given document.
 */
function ensureHead (doc = document) {
  if (doc.head) return Promise.resolve()
  if (doc.readyState === 'loading') {
    return new Promise(resolve => {
      doc.addEventListener('DOMContentLoaded', () => resolve(), { once: true })
    })
  }
  return new Promise(resolve => setTimeout(resolve)) // next tick
}

/**
 * Add CSS to the page or to a specific container (e.g., ShadowRoot).
 * - If `root` is provided, styles are injected there (ideal for shadow DOM).
 * - Otherwise, styles are added to <head> (or via GM_addStyle when available).
 *
 * @param {string|string[]} css                CSS string or array of CSS strings
 * @param {Object} [opts]
 * @param {Document} [opts.doc=document]       Target document (ignored if root is set)
 * @param {Element|ShadowRoot} [opts.root]     Container to receive <style> (e.g. shadowRoot or an element)
 * @param {boolean} [opts.useGM=true]          Use GM_addStyle / GM_addElement when available
 * @returns {Promise<void>}                    Resolves when injected
 */
export async function addStyle (css, opts = {}) {
  const { doc = document, root = null, useGM = true } = opts

  // Normalize to an array of non-empty strings
  const chunks = Array.isArray(css)
    ? css.filter(Boolean).map(String)
    : (css ? [String(css)] : [])
  if (chunks.length === 0) return

  // If a root is explicitly provided (e.g., shadow DOM), inject there.
  if (root) {
    for (const chunk of chunks) {
      if (useGM && typeof GM_addElement === 'function') {
        // Works in shadow DOM too
        GM_addElement(root, 'style', { textContent: chunk })
      } else {
        const style = (root instanceof Document ? root : root.ownerDocument).createElement('style')
        style.type = 'text/css'
        style.textContent = chunk
        root.appendChild(style)
      }
    }
    return
  }

  // No root provided → inject into document head (or use GM_addStyle)
  if (useGM && typeof GM_addStyle === 'function' && doc === document) {
    for (const chunk of chunks) GM_addStyle(chunk)
    return
  }

  await ensureHead(doc)
  for (const chunk of chunks) {
    const style = doc.createElement('style')
    style.type = 'text/css'
    style.textContent = chunk;
    (doc.head ?? doc.documentElement).appendChild(style)
  }
}
