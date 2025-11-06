import { addStyle } from './utils.js'

/* globals location */

const MAX_ERRORS = 200
let prefix = '[ErrorReporter]'

const _subscribers = []
function _notify (errors) {
  for (const fn of _subscribers) {
    try { fn(errors) } catch {}
  }
}
function _subscribe (fn) {
  _subscribers.push(fn)
  return () => {
    const i = _subscribers.indexOf(fn)
    if (i >= 0) _subscribers.splice(i, 1)
  }
}

/**
 * Initialize the ErrorReporter with a prefix for console messages.
 */
function init (prefixString = '[ErrorReporter]') {
  prefix = prefixString
}

/**
 * Store the errors array in GM storage
 */
function persist (errors) {
  return GM.setValue('errorList', JSON.stringify(errors))
}

/**
 * Load the errors array from GM storage
 * @returns {Promise<Array>} The errors array
 */
async function load () {
  const stored = await GM.getValue('errorList', '[]')
  return JSON.parse(stored)
}

/**
 * Clear all stored errors.
 */
function clear () {
  return GM.setValue('errorList', '[]')
}

/**
 * Add an error entry to the log and persist it
 */
function add (error, label = 'unknown') {
  console.error(`${prefix} ${label} failed:`, error)

  const entry = {
    time: new Date().toISOString(),
    label,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : null,
    url: location ? location.href : null
  }

  load().then(async errors => {
    errors.push(entry)
    if (errors.length > MAX_ERRORS) errors = errors.slice(-MAX_ERRORS)
    await persist(errors)
    _notify(errors)
  })
}

/**
 * Convert the stored error objects into a readable text log.
 * Example output:
 *
 * [2025-11-06T20:45:31.111Z] (fetchUserData) ReferenceError: user is not defined
 *   at fetchUserData (main.js:42)
 *   at <anonymous>:1:123
 *
 * [2025-11-06T20:45:32.550Z] (updateUI) TypeError: Cannot read property 'textContent' of null
 *   Page: https://bandcamp.com/album/whatever
 */
function formatErrorsForLog (errors) {
  if (!Array.isArray(errors) || !errors.length) return 'No errors recorded.'

  return errors
    .slice()
    .sort((a, b) => Date.parse(b.time || 0) - Date.parse(a.time || 0)) // newest first
    .map(e => {
      const ts = e.time || new Date().toISOString()
      const label = e.label || 'unknown'
      const message = e.message || ''
      const url = e.url ? `\n  Page: ${e.url}` : ''
      const stack = e.stack ? `\n  ${e.stack.split('\n').join('\n  ')}` : ''
      return `[${ts}] (${label}) ${message}${stack}${url}`
    })
    .join('\n\n')
}

/**
 * Show recent errors in a modal dialog.
 */
async function showRecentErrors () {
  addStyle(`
    .er-panel{position:fixed; z-index:999999; right:12px; bottom:12px;}
    .er-btn{cursor:pointer; padding:8px 12px; border-radius:10px; box-shadow:0 2px 10px rgba(0,0,0,.15); background:#222; color:#fff; font:14px/1.2 system-ui; }
    .er-badge{display:none; margin-left:8px; background:#e11; color:#fff; border-radius:10px; padding:2px 6px; font-size:12px;}
    .er-modal{position:fixed; inset:0; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center;}
    .er-card{width:min(900px, 96vw); height:min(80vh, 720px); background:#fff; color:#111; border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,.25); display:flex; flex-direction:column;}
    .er-head{padding:12px 16px; border-bottom:1px solid #eee; display:flex; gap:8px; align-items:center; justify-content:space-between; font-weight:600;}
    .er-body{padding:10px; display:grid; grid-template-columns: 1fr 360px; gap:10px; overflow:hidden;}
    .er-list{margin:0; padding:0; list-style:none; overflow:auto; border:1px solid #eee; border-radius:8px; }
    .er-item{padding:10px 12px; border-bottom:1px solid #f1f1f1;}
    .er-item:last-child{border-bottom:0;}
    .er-topline{display:flex; gap:8px; align-items:baseline; flex-wrap:wrap;}
    .er-time{font:12px/1.2 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; color:#666;}
    .er-label{font-weight:600;}
    .er-message{color:#c00;}
    .er-details{margin-top:6px;}
    .er-pre{margin:6px 0 0; padding:8px; background:#fafafa; border:1px solid #eee; border-radius:6px; max-height:160px; overflow:auto; font:12px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;}
    .er-side{display:flex; flex-direction:column; gap:8px; overflow:hidden;}
    .er-side .er-jsonlabel{font-weight:600;}
    .er-body textarea{width:90%; height:100%; border: 2px solid #6363d3; resize:none; padding:12px; font:12px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; background:#fafafa}
    .er-actions{padding:10px; border-top:1px solid #eee; display:flex; gap:8px; justify-content:flex-end;}
    .er-actions button{padding:8px 12px; border:1px solid #ddd; background:#f6f6f6; border-radius:8px; cursor:pointer;}
    @media (max-width: 900px){
      .er-body{grid-template-columns: 1fr;}
    }
  `)

  const errorsRaw = await load()
  // newest first
  const errors = (Array.isArray(errorsRaw) ? errorsRaw : []).slice().sort((a, b) => {
    const ta = Date.parse(a.time || a.at || 0)
    const tb = Date.parse(b.time || b.at || 0)
    return tb - ta
  })
  const logText = formatErrorsForLog(errors)

  const modal = document.createElement('div')
  modal.className = 'er-modal'

  // Static shell
  modal.innerHTML = `
    <div class="er-card" role="dialog" aria-label="Error report">
      <div class="er-head">
        <span>Errors: ${errors.length}</span>
        <div></div>
      </div>
      <div class="er-body">
        <ul class="er-list" aria-label="Recent Errors"></ul>
        <div class="er-side">
        <div>Copy or review the error log below:</div>
        <textarea readonly>${logText}</textarea>
        </div>
      </div>
      <div class="er-actions">
        <button class="er-clear">Clear errors</button>
        <button class="er-close">Close</button>
      </div>
    </div>
  `

  // Build human-readable list safely
  const listEl = modal.querySelector('.er-list')

  for (const e of errors) {
    const li = document.createElement('li')
    li.className = 'er-item'

    const top = document.createElement('div')
    top.className = 'er-topline'

    const time = document.createElement('span')
    time.className = 'er-time'
    time.textContent = e.time || e.at || ''

    const label = document.createElement('span')
    label.className = 'er-label'
    label.textContent = e.label || 'unknown'

    const message = document.createElement('span')
    message.className = 'er-message'
    message.textContent = e.message || ''

    top.appendChild(time)
    top.appendChild(label)
    top.appendChild(document.createTextNode(' — '))
    top.appendChild(message)

    const details = document.createElement('details')
    details.className = 'er-details'

    const summary = document.createElement('summary')
    summary.textContent = 'Details'
    details.appendChild(summary)

    // URL
    if (e.url) {
      const p = document.createElement('div')
      const a = document.createElement('a')
      a.href = e.url
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      a.textContent = e.url
      p.appendChild(document.createTextNode('Page: '))
      p.appendChild(a)
      details.appendChild(p)
    }

    // Stack
    if (e.stack) {
      const pre = document.createElement('pre')
      pre.className = 'er-pre'
      pre.textContent = e.stack
      details.appendChild(pre)
    }

    li.appendChild(top)
    li.appendChild(details)
    listEl.appendChild(li)
  }

  // Wire close/clear
  const close = () => modal.remove()
  modal.addEventListener('click', (ev) => { if (ev.target === modal) close() })
  modal.querySelector('.er-close').addEventListener('click', close)
  modal.querySelector('.er-clear').addEventListener('click', async () => {
    await clear()
    close()
    showRecentErrors()
  })

  document.body.appendChild(modal)
}

function startLiveErrorPanel ({ pollMs = 1500 } = {}) {
  addStyle(`
    .er-devpanel{position:fixed; left:0; top:50px; height:70vh; width:400px; z-index:999999;
      background:#111; color:#eee; box-shadow:2px 0 20px rgba(0,0,0,.35); border: 2px solid #861684; display:flex; flex-direction:column; font:12px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;}
    .er-devheader{display:flex; align-items:center; gap:8px; padding:8px 10px; background:#181818; border-bottom:1px solid #262626;}
    .er-devtitle{font-weight:700; flex:1;}
    .er-devbtn{cursor:pointer; padding:4px 8px; border:1px solid #333; background:#1f1f1f; color:#eee; border-radius:6px;}
    .er-devbtn[aria-pressed="true"]{background:#2a2a2a;}
    .er-devlist{flex:1; overflow:auto; padding:8px; }
    .er-item{padding:8px; border-bottom:1px solid #222;}
    .er-item:last-child{border-bottom:0;}
    .er-top{display:flex; gap:6px; align-items:baseline; flex-wrap:wrap;}
    .er-time{color:#9aa; font-size:11px;}
    .er-label{font-weight:700; color:#fff;}
    .er-msg{color:#f88;}
    .er-stack{white-space:pre-wrap; color:#ccd; margin-top:6px;}
    .er-url{color:#9cf; margin-top:4px; word-break:break-all;}
    .er-collapsed{transform:translateX(-360px);}
  `)

  // Panel shell
  const panel = document.createElement('aside')
  panel.dataset.panelStartedCollapsed = 'true'
  panel.className = 'er-devpanel er-collapsed'
  panel.innerHTML = `
    <div class="er-devheader">
      <div class="er-devtitle">Error log:</div>
      <button class="er-devbtn er-copy" type="button" title="Copy log">Copy</button>
      <button class="er-devbtn er-pause" type="button" aria-pressed="false" title="Pause live">Pause</button>
      <button class="er-devbtn er-clear" type="button" title="Clear errors">Clear</button>
      <button class="er-devbtn er-collapse" type="button" title="Collapse">&#9654;</button>
    </div>
    <div class="er-devlist" aria-live="polite" aria-label="Live error list"></div>
  `
  document.body.appendChild(panel)

  const listEl = panel.querySelector('.er-devlist')
  const btnPause = panel.querySelector('.er-pause')
  const btnClear = panel.querySelector('.er-clear')
  const btnCopy = panel.querySelector('.er-copy')
  const btnCollapse = panel.querySelector('.er-collapse')

  let paused = false
  let lastRenderedCount = -1

  btnPause.addEventListener('click', () => {
    paused = !paused
    btnPause.setAttribute('aria-pressed', String(paused))
    btnPause.textContent = paused ? 'Resume' : 'Pause'
  })

  btnClear.addEventListener('click', async () => {
    await clear()
    render([])
  })

  btnCopy.addEventListener('click', async () => {
    const errors = await load()
    const text = formatErrorsForLog(errors)
    if (GM.setClipboard) {
      await GM.setClipboard(text, { type: 'text', mimetype: 'text/plain' })
    } else {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
  })

  btnCollapse.addEventListener('click', () => {
    panel.classList.toggle('er-collapsed')
    btnCollapse.innerHTML = panel.classList.contains('er-collapsed') ? '&#9654;' : '&#9664;'
  })

  function render (errors) {
    if (paused) return
    if ('panelStartedCollapsed' in panel.dataset && errors.length > 0) {
      // First render, auto-expand
      delete panel.dataset.panelStartedCollapsed
      btnCollapse.click()
    }
    // Avoid extra work if same count and last item unchanged
    if (errors.length === lastRenderedCount && listEl.dataset.lastTime === (errors[0]?.time || '')) return

    lastRenderedCount = errors.length
    listEl.dataset.lastTime = errors[0]?.time || ''
    listEl.innerHTML = '' // simple full re-render

    const sorted = errors.slice().sort((a, b) => Date.parse(b.time || 0) - Date.parse(a.time || 0))
    for (const e of sorted) {
      const item = document.createElement('div')
      item.className = 'er-item'

      const top = document.createElement('div')
      top.className = 'er-top'

      const t = document.createElement('span')
      t.className = 'er-time'
      t.textContent = e.time || ''

      const lab = document.createElement('span')
      lab.className = 'er-label'
      lab.textContent = e.label || 'unknown'

      const sep = document.createTextNode(' — ')

      const msg = document.createElement('span')
      msg.className = 'er-msg'
      msg.textContent = e.message || ''

      top.appendChild(t)
      top.appendChild(lab)
      top.appendChild(sep)
      top.appendChild(msg)
      item.appendChild(top)

      if (e.stack) {
        const pre = document.createElement('div')
        pre.className = 'er-stack'
        pre.textContent = e.stack
        item.appendChild(pre)
      }
      if (e.url) {
        const url = document.createElement('div')
        url.className = 'er-url'
        url.textContent = e.url
        item.appendChild(url)
      }

      listEl.appendChild(item)
    }
  }

  // Initial render + live updates
  load().then(render)
  const unsub = _subscribe(render)

  // Return a cleanup function if you ever need to remove the panel
  return () => {
    unsub()
    panel.remove()
  }
}

/**
 * Export as a singleton module
 */
const ErrorReporter = { add, init, clear, showRecentErrors, startLiveErrorPanel }
export default ErrorReporter
