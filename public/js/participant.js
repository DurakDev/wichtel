import { API, participantToken, state } from './shared.js';
import { button, esc, getJson, header, icon, shell } from './shared.js';
import { renderJoin } from './join.js';

let revealTimer = null;

export async function loadParticipant(token) {
  if (!token) { alert('Kein persönlicher Link vorhanden.'); return false; }
  try {
    const { response, data } = await getJson(`${API}/p/${encodeURIComponent(token)}`);
    if (!response.ok) { alert(data.error || 'Persönlicher Link ungültig.'); return false; }
    state.joined = data; state.name = data.participant?.name || ''; state.wish = data.participant?.wish || ''; state.exclusions = data.participant?.exclusions || []; state.participants = data.participants || []; return true;
  } catch (error) { alert(`Der persönliche Link konnte nicht geladen werden.\n\n${error.message}`); return false; }
}

export async function editParticipant() { if (await loadParticipant(participantToken)) renderEdit(); }

export function renderEdit() {
  if (!state.joined) return renderJoin();
  const locked = state.joined.status === 'started', currentId = state.joined.participant?.id;
  const people = state.participants.filter(p => p.id !== currentId).map(p => `<label class="flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-black/5 ${locked ? 'opacity-60' : ''}"><span>${esc(p.name)}</span><input type="checkbox" value="${esc(p.id)}" ${locked ? 'disabled' : ''} ${state.exclusions.includes(p.id) ? 'checked' : ''} class="h-5 w-5 accent-pine"/></label>`).join('');
  shell(`${header(locked ? 'Auslosung gestartet' : 'Angaben bearbeiten')}<div class="card glass p-6 sm:p-8"><div class="flex items-start justify-between gap-4"><div><div class="mb-3 text-4xl">${locked ? '🔒' : '✏️'}</div><h1 class="serif text-3xl text-pine">Deine Angaben</h1></div>${locked ? '<span class="rounded-full bg-pine/10 px-3 py-1 text-xs font-bold text-pine">Gesperrt</span>' : ''}</div><p class="mt-3 text-sm leading-6 text-slate-600">${locked ? 'Die Auslosung wurde bereits durchgeführt. Deine Angaben können nicht mehr verändert werden.' : 'Du kannst alles bis zum Start der Auslosung ändern.'}</p><label class="mt-6 block text-sm font-bold text-pine">Name</label><input id="editName" ${locked ? 'disabled' : ''} value="${esc(state.name)}" class="mt-2 w-full rounded-2xl bg-white px-4 py-3 ring-1 ring-black/5 disabled:opacity-60"/><label class="mt-5 block text-sm font-bold text-pine">Wunsch / Geschenkidee</label><textarea id="editWish" ${locked ? 'disabled' : ''} rows="4" class="mt-2 w-full resize-none rounded-2xl bg-white p-4 ring-1 ring-black/5 disabled:opacity-60">${esc(state.wish)}</textarea><div class="mt-5"><div class="text-sm font-bold text-pine">Ausschlüsse</div><div class="mt-2 space-y-2">${people}</div></div>${locked ? `<div class="mt-6">${button('Zurück zur Zuordnung', 'renderResult', false)}</div>` : `<div class="mt-6">${button(`${icon('check', 'w-4 h-4')} Änderungen speichern`, 'saveEdit')}</div>`}</div>`);
}

export async function saveEdit() {
  if (!state.joined || state.joined.status === 'started') return;
  const name = document.querySelector('#editName')?.value.trim() || '', wish = document.querySelector('#editWish')?.value.trim() || '';
  if (!name) return alert('Bitte gib deinen Namen ein.');
  const exclusions = [...document.querySelectorAll('#app input[type="checkbox"]:checked')].map(input => input.value);
  try {
    const { response, data } = await getJson(`${API}/p/${encodeURIComponent(participantToken)}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, wish, exclusions }) });
    if (!response.ok) return alert(data.error || 'Speichern fehlgeschlagen.');
    if (await loadParticipant(participantToken)) renderEdit();
  } catch (error) { alert(`Die Änderungen konnten nicht gespeichert werden.\n\n${error.message}`); }
}

export function markRevealSeen() { if (participantToken) localStorage.setItem('wichteln-revealed-' + participantToken, '1'); }

export function wichtelAnimation() {
  console.log('🎄 wichtelAnimation() gestartet'); if (revealTimer) clearTimeout(revealTimer);
  shell(`${header('Deine Auslosung')}<div class="card glass p-6 sm:p-10 text-center"><div class="mx-auto max-w-md"><div class="mb-4 text-sm font-bold uppercase tracking-[.2em] text-gold">Ein kleiner Moment …</div><div class="mx-auto flex h-64 w-64 items-center justify-center overflow-hidden rounded-3xl bg-white"><video id="revealVideo" src="/wichtel_white_fade.mp4" autoplay muted playsinline preload="auto" controls class="h-full w-full object-contain"></video></div><h1 class="serif mt-5 text-3xl text-pine">Der Wichtel greift in den Sack …</h1><p class="mt-3 text-xs text-slate-400">Dein Geschenkgeheimnis wird gleich gelüftet.</p><div class="mt-5">${button('Überspringen', 'skipReveal', false)}</div></div></div>`);
  const video = document.getElementById('revealVideo');
  if (!video) { console.error('❌ revealVideo wurde NICHT gefunden!'); return; }
  video.muted = true;
  const finishReveal = () => { markRevealSeen(); if (revealTimer) { clearTimeout(revealTimer); revealTimer = null; } renderResult(); };
  video.addEventListener('ended', finishReveal); video.addEventListener('error', () => console.error('❌ VIDEO FEHLER:', video.error));
  revealTimer = setTimeout(() => { if (video.currentTime === 0) console.warn('⏱️ Video konnte nicht rechtzeitig starten.'); }, 5000);
  video.play().then(() => console.log('▶️ Video gestartet')).catch(error => console.warn('❌ Automatische Wiedergabe blockiert:', error));
}

export function skipReveal() { if (revealTimer) { clearTimeout(revealTimer); revealTimer = null; } markRevealSeen(); renderResult(); }

export function renderResult() {
  if (!state.joined) return;
  const assignment = state.joined.assignment; if (!assignment) return renderEdit();
  shell(`${header('Dein Wichtel')}<div class="card glass overflow-hidden"><div class="bg-pine px-6 py-8 text-center text-white"><div class="text-5xl">🎁</div><div class="mt-3 text-xs font-bold uppercase tracking-[.2em] text-gold">Du beschenkst</div><h1 class="serif mt-2 text-5xl">${esc(assignment.receiverName)}</h1></div><div class="p-6 sm:p-8"><div class="rounded-3xl bg-cream p-5"><div class="text-xs font-bold uppercase tracking-wider text-slate-500">Wunsch</div><p class="mt-3 text-lg leading-7 text-pine">${esc(assignment.receiverWish || 'Dieser Wichtel hat keinen Wunsch hinterlegt.')}</p></div><div class="mt-5 rounded-2xl bg-pine/5 p-4 text-sm text-slate-600">🤫 Psst! Verrate niemandem, wen du bekommen hast.</div></div></div>`);
}

export async function initParticipant() {
  if (!await loadParticipant(participantToken)) return;
  if (state.joined.status === 'started' && state.joined.assignment) {
    const key = 'wichteln-revealed-' + participantToken;
    if (!localStorage.getItem(key)) wichtelAnimation(); else renderResult();
    return;
  }
  renderEdit();
}
