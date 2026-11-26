import { API, participantToken, state } from './shared.js';
import { button, esc, getJson, header, icon, shell, showMessage } from './shared.js';
import { renderJoin } from './join.js';

let nameCycleTimer = null;

function stopNameCycle() {
  if (nameCycleTimer !== null) {
    clearInterval(nameCycleTimer);
    nameCycleTimer = null;
  }
}

function startNameCycle(carousel) {
  const nameElements = carousel?.querySelectorAll('.participant-name-carousel__name') || [];
  if (nameElements.length < 2) return;

  let activeIndex = 0;
  nameCycleTimer = setInterval(() => {
    nameElements[activeIndex].classList.remove('is-active');
    nameElements[activeIndex].setAttribute('aria-hidden', 'true');
    activeIndex = (activeIndex + 1) % nameElements.length;
    nameElements[activeIndex].classList.add('is-active');
    nameElements[activeIndex].setAttribute('aria-hidden', 'false');
  }, 2600);
}

function possibleRecipients() {
  const participants = state.joined?.participants || state.participants;
  const exclusions = new Set(state.joined?.participant?.exclusions || state.exclusions);
  const participantId = state.joined?.participant?.id;
  return participants.filter(person => person.id !== participantId && !exclusions.has(person.id));
}

function renderRecipientNames(recipients) {
  return recipients.map((person, index) => {
    const name = `<span class="participant-name-carousel__name${index === 0 ? ' is-active' : ''}" aria-hidden="${index !== 0}">${esc(person.name)}</span>`;
    const separator = index < recipients.length - 1
      ? '<span class="participant-name-carousel__name text-gold" aria-hidden="true">oder</span>'
      : '';
    return name + separator;
  }).join('');
}

function currentParticipantToken() {
  return new URLSearchParams(location.search).get('p') || participantToken;
}

export async function loadParticipant(token) {
  if (!token) { showMessage('Kein persönlicher Link vorhanden.'); return false; }
  try {
    const { response, data } = await getJson(`${API}/p/${encodeURIComponent(token)}`);
    if (!response.ok) { showMessage(data.error || 'Persönlicher Link ungültig.'); return false; }
    state.joined = data; state.name = data.participant?.name || ''; state.wish = data.participant?.wish || ''; state.exclusions = data.participant?.exclusions || []; state.participants = data.participants || []; return true;
  } catch (error) { showMessage(`Der persönliche Link konnte nicht geladen werden. ${error.message}`); return false; }
}

export async function editParticipant() { if (await loadParticipant(currentParticipantToken())) renderEdit(); }

export function renderParticipantHome() {
  if (!state.joined) return renderJoin();
  stopNameCycle();

  const wish = state.wish.trim();
  const started = state.joined.status === 'started';
  const statusLabel = started ? 'Ausgelost' : 'Anmeldung offen';
  const statusMessage = started
    ? 'Die Auslosung ist abgeschlossen. Du kannst jetzt sehen, wen du beschenkst.'
    : 'Bis zur Auslosung bleibt es spannend. Hier erfährst du später, wen du beschenken darfst. Solange der Status offen ist, kann sich die Teilnehmerzahl verändern.';
  const recipients = possibleRecipients();
  const names = recipients.length >= 2
    ? renderRecipientNames(recipients)
    : '';
  const animationBox = recipients.length >= 2
    ? `<div class="mt-5 rounded-2xl bg-pine px-5 py-5 text-center text-white"><p class="text-xs font-bold uppercase tracking-wider text-gold">Vielleicht ist es …</p><div class="participant-name-carousel mt-2" aria-label="Mögliche Wichtel" aria-live="off">${names}</div></div>`
    : '';

  shell(`${header('Schön, dass du dabei bist')}<div class="card glass p-6 sm:p-8"><div class="mb-5 flex items-center justify-between gap-3"><div class="text-5xl">🎁</div><span class="rounded-full px-3 py-1 text-xs font-bold ${started ? 'bg-gold/20 text-pine' : 'bg-pine/10 text-pine'}">${statusLabel}</span></div><p class="text-sm font-bold uppercase tracking-[.15em] text-gold">Die Vorfreude steigt</p><h1 class="serif mt-2 text-3xl leading-tight text-pine sm:text-4xl">Na ${esc(state.name)}, wen wirst du wohl ziehen?</h1>${animationBox}<p class="mt-4 text-center text-sm leading-6 text-slate-600">${statusMessage}</p><div class="mt-6 rounded-2xl bg-cream p-5"><div class="text-xs font-bold uppercase tracking-wider text-slate-500">Dein Wunsch</div><p class="mt-3 text-sm ${wish ? 'font-semibold text-pine' : 'wish-missing'}">${esc(wish || 'Vergiss nicht, einen Wunsch zu nennen.')}</p></div><div class="mt-5">${button(`${icon('edit', 'w-4 h-4')} Angaben ändern`, 'editParticipant', false)}</div><p class="mt-5 text-center text-xs text-slate-400">Solltest du deinen persönlichen Link verloren haben, hilft dir der Organisator jederzeit weiter.</p></div>`);

  startNameCycle(document.querySelector('.participant-name-carousel'));
}

export function renderEdit() {
  if (!state.joined) return renderJoin();
  stopNameCycle();
  const locked = state.joined.status === 'started', currentId = state.joined.participant?.id;
  const people = state.participants.filter(p => p.id !== currentId).map(p => `<label class="flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-black/5 ${locked ? 'opacity-60' : ''}"><span>${esc(p.name)}</span><input type="checkbox" value="${esc(p.id)}" ${locked ? 'disabled' : ''} ${state.exclusions.includes(p.id) ? 'checked' : ''} class="h-5 w-5 accent-pine"/></label>`).join('');
  shell(`${header(locked ? 'Auslosung gestartet' : 'Angaben bearbeiten')}<div class="card glass p-6 sm:p-8"><div class="flex items-start justify-between gap-4"><div><div class="mb-3 text-4xl">${locked ? '🔒' : '✏️'}</div><h1 class="serif text-3xl text-pine">Deine Angaben</h1></div>${locked ? '<span class="rounded-full bg-pine/10 px-3 py-1 text-xs font-bold text-pine">Gesperrt</span>' : ''}</div><p class="mt-3 text-sm leading-6 text-slate-600">${locked ? 'Die Auslosung wurde bereits durchgeführt. Deine Angaben können nicht mehr verändert werden.' : 'Du kannst alles bis zum Start der Auslosung ändern.'}</p><label class="mt-6 block text-sm font-bold text-pine">Name</label><input id="editName" ${locked ? 'disabled' : ''} value="${esc(state.name)}" class="mt-2 w-full rounded-2xl bg-white px-4 py-3 ring-1 ring-black/5 disabled:opacity-60"/><label class="mt-5 block text-sm font-bold text-pine">Wunsch / Geschenkidee</label><textarea id="editWish" ${locked ? 'disabled' : ''} rows="4" class="mt-2 w-full resize-none rounded-2xl bg-white p-4 ring-1 ring-black/5 disabled:opacity-60">${esc(state.wish)}</textarea><div class="mt-5"><div class="text-sm font-bold text-pine">Ausschlüsse</div><div class="mt-2 space-y-2">${people}</div></div>${locked ? `<div class="mt-6">${button('Zurück zur Zuordnung', 'renderResult', false)}</div>` : `<div class="mt-6"><div class="grid gap-3 sm:grid-cols-2">${button(`${icon('check', 'w-4 h-4')} Änderungen speichern`, 'saveEdit')}${button('Zurück zur Übersicht', 'showParticipantHome', false)}</div></div>`}</div>`);
}

export async function saveEdit() {
  if (!state.joined || state.joined.status === 'started') return;
  const token = currentParticipantToken();
  const name = document.querySelector('#editName')?.value.trim() || '', wish = document.querySelector('#editWish')?.value.trim() || '';
  if (!name) return showMessage('Bitte gib deinen Namen ein.');
  const exclusions = [...document.querySelectorAll('#app input[type="checkbox"]:checked')].map(input => input.value);
  try {
    const { response, data } = await getJson(`${API}/p/${encodeURIComponent(token)}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, wish, exclusions }) });
    if (!response.ok) return showMessage(data.error || 'Speichern fehlgeschlagen.');
    if (await loadParticipant(token)) {
      renderParticipantHome();
      showMessage('Änderungen gespeichert. Deine Angaben sind aktuell.', 'success');
    }
  } catch (error) { showMessage(`Die Änderungen konnten nicht gespeichert werden. ${error.message}`); }
}

export function markRevealSeen() {
  const token = currentParticipantToken();
  if (token) localStorage.setItem('wichteln-revealed-' + token, '1');
}

function revealAssignment() {
  const names = document.getElementById('revealNames');
  const question = document.getElementById('revealQuestion');
  const assignment = document.getElementById('revealedAssignment');
  markRevealSeen();
  stopNameCycle();

  if (!names || !assignment) {
    renderResult();
    return;
  }

  names.hidden = true;
  if (question) question.hidden = true;
  assignment.hidden = false;
}

export function wichtelAnimation() {
  stopNameCycle();
  const recipients = possibleRecipients();
  const names = renderRecipientNames(recipients);
  const assignment = state.joined?.assignment;
  const receiverWish = assignment?.receiverWish?.trim() || '';
  shell(`${header('Deine Auslosung')}<div class="card glass p-6 text-center sm:p-10"><div class="mx-auto max-w-md"><div class="mb-4 text-sm font-bold uppercase tracking-[.2em] text-gold">Ein kleiner Moment …</div><h1 class="serif text-3xl text-pine">Der Wichtel greift in seinen Sack</h1><div class="mx-auto mt-5 flex h-64 w-64 items-center justify-center overflow-hidden rounded-3xl bg-white"><video id="revealVideo" src="/wichtel_white_fade.mp4" autoplay muted playsinline preload="auto" class="h-full w-full object-contain"></video></div><p id="revealQuestion" class="mt-5 text-sm leading-6 text-slate-600">Welchen Namen wird der Wichtel wohl auf seinem Zettel stehen haben …</p><div id="revealNames" class="mt-4 rounded-2xl bg-pine px-5 py-5 text-center text-white"><div class="participant-name-carousel" aria-label="Mögliche Wichtel" aria-live="off">${names}</div></div><div id="revealedAssignment" hidden><div class="mt-5 rounded-2xl bg-pine px-5 py-5 text-center text-white"><div class="text-5xl">🎁</div><div class="mt-3 text-xs font-bold uppercase tracking-[.2em] text-gold">Du beschenkst</div><h2 class="serif mt-2 text-4xl">${esc(assignment?.receiverName || '')}</h2></div><div class="mt-5 rounded-3xl bg-cream p-5 text-left"><div class="text-xs font-bold uppercase tracking-wider text-slate-500">Wunsch</div><p class="mt-3 text-lg leading-7 ${receiverWish ? 'text-pine' : 'wish-missing'}">${esc(receiverWish || 'Hat leider keinen Wunsch genannt.')}</p></div><div class="mt-5 rounded-2xl bg-pine/5 p-4 text-sm text-slate-600">🤫 Psst! Verrate niemandem, wen du bekommen hast.</div></div></div></div>`);
  const video = document.getElementById('revealVideo');
  if (!video) { console.error('Das Auslosungsvideo wurde nicht gefunden.'); return; }
  video.addEventListener('ended', revealAssignment, { once: true });
  video.addEventListener('error', () => {
    console.error('Das Auslosungsvideo konnte nicht abgespielt werden.', video.error);
    revealAssignment();
  }, { once: true });
  startNameCycle(document.querySelector('#revealNames .participant-name-carousel'));
  video.play().catch(error => console.warn('Die automatische Wiedergabe des Auslosungsvideos wurde blockiert.', error));
}

export function skipReveal() { revealAssignment(); }

export function renderResult() {
  stopNameCycle();
  if (!state.joined) return;
  const assignment = state.joined.assignment; if (!assignment) return renderEdit();
  const receiverWish = assignment.receiverWish?.trim() || '';
  shell(`${header('Dein Wichtel')}<div class="card glass overflow-hidden"><div class="bg-pine px-6 py-8 text-center text-white"><div class="text-5xl">🎁</div><div class="mt-3 text-xs font-bold uppercase tracking-[.2em] text-gold">Du beschenkst</div><h1 class="serif mt-2 text-5xl">${esc(assignment.receiverName)}</h1></div><div class="p-6 sm:p-8"><div class="rounded-3xl bg-cream p-5"><div class="text-xs font-bold uppercase tracking-wider text-slate-500">Wunsch</div><p class="mt-3 text-lg leading-7 ${receiverWish ? 'text-pine' : 'wish-missing'}">${esc(receiverWish || 'Hat leider keinen Wunsch genannt.')}</p></div><div class="mt-5 rounded-2xl bg-pine/5 p-4 text-sm text-slate-600">🤫 Psst! Verrate niemandem, wen du bekommen hast.</div></div></div>`);
}

export async function initParticipant() {
  const token = currentParticipantToken();
  if (!await loadParticipant(token)) return;
  if (state.joined.status === 'started') {
    if (state.joined.assignment) {
      const key = 'wichteln-revealed-' + token;
      if (!localStorage.getItem(key)) wichtelAnimation(); else renderResult();
    } else {
      renderEdit();
    }
    return;
  }
  renderParticipantHome();
}
