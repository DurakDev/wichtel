import { API, eventSlug, state } from './shared.js';
import { button, copyText, esc, getJson, header, icon, progress, shell, showMessage } from './shared.js';

function keepJoinFormVisible() {
  const form = document.querySelector('#join-form');
  const field = form?.querySelector('input, textarea');
  const continueButton = form?.querySelector('button[data-action]');
  const viewport = window.visualViewport;
  if (!form || !field || !continueButton) return;

  let scrollTimer;
  const revealContinueButton = () => {
    window.clearTimeout(scrollTimer);
    scrollTimer = window.setTimeout(() => {
      if (document.activeElement === field) {
        continueButton.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }, 120);
  };
  field.addEventListener('focus', () => {
    revealContinueButton();
    viewport?.addEventListener('resize', revealContinueButton);
  });
  field.addEventListener('blur', () => {
    window.clearTimeout(scrollTimer);
    viewport?.removeEventListener('resize', revealContinueButton);
  });
}

export function renderJoin() {
  shell(`${header('Deine Einladung')}<div class="card glass overflow-hidden"><div class="bg-pine px-6 pb-7 pt-8 text-white"><div class="mb-5 text-5xl">🎄</div><h1 class="serif text-4xl leading-tight sm:text-5xl">Du bist eingeladen!</h1><p class="mt-3 max-w-md text-sm leading-6 text-white/75">Schön, dass du beim Wichteln dabei bist. Wir machen es ganz einfach.</p></div><div class="p-6 sm:p-8">${progress(1)}<div id="join-form" class="scroll-mt-4"><label class="mb-2 block text-sm font-bold text-pine">Wie heißt du?</label><input id="name" autocomplete="name" value="${esc(state.name)}" class="w-full rounded-2xl border-0 bg-white px-4 py-4 text-lg shadow-sm ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-gold" placeholder="Dein Name"/><div class="mt-5">${button(`${icon('arrow', 'w-4 h-4')} Weiter`, 'nextName')}</div></div></div></div>`);
  keepJoinFormVisible();
}

export function nextName() {
  const value = document.querySelector('#name')?.value.trim() || '';
  if (!value) return showMessage('Bitte gib deinen Namen ein.');
  state.name = value; renderWish();
}

export function renderWish() {
  shell(`${header('Hallo, ' + state.name + '!')}${progress(2)}<div class="card glass p-6 sm:p-8"><div class="mb-5 text-5xl">🎁</div><h1 class="serif text-4xl text-pine">Was könnte dein Wichtel dir schenken?</h1><p class="mt-3 text-sm leading-6 text-slate-600">Ganz konkret oder nur eine kleine Idee. Du kannst das später jederzeit ändern.</p><div id="join-form" class="scroll-mt-4"><textarea id="wish" rows="5" class="mt-6 w-full resize-none rounded-2xl border-0 bg-white p-4 shadow-sm ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-gold" placeholder="z. B. ein Buch, etwas zum Zeichnen, einen Gutschein …">${esc(state.wish)}</textarea><div class="mt-5 grid gap-3 sm:grid-cols-2">${button('Zurück', 'renderJoin', false)}${button(`${icon('arrow', 'w-4 h-4')} Weiter`, 'saveWish')}</div></div><p class="mt-2 text-xs text-slate-400">Optional – keine Idee? Dann lass das Feld einfach leer.</p></div>`);
  keepJoinFormVisible();
}

export async function saveWish() {
  state.wish = document.querySelector('#wish')?.value.trim() || '';
  if (await loadParticipants()) renderExclusions();
}

export async function loadParticipants() {
  if (!eventSlug) { showMessage('Die Wichtelrunde wurde nicht gefunden.'); return false; }
  try {
    const { response, data } = await getJson(`${API}/events/${encodeURIComponent(eventSlug)}`);
    if (!response.ok) { showMessage(data.error || 'Die Wichtelrunde konnte nicht geladen werden.'); return false; }
    state.event = data; state.participants = data.participants || []; return true;
  } catch (error) { showMessage(`Fehler beim Laden der Wichtelrunde. ${error.message}`); return false; }
}

export function renderExclusions() {
  const people = state.participants.length ? state.participants.map(p => `<label class="flex cursor-pointer items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-black/5"><span class="font-semibold text-pine">${esc(p.name)}</span><input type="checkbox" value="${esc(p.id)}" ${state.exclusions.includes(p.id) ? 'checked' : ''} class="h-5 w-5 accent-pine"/></label>`).join('') : '<div class="rounded-2xl bg-cream p-4 text-sm text-slate-600">Weitere Teilnehmer erscheinen hier, sobald sie sich angemeldet haben.</div>';
  shell(`${header('Schritt 3 von 3')}${progress(3)}<div class="card glass p-6 sm:p-8"><div class="mb-5 text-5xl">🚫</div><h1 class="serif text-4xl text-pine">Gibt es jemanden, den du nicht ziehen möchtest?</h1><p class="mt-3 text-sm leading-6 text-slate-600">Du musst niemanden ausschließen. Du kannst deine Auswahl später noch ändern.</p><div class="mt-6 space-y-2">${people}</div><div class="mt-5 grid gap-3 sm:grid-cols-2">${button('Zurück', 'renderWish', false)}${button(`${icon('check', 'w-4 h-4')} Teilnahme bestätigen`, 'joinNow')}</div></div>`);
}

export async function joinNow() {
  state.exclusions = [...document.querySelectorAll('#app input[type="checkbox"]:checked')].map(input => input.value);
  try {
    const { response, data } = await getJson(`${API}/events/${encodeURIComponent(eventSlug)}/join`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: state.name, wish: state.wish, exclusions: state.exclusions }) });
    if (!response.ok) return showMessage(data.error || 'Die Teilnahme konnte nicht gespeichert werden.');
    state.joined = { status: 'open', participant: { id: data.participantId, name: state.name, wish: state.wish, exclusions: state.exclusions }, participants: state.participants, assignment: null };
    history.replaceState({}, '', `?p=${encodeURIComponent(data.token)}`); localStorage.setItem('wichteln-token', data.token); renderJoined();
  } catch (error) { showMessage(`Verbindung zur Wichtel-App fehlgeschlagen. ${error.message}`); }
}

export function renderJoined() {
  const wish = state.wish.trim();
  shell(`${header('Du bist dabei!')}<div class="card glass p-6 sm:p-8"><div class="mb-5 text-5xl">🎉</div><h1 class="serif text-4xl text-pine">Hallo, ${esc(state.name)}!</h1><p class="mt-3 leading-7 text-slate-600">Schön, dass du beim Wichteln dabei bist.</p><div class="mt-6 rounded-2xl bg-cream p-5"><div class="text-xs font-bold uppercase tracking-wider text-slate-500">Dein Wunsch</div><p class="mt-3 text-sm ${wish ? 'font-semibold text-pine' : 'wish-missing'}">${esc(wish || 'Vergiss nicht, einen Wunsch zu nennen.')}</p></div><div class="mt-5">${button(`${icon('edit', 'w-4 h-4')} Angaben bearbeiten`, 'editParticipant', false)}</div><div class="mt-3">${button(`${icon('copy', 'w-4 h-4')} Persönlichen Link kopieren`, 'copyLink')}</div><p class="mt-3 text-center text-xs text-slate-400">Dein persönlicher Link bleibt auch nach der Auslosung gültig.</p></div>`);
}

export async function copyLink() { await copyText(location.href, 'Persönlicher Link kopiert!'); }
