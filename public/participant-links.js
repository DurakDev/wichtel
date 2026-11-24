const params = new URLSearchParams(window.location.search);
const adminToken = params.get('admin');
const app = document.querySelector('#app');

if (adminToken && app) {
  async function copyText(text, successMessage) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        window.alert(successMessage);
        return;
      }
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const copied = document.execCommand('copy');
      textarea.remove();
      if (copied) {
        window.alert(successMessage);
        return;
      }
      throw new Error('Kopieren fehlgeschlagen.');
    } catch {
      window.prompt('Persönlichen Teilnehmer-Link kopieren:', text);
    }
  }

  const addParticipantCopyButtons = () => {
    if (!app.textContent.includes('Organisator')) return;

    const cards = app.querySelectorAll('.rounded-2xl.bg-white.px-4.py-4.ring-1.ring-black\/5');
    cards.forEach((card) => {
      if (card.querySelector('[data-copy-participant-link]')) return;

      const nameElement = card.querySelector('.font-bold.text-pine');
      if (!nameElement) return;

      const participantName = nameElement.textContent.trim();
      const participantData = window.__participantCopyData?.find(
        (participant) => participant.name === participantName
      );
      if (!participantData?.personalToken) return;

      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.copyParticipantLink = participantData.personalToken;
      button.className = 'mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-pine/10 bg-cream px-3 py-2 text-xs font-bold text-pine hover:bg-white';
      button.innerHTML = 'Persönlichen Link kopieren';
      button.addEventListener('click', () => {
        const link = `${window.location.origin}?p=${encodeURIComponent(participantData.personalToken)}`;
        copyText(link, `Persönlicher Link für ${participantName} kopiert!`);
      });

      card.appendChild(button);
    });
  };

  const loadParticipantTokens = async () => {
    try {
      const response = await fetch(`${window.location.origin}/api/admin/${encodeURIComponent(adminToken)}`);
      const data = await response.json();
      if (!response.ok) return;
      window.__participantCopyData = data.participants || [];
      addParticipantCopyButtons();
    } catch {
      // The dashboard remains usable even if token data cannot be loaded.
    }
  };

  new MutationObserver(addParticipantCopyButtons).observe(app, { childList: true, subtree: true });
  loadParticipantTokens();
}
