import { API, adminToken, state } from './shared.js';
import { button, copyText, esc, getJson, header, icon, shell } from './shared.js';

export async function createEvent() {
  const name = document.querySelector('#eventName')?.value.trim() || '', organizer = document.querySelector('#orgName')?.value.trim() || '', joinSelf = document.querySelector('#self')?.checked || false;
  if (!name) return alert('Bitte gib einen Namen für die Wichtelrunde ein.');
  if (joinSelf && !organizer) return alert('Bitte gib deinen Namen als Organisator ein.');
  try {
    const { response, data } = await getJson(`${API}/events`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, organizer, joinSelf }) });
    if (!response.ok) return alert(`Serverfehler (${response.status}): ${data.error || 'Keine gültige Antwort vom Server.'}`);
    if (!data.adminToken) return alert('Die Runde wurde erstellt, aber kein Organisator-Link wurde zurückgegeben.');
    localStorage.setItem('wichteln-admin-token', data.adminToken);
    if (data.organizerParticipantToken) localStorage.setItem('wichteln-organizer-participant-token', data.organizerParticipantToken);
    history.replaceState({}, '', `?admin=${encodeURIComponent(data.adminToken)}`); location.reload();
  } catch (error) { alert(`Verbindung zur Wichtel-App fehlgeschlagen.\n\n${error.message}`); }
}

export async function adminLoad() {
  if (!adminToken) return false;
  try {
    const { response, data } = await getJson(`${API}/admin/${encodeURIComponent(adminToken)}`);
    if (!response.ok) { alert(data.error || 'Organisator-Link ungültig.'); return false; }
    state.event = data; return true;
  } catch (error) { alert(`Das Organisator-Dashboard konnte nicht geladen werden.\n\n${error.message}`); return false; }
}

export async function renderAdmin() {
  if (!await adminLoad()) return;
  const event = state.event, started = event.status === 'started';
  const people = event.participants.length ? event.participants.map(p => `<div class="rounded-2xl bg-white px-4 py-4 ring-1 ring-black/5"><div class="flex items-center justify-between"><div class="min-w-0"><div class="font-bold text-pine">${esc(p.name)}</div><div class="mt-1 break-words text-xs text-slate-500">${p.wish ? esc(p.wish) : 'Kein Wunsch hinterlegt'} · ${p.exclusionsCount} Ausschlüsse</div></div><div class="ml-3 text-xl">${p.joined ? '✓' : '…'}</div></div></div>`).join('') : '<div class="rounded-2xl bg-cream p-5 text-sm text-slate-600">Noch keine Teilnehmer.</div>';
  const personalButton = localStorage.getItem('wichteln-organizer-participant-token') ? button(`${icon('gift', 'w-4 h-4')} Mein persönlicher Wichtel-Link`, 'copyOrganizerParticipantLink', false) : '';
  shell(`${header('Organisator')}<div class="card glass p-6 sm:p-8"><div class="flex items-start justify-between gap-4"><div><div class="text-4xl">🎄</div><h1 class="serif mt-3 text-4xl text-pine">${esc(event.name)}</h1><p class="mt-2 text-sm text-slate-500">${event.participants.length} Teilnehmer</p></div><span class="rounded-full px-3 py-1 text-xs font-bold ${started ? 'bg-gold/20 text-pine' : 'bg-pine/10 text-pine'}">${started ? 'Ausgelost' : 'Anmeldung offen'}</span></div><div class="mt-7 space-y-3">${people}</div><div class="mt-6 grid gap-3">${!started ? button(`${icon('spark', 'w-4 h-4')} Wichteln starten`, 'startDraw') : button(`${icon('eye', 'w-4 h-4')} Zuordnungen anzeigen`, 'showAssignments', false)}${button(`${icon('copy', 'w-4 h-4')} Teilnehmer-Link kopieren`, 'copyPublicLink', false)}${personalButton}</div><div id="assignments" class="mt-4"></div></div>`);
}

export async function startDraw() {
  if (!confirm('Auslosung jetzt starten?\n\nDanach können Teilnehmer ihre Angaben nicht mehr ändern.')) return;
  try {
    const { response, data } = await getJson(`${API}/admin/${encodeURIComponent(adminToken)}/start`, { method: 'POST' });
    if (!response.ok) { alert(data.error || 'Keine gültige Zuordnung gefunden.'); return; }
    await renderAdmin();
  } catch (error) { alert(`Die Auslosung konnte nicht gestartet werden.\n\n${error.message}`); }
}

export async function showAssignments() {
  if (!confirm('Möchtest du wirklich alle Wichtel-Zuordnungen anzeigen?\n\nDiese Ansicht ist vertraulich.')) return;
  try {
    const { response, data } = await getJson(`${API}/admin/${encodeURIComponent(adminToken)}/assignments`);
    if (!response.ok) { alert(data.error || 'Fehler beim Laden der Zuordnungen.'); return; }
    const target = document.querySelector('#assignments'); if (!target) return;
    const assignments = data.assignments?.length ? data.assignments.map(a => `<div class="flex items-center justify-between gap-3 rounded-xl bg-white/10 px-3 py-3 text-sm"><span class="min-w-0 break-words">${esc(a.giverName)}</span><span>→</span><b class="min-w-0 break-words text-right">${esc(a.receiverName)}</b></div>`).join('') : '<div class="text-sm text-white/70">Keine Zuordnungen vorhanden.</div>';
    target.innerHTML = `<div class="rounded-3xl bg-pine p-5 text-white"><div class="text-xs font-bold uppercase tracking-wider text-gold">Vertraulich</div><div class="mt-3 space-y-2">${assignments}</div></div>`;
  } catch (error) { alert(`Die Zuordnungen konnten nicht geladen werden.\n\n${error.message}`); }
}

export async function copyOrganizerParticipantLink() {
  const token = localStorage.getItem('wichteln-organizer-participant-token');
  if (!token) { alert('Kein persönlicher Teilnehmer-Link gespeichert.'); return; }
  await copyText(location.origin + `?p=${encodeURIComponent(token)}`, 'Dein persönlicher Wichtel-Link wurde kopiert!');
}

export async function copyPublicLink() {
  if (!state.event?.slug) { alert('Der Teilnehmer-Link ist momentan nicht verfügbar.'); return; }
  await copyText(location.origin + `?event=${encodeURIComponent(state.event.slug)}`, 'Teilnehmer-Link kopiert!');
}

export function renderHome() {
  shell(`${header('Deine Wichtelrunde')}<div class="card glass p-6 sm:p-8"><div class="mb-6 text-6xl">🎁</div><h1 class="serif text-4xl text-pine">Eine kleine Runde Wichtelglück.</h1><p class="mt-3 leading-7 text-slate-600">Erstelle eine Runde, verschicke nur einen Link und lass die App den Rest erledigen.</p><div class="mt-7 space-y-4"><input id="eventName" autocomplete="off" class="w-full rounded-2xl bg-white px-4 py-4 ring-1 ring-black/5" placeholder="Name der Wichtelrunde, z. B. Weihnachten 2026"/><input id="orgName" autocomplete="name" class="w-full rounded-2xl bg-white px-4 py-4 ring-1 ring-black/5" placeholder="Dein Name als Organisator"/><label class="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-black/5"><input id="self" type="checkbox" checked class="h-5 w-5 accent-pine"/><span class="text-sm font-semibold text-pine">Ich nehme selbst am Wichteln teil</span></label>${button(`${icon('spark', 'w-4 h-4')} Wichtelrunde erstellen`, 'createEvent')}</div></div>`);
}
