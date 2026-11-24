const API = window.location.origin + '/api';

const app = document.querySelector('#app');

const params = new URLSearchParams(location.search);

const adminToken = params.get('admin');

const participantToken = params.get('p');

const eventSlug =

  params.get('event') ||

  location.pathname.split('/').filter(Boolean).pop();

const state = {

  name: '',

  wish: '',

  exclusions: [],

  participants: [],

  joined: null,

  event: null

};

let revealTimer = null;

// ============================================================

// ICONS

// ============================================================

function icon(name, cls = 'w-5 h-5') {

  const paths = {

    arrow: 'M5 12h14m-6-6 6 6-6 6',

    gift:

      'M20 12v10H4V12m16 0H4m16 0V8H4v4m8-4v14M8 8a3 3 0 1 1 0-6c2 0 4 6 4 6m4 0a3 3 0 1 0 0-6c-2 0-4 6-4 6',

    lock:

      'M7 10V7a5 5 0 0 1 10 0v3m-12 0h14v10H5V10z',

    edit:

      'M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4L16.5 3.5z',

    eye:

      'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',

    copy:

      'M9 9h10v10H9zM5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1',

    check:

      'M20 6 9 17l-5-5',

    spark:

      'M12 3l1.2 5.8L19 10l-5.8 1.2L12 17l-1.2-5.8L5 10l5.8-1.2L12 3z'

  };

  return `

    <svg

      class="${cls}"

      fill="none"

      stroke="currentColor"

      stroke-width="1.8"

      stroke-linecap="round"

      stroke-linejoin="round"

      viewBox="0 0 24 24"

      aria-hidden="true"

    >

      <path d="${paths[name] || paths.spark}"/>

    </svg>

  `;

}

// ============================================================

// HELPERS

// ============================================================

function esc(value = '') {

  return String(value).replace(

    /[&<>'"]/g,

    c => ({

      '&': '&amp;',

      '<': '&lt;',

      '>': '&gt;',

      "'": '&#39;',

      '"': '&quot;'

    })[c]

  );

}

async function getJson(url, options = {}) {

  const response = await fetch(url, options);

  let data = {};

  try {

    data = await response.json();

  } catch {

    data = {

      ok: false,

      error: 'Ungültige Serverantwort.'

    };

  }

  return {

    response,

    data

  };

}

function shell(content, title = 'Wichteln') {

  document.title = title;

  app.innerHTML = `

    <div class="snow" aria-hidden="true">

      <span>✦</span>

      <span>❄</span>

      <span>✧</span>

      <span>❄</span>

      <span>✦</span>

    </div>

    <main class="relative min-h-screen px-4 py-6 sm:py-10">

      <div class="mx-auto max-w-2xl">

        ${content}

      </div>

    </main>

  `;

}

function header(sub = '') {

  return `

    <div class="mb-7 flex items-center justify-between">

      <div class="flex items-center gap-3">

        <div class="grid h-11 w-11 place-items-center rounded-2xl bg-pine text-2xl text-white shadow-lg">

          🎁

        </div>

        <div>

          <div class="font-bold tracking-tight text-pine">

            Wichteln

          </div>

          <div class="text-xs text-slate-500">

            ${esc(sub)}

          </div>

        </div>

      </div>

    </div>

  `;

}

function button(label, action, primary = true, id = '') {

  return `

    <button

      ${id ? `id="${id}"` : ''}

      type="button"

      data-action="${action}"

      class="btn inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-bold ${

        primary

          ? 'bg-pine text-white shadow-lg shadow-pine/15 hover:bg-pine2'

          : 'bg-white/70 text-pine ring-1 ring-black/5 hover:bg-white'

      }"

    >

      ${label}

    </button>

  `;

}

function progress(n) {

  return `

    <div class="mb-7 flex gap-2">

      ${[1, 2, 3]

        .map(

          i => `

            <div

              class="progress-dot flex-1 ${

                i < n ? 'done' : i === n ? 'active' : ''

              }"

            ></div>

          `

        )

        .join('')}

    </div>

  `;

}

// ============================================================

// EVENTS – ZENTRALER EVENT HANDLER

// ============================================================

function bindActions() {

  document.querySelectorAll('[data-action]').forEach(button => {

    button.addEventListener('click', async () => {

      const action = button.dataset.action;

      switch (action) {

        case 'nextName':

          nextName();

          break;

        case 'renderIntro':

          renderIntro();

          break;

        case 'renderWish':

          renderWish();

          break;

        case 'saveWish':

          await saveWish();

          break;

        case 'joinNow':

          await joinNow();

          break;

        case 'copyLink':

          await copyLink();

          break;

        case 'editParticipant':

          await editParticipant();

          break;

        case 'saveEdit':

          await saveEdit();

          break;

        case 'renderResult':

          renderResult();

          break;

        case 'skipReveal':

          skipReveal();

          break;

        case 'createEvent':

          await createEvent();

          break;

        case 'startDraw':

          await startDraw();

          break;

        case 'showAssignments':

          await showAssignments();

          break;

        case 'copyPublicLink':

          await copyPublicLink();

          break;

        case 'copyOrganizerParticipantLink':

          await copyOrganizerParticipantLink();

          break;

      }

    });

  });

}

// ============================================================

// TEILNEHMER – EINLADUNG

// ============================================================

function renderJoin() {

  shell(`

    ${header('Deine Einladung')}

    <div class="card glass overflow-hidden">

      <div class="bg-pine px-6 pb-7 pt-8 text-white">

        <div class="mb-5 text-5xl">🎄</div>

        <h1 class="serif text-4xl leading-tight sm:text-5xl">

          Du bist eingeladen!

        </h1>

        <p class="mt-3 max-w-md text-sm leading-6 text-white/75">

          Schön, dass du beim Wichteln dabei bist.

          Wir machen es ganz einfach.

        </p>

      </div>

      <div class="p-6 sm:p-8">

        ${progress(1)}

        <label class="mb-2 block text-sm font-bold text-pine">

          Wie heißt du?

        </label>

        <input

          id="name"

          autofocus

          autocomplete="name"

          value="${esc(state.name)}"

          class="w-full rounded-2xl border-0 bg-white px-4 py-4 text-lg shadow-sm ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-gold"

          placeholder="Dein Name"

        />

        <div class="mt-5">

          ${button(

            `${icon('arrow', 'w-4 h-4')} Weiter`,

            'nextName'

          )}

        </div>

      </div>

    </div>

  `);

  bindActions();

}

function nextName() {

  const value =

    document.querySelector('#name')?.value.trim() || '';

  if (!value) {

    alert('Bitte gib deinen Namen ein.');

    return;

  }

  state.name = value;

  renderIntro();

}

// ============================================================

// INTRO

// ============================================================

function renderIntro() {

  shell(`

    ${header('Hallo ' + state.name)}

    <div class="card glass p-6 sm:p-8">

      <div class="mb-5 text-5xl">✨</div>

      <h1 class="serif text-4xl text-pine">

        Hallo ${esc(state.name)}!

      </h1>

      <p class="mt-4 leading-7 text-slate-600">

        Schön, dass du dabei bist.

        Dein Wichtel wartet schon auf dich. 🎁

      </p>

      <div class="my-7 rounded-2xl bg-cream p-5">

        <div class="font-bold text-pine">

          So funktioniert's

        </div>

        <p class="mt-2 text-sm leading-6 text-slate-600">

          Du hinterlässt einen Wunsch und kannst Personen

          ausschließen. Später wird dir zufällig jemand

          zugeteilt.

        </p>

      </div>

      ${button(

        `${icon('arrow', 'w-4 h-4')} Weiter`,

        'renderWish'

      )}

    </div>

  `);

  bindActions();

}

// ============================================================

// WUNSCH

// ============================================================

function renderWish() {

  shell(`

    ${header('Schritt 2 von 3')}

    ${progress(2)}

    <div class="card glass p-6 sm:p-8">

      <div class="mb-5 text-5xl">🎁</div>

      <h1 class="serif text-4xl text-pine">

        Was könnte dein Wichtel dir schenken?

      </h1>

      <p class="mt-3 text-sm leading-6 text-slate-600">

        Ganz konkret oder nur eine kleine Idee.

        Du kannst das später jederzeit ändern.

      </p>

      <textarea

        id="wish"

        rows="5"

        class="mt-6 w-full resize-none rounded-2xl border-0 bg-white p-4 shadow-sm ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-gold"

        placeholder="z. B. ein Buch, etwas zum Zeichnen, einen Gutschein …"

      >${esc(state.wish)}</textarea>

      <p class="mt-2 text-xs text-slate-400">

        Optional – keine Idee?

        Dann lass das Feld einfach leer.

      </p>

      <div class="mt-5 grid gap-3 sm:grid-cols-2">

        ${button(

          'Zurück',

          'renderIntro',

          false

        )}

        ${button(

          `${icon('arrow', 'w-4 h-4')} Weiter`,

          'saveWish'

        )}

      </div>

    </div>

  `);

  bindActions();

}

async function saveWish() {

  state.wish =

    document.querySelector('#wish')?.value.trim() || '';

  const success =

    await loadParticipants();

  if (!success) {

    return;

  }

  renderExclusions();

}

// ============================================================

// TEILNEHMER LADEN

// ============================================================

async function loadParticipants() {

  if (!eventSlug) {

    alert('Die Wichtelrunde wurde nicht gefunden.');

    return false;

  }

  try {

    const { response, data } =

      await getJson(

        `${API}/events/${encodeURIComponent(eventSlug)}`

      );

    if (!response.ok) {

      alert(

        data.error ||

        'Die Wichtelrunde konnte nicht geladen werden.'

      );

      return false;

    }

    state.event = data;

    state.participants =

      data.participants || [];

    return true;

  } catch (error) {

    alert(

      `Fehler beim Laden der Wichtelrunde.\n\n${error.message}`

    );

    return false;

  }

}

// ============================================================

// AUSSCHLÜSSE

// ============================================================

function renderExclusions() {

  shell(`

    ${header('Schritt 3 von 3')}

    ${progress(3)}

    <div class="card glass p-6 sm:p-8">

      <div class="mb-5 text-5xl">🚫</div>

      <h1 class="serif text-4xl text-pine">

        Gibt es jemanden, den du nicht ziehen möchtest?

      </h1>

      <p class="mt-3 text-sm leading-6 text-slate-600">

        Du musst niemanden ausschließen.

        Du kannst deine Auswahl später noch ändern.

      </p>

      <div class="mt-6 space-y-2">

        ${

          state.participants.length

            ? state.participants

                .map(

                  p => `

                    <label

                      class="flex cursor-pointer items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-black/5"

                    >

                      <span class="font-semibold text-pine">

                        ${esc(p.name)}

                      </span>

                      <input

                        type="checkbox"

                        value="${esc(p.id)}"

                        ${

                          state.exclusions.includes(p.id)

                            ? 'checked'

                            : ''

                        }

                        class="h-5 w-5 accent-pine"

                      />

                    </label>

                  `

                )

                .join('')

            : `

              <div class="rounded-2xl bg-cream p-4 text-sm text-slate-600">

                Weitere Teilnehmer erscheinen hier,

                sobald sie sich angemeldet haben.

              </div>

            `

        }

      </div>

      <div class="mt-5 grid gap-3 sm:grid-cols-2">

        ${button(

          'Zurück',

          'renderWish',

          false

        )}

        ${button(

          `${icon('check', 'w-4 h-4')} Teilnahme bestätigen`,

          'joinNow'

        )}

      </div>

    </div>

  `);

  bindActions();

}

// ============================================================

// TEILNAHME ABSCHLIESSEN

// ============================================================

async function joinNow() {

  state.exclusions = [

    ...document.querySelectorAll(

      '#app input[type="checkbox"]:checked'

    )

  ].map(input => input.value);

  try {

    const { response, data } =

      await getJson(

        `${API}/events/${encodeURIComponent(eventSlug)}/join`,

        {

          method: 'POST',

          headers: {

            'content-type': 'application/json'

          },

          body: JSON.stringify({

            name: state.name,

            wish: state.wish,

            exclusions: state.exclusions

          })

        }

      );

    if (!response.ok) {

      alert(

        data.error ||

        'Die Teilnahme konnte nicht gespeichert werden.'

      );

      return;

    }

    state.joined = {

      status: 'open',

      participant: {

        id: data.participantId,

        name: state.name,

        wish: state.wish,

        exclusions: state.exclusions

      },

      participants: state.participants,

      assignment: null

    };

    history.replaceState(

      {},

      '',

      `?p=${encodeURIComponent(data.token)}`

    );

    localStorage.setItem(

      'wichteln-token',

      data.token

    );

    renderJoined();

  } catch (error) {

    alert(

      `Verbindung zur Wichtel-App fehlgeschlagen.\n\n${error.message}`

    );

  }

}

// ============================================================

// TEILNAHME BESTÄTIGT

// ============================================================

function renderJoined() {

  shell(`

    ${header('Du bist dabei!')}

    <div class="card glass p-6 sm:p-8">

      <div class="mb-5 text-5xl">🎉</div>

      <h1 class="serif text-4xl text-pine">

        Alles bereit!

      </h1>

      <p class="mt-3 leading-7 text-slate-600">

        Bewahre deinen persönlichen Link gut auf.

        Hier kannst du deine Angaben später ändern

        und erfährst nach der Auslosung,

        wen du beschenkst.

      </p>

      <div class="mt-6 rounded-2xl bg-cream p-5">

        <div class="text-xs font-bold uppercase tracking-wider text-slate-500">

          Deine Angaben

        </div>

        <div class="mt-3 space-y-2 text-sm">

          <div>

            <b>Name:</b>

            ${esc(state.name)}

          </div>

          <div>

            <b>Wunsch:</b>

            ${esc(

              state.wish || 'Noch kein Wunsch'

            )}

          </div>

        </div>

      </div>

      <div class="mt-5">

        ${button(

          `${icon('edit', 'w-4 h-4')} Angaben bearbeiten`,

          'editParticipant',

          false

        )}

      </div>

      <div class="mt-3">

        ${button(

          `${icon('copy', 'w-4 h-4')} Persönlichen Link kopieren`,

          'copyLink'

        )}

      </div>

      <p class="mt-3 text-center text-xs text-slate-400">

        Dein persönlicher Link bleibt auch

        nach der Auslosung gültig.

      </p>

    </div>

  `);

  bindActions();

}

// ============================================================

// CLIPBOARD

// ============================================================

async function copyText(text, successMessage) {

  try {

    if (

      navigator.clipboard &&

      window.isSecureContext

    ) {

      await navigator.clipboard.writeText(text);

      alert(successMessage);

      return;

    }

    const textarea =

      document.createElement('textarea');

    textarea.value = text;

    textarea.style.position = 'fixed';

    textarea.style.opacity = '0';

    document.body.appendChild(textarea);

    textarea.focus();

    textarea.select();

    const copied =

      document.execCommand('copy');

    textarea.remove();

    if (copied) {

      alert(successMessage);

      return;

    }

    throw new Error('Kopieren fehlgeschlagen.');

  } catch {

    alert(

      `Der Link konnte nicht automatisch kopiert werden.\n\n${text}`

    );

  }

}

async function copyLink() {

  await copyText(

    location.href,

    'Persönlicher Link kopiert!'

  );

}

// ============================================================

// PERSÖNLICHE DATEN LADEN

// ============================================================

async function loadParticipant(token) {

  if (!token) {

    alert('Kein persönlicher Link vorhanden.');

    return false;

  }

  try {

    const { response, data } =

      await getJson(

        `${API}/p/${encodeURIComponent(token)}`

      );

    if (!response.ok) {

      alert(

        data.error ||

        'Persönlicher Link ungültig.'

      );

      return false;

    }

    state.joined = data;

    state.name =

      data.participant?.name || '';

    state.wish =

      data.participant?.wish || '';

    state.exclusions =

      data.participant?.exclusions || [];

    state.participants =

      data.participants || [];

    return true;

  } catch (error) {

    alert(

      `Der persönliche Link konnte nicht geladen werden.\n\n${error.message}`

    );

    return false;

  }

}

async function editParticipant() {

  const success =

    await loadParticipant(participantToken);

  if (!success) {

    return;

  }

  renderEdit();

}

// ============================================================

// DATEN BEARBEITEN

// ============================================================

function renderEdit() {

  if (!state.joined) {

    return renderJoin();

  }

  const locked =

    state.joined.status === 'started';

  const currentId =

    state.joined.participant?.id;

  shell(`

    ${header(

      locked

        ? 'Auslosung gestartet'

        : 'Angaben bearbeiten'

    )}

    <div class="card glass p-6 sm:p-8">

      <div class="flex items-start justify-between gap-4">

        <div>

          <div class="mb-3 text-4xl">

            ${locked ? '🔒' : '✏️'}

          </div>

          <h1 class="serif text-3xl text-pine">

            Deine Angaben

          </h1>

        </div>

        ${

          locked

            ? `

              <span class="rounded-full bg-pine/10 px-3 py-1 text-xs font-bold text-pine">

                Gesperrt

              </span>

            `

            : ''

        }

      </div>

      <p class="mt-3 text-sm leading-6 text-slate-600">

        ${

          locked

            ? 'Die Auslosung wurde bereits durchgeführt. Deine Angaben können nicht mehr verändert werden.'

            : 'Du kannst alles bis zum Start der Auslosung ändern.'

        }

      </p>

      <label class="mt-6 block text-sm font-bold text-pine">

        Name

      </label>

      <input

        id="editName"

        ${locked ? 'disabled' : ''}

        value="${esc(state.name)}"

        class="mt-2 w-full rounded-2xl bg-white px-4 py-3 ring-1 ring-black/5 disabled:opacity-60"

      />

      <label class="mt-5 block text-sm font-bold text-pine">

        Wunsch / Geschenkidee

      </label>

      <textarea

        id="editWish"

        ${locked ? 'disabled' : ''}

        rows="4"

        class="mt-2 w-full resize-none rounded-2xl bg-white p-4 ring-1 ring-black/5 disabled:opacity-60"

      >${esc(state.wish)}</textarea>

      <div class="mt-5">

        <div class="text-sm font-bold text-pine">

          Ausschlüsse

        </div>

        <div class="mt-2 space-y-2">

          ${

            state.participants

              .filter(

                p => p.id !== currentId

              )

              .map(

                p => `

                  <label

                    class="flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-black/5 ${

                      locked ? 'opacity-60' : ''

                    }"

                  >

                    <span>

                      ${esc(p.name)}

                    </span>

                    <input

                      type="checkbox"

                      value="${esc(p.id)}"

                      ${

                        locked

                          ? 'disabled'

                          : ''

                      }

                      ${

                        state.exclusions.includes(p.id)

                          ? 'checked'

                          : ''

                      }

                      class="h-5 w-5 accent-pine"

                    />

                  </label>

                `

              )

              .join('')

          }

        </div>

      </div>

      ${

        locked

          ? `

            <div class="mt-6">

              ${button(

                'Zurück zur Zuordnung',

                'renderResult',

                false

              )}

            </div>

          `

          : `

            <div class="mt-6">

              ${button(

                `${icon('check', 'w-4 h-4')} Änderungen speichern`,

                'saveEdit'

              )}

            </div>

          `

      }

    </div>

  `);

  bindActions();

}

async function saveEdit() {

  if (

    !state.joined ||

    state.joined.status === 'started'

  ) {

    return;

  }

  const name =

    document

      .querySelector('#editName')

      ?.value

      .trim() || '';

  const wish =

    document

      .querySelector('#editWish')

      ?.value

      .trim() || '';

  if (!name) {

    alert('Bitte gib deinen Namen ein.');

    return;

  }

  const exclusions = [

    ...document.querySelectorAll(

      '#app input[type="checkbox"]:checked'

    )

  ].map(input => input.value);

  try {

    const { response, data } =

      await getJson(

        `${API}/p/${encodeURIComponent(participantToken)}`,

        {

          method: 'PUT',

          headers: {

            'content-type': 'application/json'

          },

          body: JSON.stringify({

            name,

            wish,

            exclusions

          })

        }

      );

    if (!response.ok) {

      alert(

        data.error ||

        'Speichern fehlgeschlagen.'

      );

      return;

    }

    const success =

      await loadParticipant(participantToken);

    if (!success) {

      return;

    }

    renderEdit();

  } catch (error) {

    alert(

      `Die Änderungen konnten nicht gespeichert werden.\n\n${error.message}`

    );

  }

}

// ============================================================

// AUSLOSUNGS-ANIMATION

// ============================================================

function wichtelAnimation() {

  if (revealTimer) {
    clearTimeout(revealTimer);
  }

  const REVEAL_GIF_DURATION = 10000;

  shell(`

    ${header('Deine Auslosung')}

    <div class="card glass p-6 sm:p-10 text-center">

      <div class="mx-auto max-w-md">

        <div class="mb-4 text-sm font-bold uppercase tracking-[.2em] text-gold">
          Ein kleiner Moment …
        </div>

        <div class="mx-auto flex h-64 w-64 items-center justify-center overflow-hidden rounded-3xl bg-white">

          <video
            id="revealVideo"
            src="./wichtel_white_fade.mp4"
            autoplay
            muted
            playsinline
            preload="auto"
            class="h-full w-full object-contain"
          ></video>

        </div>

        <h1 class="serif mt-5 text-3xl text-pine">
          Der Wichtel greift in den Sack …
        </h1>

        <p class="mt-3 text-xs text-slate-400">
          Dein Geschenkgeheimnis wird gleich gelüftet.
        </p>

        <div class="mt-5">
          ${button(
            'Überspringen',
            'skipReveal',
            false
          )}
        </div>

      </div>

    </div>

  `);

  bindActions();

  revealTimer = setTimeout(() => {
    renderResult();
  }, REVEAL_GIF_DURATION);
}


function skipReveal() {

  if (revealTimer) {

    clearTimeout(revealTimer);

    revealTimer = null;

  }

  renderResult();

}

// ============================================================

// ERGEBNIS

// ============================================================

function renderResult() {

  if (!state.joined) {

    return;

  }

  const assignment =

    state.joined.assignment;

  if (!assignment) {

    return renderEdit();

  }

  shell(`

    ${header('Dein Wichtel')}

    <div class="card glass overflow-hidden">

      <div class="bg-pine px-6 py-8 text-center text-white">

        <div class="text-5xl">🎁</div>

        <div class="mt-3 text-xs font-bold uppercase tracking-[.2em] text-gold">

          Du beschenkst

        </div>

        <h1 class="serif mt-2 text-5xl">

          ${esc(assignment.receiverName)}

        </h1>

      </div>

      <div class="p-6 sm:p-8">

        <div class="rounded-3xl bg-cream p-5">

          <div class="text-xs font-bold uppercase tracking-wider text-slate-500">

            Wunsch

          </div>

          <p class="mt-3 text-lg leading-7 text-pine">

            ${esc(

              assignment.receiverWish ||

              'Dieser Wichtel hat keinen Wunsch hinterlegt.'

            )}

          </p>

        </div>

        <div class="mt-5 rounded-2xl bg-pine/5 p-4 text-sm text-slate-600">

          🤫 Psst! Verrate niemandem, wen du bekommen hast.

        </div>

      </div>

    </div>

  `);

  bindActions();

}

// ============================================================

// TEILNEHMER INITIALISIEREN

// ============================================================

async function initParticipant() {

  const success =

    await loadParticipant(participantToken);

  if (!success) {

    return;

  }

  if (

    state.joined.status === 'started' &&

    state.joined.assignment

  ) {

    const key =

      'wichteln-revealed-' +

      participantToken;

    if (!localStorage.getItem(key)) {

      localStorage.setItem(key, '1');

      wichtelAnimation();

    } else {

      renderResult();

    }

    return;

  }

  renderEdit();

}

// ============================================================

// RUNDE ERSTELLEN

// ============================================================

async function createEvent() {

  const name =

    document

      .querySelector('#eventName')

      ?.value

      .trim() || '';

  const organizer =

    document

      .querySelector('#orgName')

      ?.value

      .trim() || '';

  const joinSelf =

    document

      .querySelector('#self')

      ?.checked || false;

  if (!name) {

    alert(

      'Bitte gib einen Namen für die Wichtelrunde ein.'

    );

    return;

  }

  if (joinSelf && !organizer) {

    alert(

      'Bitte gib deinen Namen als Organisator ein.'

    );

    return;

  }

  try {

    const { response, data } =

      await getJson(

        `${API}/events`,

        {

          method: 'POST',

          headers: {

            'content-type':

              'application/json'

          },

          body: JSON.stringify({

            name,

            organizer,

            joinSelf

          })

        }

      );

    if (!response.ok) {

      alert(

        `Serverfehler (${response.status}): ${

          data.error ||

          'Keine gültige Antwort vom Server.'

        }`

      );

      return;

    }

    if (!data.adminToken) {

      alert(

        'Die Runde wurde erstellt, aber kein Organisator-Link wurde zurückgegeben.'

      );

      return;

    }

    localStorage.setItem(

      'wichteln-admin-token',

      data.adminToken

    );

    if (data.organizerParticipantToken) {

      localStorage.setItem(

        'wichteln-organizer-participant-token',

        data.organizerParticipantToken

      );

    }

    history.replaceState(

      {},

      '',

      `?admin=${encodeURIComponent(data.adminToken)}`

    );

    location.reload();

  } catch (error) {

    alert(

      `Verbindung zur Wichtel-App fehlgeschlagen.\n\n${error.message}`

    );

  }

}

// ============================================================

// ORGANISATOR

// ============================================================

async function adminLoad() {

  if (!adminToken) {

    return false;

  }

  try {

    const { response, data } =

      await getJson(

        `${API}/admin/${encodeURIComponent(adminToken)}`

      );

    if (!response.ok) {

      alert(

        data.error ||

        'Organisator-Link ungültig.'

      );

      return false;

    }

    state.event = data;

    return true;

  } catch (error) {

    alert(

      `Das Organisator-Dashboard konnte nicht geladen werden.\n\n${error.message}`

    );

    return false;

  }

}

async function renderAdmin() {

  const success =

    await adminLoad();

  if (!success) {

    return;

  }

  const event =

    state.event;

  const started =

    event.status === 'started';

  shell(`

    ${header('Organisator')}

    <div class="card glass p-6 sm:p-8">

      <div class="flex items-start justify-between gap-4">

        <div>

          <div class="text-4xl">

            🎄

          </div>

          <h1 class="serif mt-3 text-4xl text-pine">

            ${esc(event.name)}

          </h1>

          <p class="mt-2 text-sm text-slate-500">

            ${event.participants.length} Teilnehmer

          </p>

        </div>

        <span

          class="rounded-full px-3 py-1 text-xs font-bold ${

            started

              ? 'bg-gold/20 text-pine'

              : 'bg-pine/10 text-pine'

          }"

        >

          ${

            started

              ? 'Ausgelost'

              : 'Anmeldung offen'

          }

        </span>

      </div>

      <div class="mt-7 space-y-3">

        ${

          event.participants.length

            ? event.participants

                .map(

                  participant => `

                    <div class="rounded-2xl bg-white px-4 py-4 ring-1 ring-black/5">

                      <div class="flex items-center justify-between">

                        <div class="min-w-0">

                          <div class="font-bold text-pine">

                            ${esc(participant.name)}

                          </div>

                          <div class="mt-1 break-words text-xs text-slate-500">

                            ${

                              participant.wish

                                ? esc(participant.wish)

                                : 'Kein Wunsch hinterlegt'

                            }

                            ·

                            ${participant.exclusionsCount}

                            Ausschlüsse

                          </div>

                        </div>

                        <div class="ml-3 text-xl">

                          ${participant.joined ? '✓' : '…'}

                        </div>

                      </div>

                    </div>

                  `

                )

                .join('')

            : `

              <div class="rounded-2xl bg-cream p-5 text-sm text-slate-600">

                Noch keine Teilnehmer.

              </div>

            `

        }

      </div>

      <div class="mt-6 grid gap-3">

        ${

          !started

            ? button(

                `${icon(

                  'spark',

                  'w-4 h-4'

                )} Wichteln starten`,

                'startDraw'

              )

            : button(

                `${icon(

                  'eye',

                  'w-4 h-4'

                )} Zuordnungen anzeigen`,

                'showAssignments',

                false

              )

        }

        ${button(

          `${icon(

            'copy',

            'w-4 h-4'

          )} Teilnehmer-Link kopieren`,

          'copyPublicLink',

          false

        )}

        ${

          localStorage.getItem(

            'wichteln-organizer-participant-token'

          )

            ? button(

                `${icon(

                  'gift',

                  'w-4 h-4'

                )} Mein persönlicher Wichtel-Link`,

                'copyOrganizerParticipantLink',

                false

              )

            : ''

        }

      </div>

      <div

        id="assignments"

        class="mt-4"

      ></div>

    </div>

  `);

  bindActions();

}

// ============================================================

// AUSLOSUNG STARTEN

// ============================================================

async function startDraw() {

  if (

    !confirm(

      'Auslosung jetzt starten?\n\nDanach können Teilnehmer ihre Angaben nicht mehr ändern.'

    )

  ) {

    return;

  }

  try {

    const { response, data } =

      await getJson(

        `${API}/admin/${encodeURIComponent(adminToken)}/start`,

        {

          method: 'POST'

        }

      );

    if (!response.ok) {

      alert(

        data.error ||

        'Keine gültige Zuordnung gefunden.'

      );

      return;

    }

    await renderAdmin();

  } catch (error) {

    alert(

      `Die Auslosung konnte nicht gestartet werden.\n\n${error.message}`

    );

  }

}

// ============================================================

// ZUORDNUNGEN ANZEIGEN

// ============================================================

async function showAssignments() {

  if (

    !confirm(

      'Möchtest du wirklich alle Wichtel-Zuordnungen anzeigen?\n\nDiese Ansicht ist vertraulich.'

    )

  ) {

    return;

  }

  try {

    const { response, data } =

      await getJson(

        `${API}/admin/${encodeURIComponent(adminToken)}/assignments`

      );

    if (!response.ok) {

      alert(

        data.error ||

        'Fehler beim Laden der Zuordnungen.'

      );

      return;

    }

    const target =

      document.querySelector('#assignments');

    if (!target) {

      return;

    }

    target.innerHTML = `

      <div class="rounded-3xl bg-pine p-5 text-white">

        <div class="text-xs font-bold uppercase tracking-wider text-gold">

          Vertraulich

        </div>

        <div class="mt-3 space-y-2">

          ${

            data.assignments?.length

              ? data.assignments

                  .map(

                    assignment => `

                      <div class="flex items-center justify-between gap-3 rounded-xl bg-white/10 px-3 py-3 text-sm">

                        <span class="min-w-0 break-words">

                          ${esc(assignment.giverName)}

                        </span>

                        <span>

                          →

                        </span>

                        <b class="min-w-0 break-words text-right">

                          ${esc(assignment.receiverName)}

                        </b>

                      </div>

                    `

                  )

                  .join('')

              : `

                <div class="text-sm text-white/70">

                  Keine Zuordnungen vorhanden.

                </div>

              `

          }

        </div>

      </div>

    `;

  } catch (error) {

    alert(

      `Die Zuordnungen konnten nicht geladen werden.\n\n${error.message}`

    );

  }

}

// ============================================================

// LINKS

// ============================================================

async function copyOrganizerParticipantLink() {

  const token =

    localStorage.getItem(

      'wichteln-organizer-participant-token'

    );

  if (!token) {

    alert(

      'Kein persönlicher Teilnehmer-Link gespeichert.'

    );

    return;

  }

  await copyText(

    location.origin +

      `?p=${encodeURIComponent(token)}`,

    'Dein persönlicher Wichtel-Link wurde kopiert!'

  );

}

async function copyPublicLink() {

  if (!state.event?.slug) {

    alert(

      'Der Teilnehmer-Link ist momentan nicht verfügbar.'

    );

    return;

  }

  await copyText(

    location.origin +

      `?event=${encodeURIComponent(state.event.slug)}`,

    'Teilnehmer-Link kopiert!'

  );

}

// ============================================================

// STARTSEITE

// ============================================================

function renderHome() {

  shell(`

    ${header('Deine Wichtelrunde')}

    <div class="card glass p-6 sm:p-8">

      <div class="mb-6 text-6xl">

        🎁

      </div>

      <h1 class="serif text-4xl text-pine">

        Eine kleine Runde Wichtelglück.

      </h1>

      <p class="mt-3 leading-7 text-slate-600">

        Erstelle eine Runde, verschicke nur einen Link

        und lass die App den Rest erledigen.

      </p>

      <div class="mt-7 space-y-4">

        <input

          id="eventName"

          autocomplete="off"

          class="w-full rounded-2xl bg-white px-4 py-4 ring-1 ring-black/5"

          placeholder="Name der Wichtelrunde, z. B. Weihnachten 2026"

        />

        <input

          id="orgName"

          autocomplete="name"

          class="w-full rounded-2xl bg-white px-4 py-4 ring-1 ring-black/5"

          placeholder="Dein Name als Organisator"

        />

        <label class="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-black/5">

          <input

            id="self"

            type="checkbox"

            checked

            class="h-5 w-5 accent-pine"

          />

          <span class="text-sm font-semibold text-pine">

            Ich nehme selbst am Wichteln teil

          </span>

        </label>

        ${button(

          `${icon(

            'spark',

            'w-4 h-4'

          )} Wichtelrunde erstellen`,

          'createEvent'

        )}

      </div>

    </div>

  `);

  bindActions();

}

// ============================================================

// SERVICE WORKER

// ============================================================

if ('serviceWorker' in navigator) {

  navigator.serviceWorker

    .register('/sw.js')

    .catch(() => {});

}

// ============================================================

// ROUTING

// ============================================================

if (adminToken) {

  renderAdmin();

} else if (participantToken) {

  initParticipant();

} else if (

  params.has('event') ||

  (

    eventSlug &&

    eventSlug !== 'wichteln'

  )

) {

  renderJoin();

} else {

  renderHome();

}
