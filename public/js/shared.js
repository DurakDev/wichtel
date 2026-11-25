export const API = window.location.origin + '/api';
export const app = document.querySelector('#app');
export const params = new URLSearchParams(location.search);
export const adminToken = params.get('admin');
export const participantToken = params.get('p');
export const eventSlug = params.get('event') || location.pathname.split('/').filter(Boolean).pop();
export const state = { name: '', wish: '', exclusions: [], participants: [], joined: null, event: null };

export function icon(name, cls = 'w-5 h-5') {
  const paths = {
    arrow: 'M5 12h14m-6-6 6 6-6 6',
    gift: 'M20 12v10H4V12m16 0H4m16 0V8H4v4m8-4v14M8 8a3 3 0 1 1 0-6c2 0 4 6 4 6m4 0a3 3 0 1 0 0-6c-2 0-4 6-4 6',
    lock: 'M7 10V7a5 5 0 0 1 10 0v3m-12 0h14v10H5V10z',
    edit: 'M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4L16.5 3.5z',
    eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    copy: 'M9 9h10v10H9zM5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1',
    check: 'M20 6 9 17l-5-5',
    spark: 'M12 3l1.2 5.8L19 10l-5.8 1.2L12 17l-1.2-5.8L5 10l5.8-1.2L12 3z'
  };
  return `<svg class="${cls}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name] || paths.spark}"/></svg>`;
}

export function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[c]);
}

export async function getJson(url, options = {}) {
  const response = await fetch(url, options);
  let data = {};
  try { data = await response.json(); } catch { data = { ok: false, error: 'Ungültige Serverantwort.' }; }
  return { response, data };
}

export function shell(content, title = 'Wichteln') {
  document.title = title;
  app.innerHTML = `<div class="snow" aria-hidden="true"><span>✦</span><span>❄</span><span>✧</span><span>❄</span><span>✦</span></div><main class="relative min-h-screen px-4 py-6 sm:py-10"><div class="mx-auto max-w-2xl">${content}</div></main>`;
}

export function header(sub = '') {
  return `<div class="mb-7 flex items-center justify-between"><div class="flex items-center gap-3"><div class="grid h-11 w-11 place-items-center rounded-2xl bg-pine text-2xl text-white shadow-lg">🎁</div><div><div class="font-bold tracking-tight text-pine">Wichteln</div><div class="text-xs text-slate-500">${esc(sub)}</div></div></div></div>`;
}

export function button(label, action, primary = true, id = '') {
  return `<button ${id ? `id="${id}"` : ''} type="button" data-action="${action}" class="btn inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-bold ${primary ? 'bg-pine text-white shadow-lg shadow-pine/15 hover:bg-pine2' : 'bg-white/70 text-pine ring-1 ring-black/5 hover:bg-white'}">${label}</button>`;
}

export function progress(n) {
  return `<div class="mb-7 flex gap-2">${[1, 2, 3].map(i => `<div class="progress-dot flex-1 ${i < n ? 'done' : i === n ? 'active' : ''}"></div>`).join('')}</div>`;
}

export async function copyText(text, successMessage) {
  try {
    if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); alert(successMessage); return; }
    const textarea = document.createElement('textarea'); textarea.value = text; textarea.style.position = 'fixed'; textarea.style.opacity = '0'; document.body.appendChild(textarea); textarea.focus(); textarea.select(); const copied = document.execCommand('copy'); textarea.remove();
    if (copied) { alert(successMessage); return; }
    throw new Error('Kopieren fehlgeschlagen.');
  } catch { alert(`Der Link konnte nicht automatisch kopiert werden.\n\n${text}`); }
}
