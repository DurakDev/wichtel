import { showMessage } from './js/shared.js';

const params = new URLSearchParams(window.location.search);
const adminToken = params.get('admin');
const app = document.querySelector('#app');

if (adminToken && app) {
  const addDeleteButton = () => {
    const dashboard = app.querySelector('.card.glass');
    if (!dashboard || !app.textContent.includes('Organisator') || dashboard.querySelector('[data-delete-event]')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.deleteEvent = '';
    button.className = 'btn mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3.5 text-sm font-bold text-white shadow hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2';
    button.textContent = 'Wichtelaktion löschen';
    button.addEventListener('click', deleteEvent);
    dashboard.append(button);
  };

  async function deleteEvent() {
    const confirmed = window.confirm(
      'Möchtest du diese Wichtelaktion wirklich endgültig löschen?\n\n' +
      'Die Aktion, alle Teilnehmer, Auslosungen und Verknüpfungen werden unwiderruflich gelöscht.'
    );
    if (!confirmed) return;

    try {
      const response = await fetch(`${window.location.origin}/api/admin/${encodeURIComponent(adminToken)}`, {
        method: 'DELETE'
      });
      let data = {};
      try { data = await response.json(); } catch { /* use fallback below */ }
      if (!response.ok) {
        showMessage(data.error || 'Die Wichtelaktion konnte nicht gelöscht werden.');
        return;
      }

      localStorage.removeItem('wichteln-admin-token');
      localStorage.removeItem('wichteln-organizer-participant-token');
      showMessage(data.message || 'Die Wichtelaktion wurde gelöscht.', 'success');
      history.replaceState({}, '', '/');
      window.setTimeout(() => window.location.assign('/'), 1200);
    } catch (error) {
      showMessage(`Die Wichtelaktion konnte nicht gelöscht werden. ${error.message}`);
    }
  }

  new MutationObserver(addDeleteButton).observe(app, { childList: true, subtree: true });
  addDeleteButton();
}
