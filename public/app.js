import { app, adminToken, params, participantToken, eventSlug } from './js/shared.js';
import { renderJoin, renderIntro, renderWish, nextName, saveWish, joinNow, copyLink } from './js/join.js';
import { editParticipant, saveEdit, renderResult, skipReveal, initParticipant } from './js/participant.js';
import { createEvent, startDraw, showAssignments, copyPublicLink, copyOrganizerParticipantLink, renderAdmin, renderHome } from './js/admin.js';

const actions = {
  nextName,
  renderIntro,
  renderWish,
  saveWish,
  joinNow,
  copyLink,
  editParticipant,
  saveEdit,
  renderResult,
  skipReveal,
  createEvent,
  startDraw,
  showAssignments,
  copyPublicLink,
  copyOrganizerParticipantLink,
};

app.addEventListener('click', event => {
  const target = event.target instanceof Element ? event.target.closest('[data-action]') : null;
  const action = target?.dataset.action;
  if (action && Object.hasOwn(actions, action)) actions[action]();
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
if (adminToken) renderAdmin();
else if (participantToken) initParticipant();
else if (params.has('event') || (eventSlug && eventSlug !== 'wichteln')) renderJoin();
else renderHome();
