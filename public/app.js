const API = window.location.origin + "/api";

// ============================================================
// WICHTELN – FRONTEND
// ============================================================

const app = document.querySelector("#app");

// ------------------------------------------------------------
// Hilfsfunktionen
// ------------------------------------------------------------

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getQuery(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function save(key, value) {
  localStorage.setItem(key, value);
}

function load(key) {
  return localStorage.getItem(key);
}

function clearQuery() {
  history.replaceState({}, "", window.location.pathname);
}

// ------------------------------------------------------------
// API – zentraler Request
// ------------------------------------------------------------

async function apiRequest(url, options = {}) {
  console.log("WICHTEL API REQUEST:", url, options);

  let response;

  try {
    response = await fetch(url, {
      ...options,
      headers: {
        "content-type": "application/json",
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    console.error("WICHTEL API NETWORK ERROR:", error);

    throw new Error(
      "Die Verbindung zur Wichtel-API konnte nicht hergestellt werden.\n\n" +
      error.message
    );
  }

  const text = await response.text();

  console.log("WICHTEL API RESPONSE:", response.status, text);

  let data;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {
      raw: text,
    };
  }

  if (!response.ok) {
    throw new Error(
      data.error ||
      data.message ||
      text ||
      `HTTP-Fehler ${response.status}`
    );
  }

  return data;
}

// ------------------------------------------------------------
// Loading
// ------------------------------------------------------------

function loading(title = "Einen Moment…") {
  app.innerHTML = `
    <div class="page">
      <div class="card center">
        <div class="spinner"></div>
        <h2>${escapeHtml(title)}</h2>
      </div>
    </div>
  `;
}

// ------------------------------------------------------------
// Fehler
// ------------------------------------------------------------

function showError(error) {
  console.error("WICHTEL ERROR:", error);

  app.innerHTML = `
    <div class="page">
      <div class="card">
        <div style="font-size:48px;text-align:center;">😕</div>

        <h1>Da ist etwas schiefgelaufen</h1>

        <p class="muted">
          ${escapeHtml(error.message || String(error))}
        </p>

        <button onclick="location.reload()">
          Erneut versuchen
        </button>
      </div>
    </div>
  `;
}

// ------------------------------------------------------------
// Startseite
// ------------------------------------------------------------

function renderHome() {
  app.innerHTML = `
    <div class="page">

      <div class="hero">
        <div class="hero-icon">🎄</div>

        <h1>Wichteln</h1>

        <p>
          Erstelle deine eigene Wichtelrunde
          und lade deine Freunde ein.
        </p>
      </div>

      <div class="card">

        <label for="eventName">
          Name der Wichtelrunde
        </label>

        <input
          id="eventName"
          type="text"
          placeholder="z. B. Weihnachten 2026"
          autocomplete="off"
        />

        <label for="orgName">
          Dein Name
        </label>

        <input
          id="orgName"
          type="text"
          placeholder="z. B. Daniel"
          autocomplete="name"
        />

        <label class="checkbox">
          <input
            id="self"
            type="checkbox"
            checked
          />

          <span>
            Ich nehme selbst am Wichteln teil
          </span>
        </label>

        <button
          id="createButton"
          type="button"
        >
          🎁 Wichtelrunde erstellen
        </button>

        <div
          id="createStatus"
          style="
            margin-top:16px;
            display:none;
            white-space:pre-wrap;
            word-break:break-word;
          "
        ></div>

      </div>

    </div>
  `;

  document
    .querySelector("#createButton")
    .addEventListener("click", createEvent);
}

// ------------------------------------------------------------
// WICHTIG:
// Wichtelrunde erstellen
// ------------------------------------------------------------

async function createEvent() {
  const button = document.querySelector("#createButton");
  const status = document.querySelector("#createStatus");

  const name =
    document.querySelector("#eventName").value.trim();

  const organizer =
    document.querySelector("#orgName").value.trim();

  const joinSelf =
    document.querySelector("#self").checked;

  if (!name) {
    alert("Bitte einen Namen für die Wichtelrunde eingeben.");
    return;
  }

  if (joinSelf && !organizer) {
    alert("Bitte deinen Namen eingeben.");
    return;
  }

  button.disabled = true;
  button.textContent = "⏳ Wichtelrunde wird erstellt…";

  status.style.display = "block";
  status.textContent = "Verbinde mit der Wichtel-API…";

  try {
    console.log("=================================");
    console.log("WICHTEL: CREATE EVENT");
    console.log("API:", `${API}/events`);
    console.log("Name:", name);
    console.log("Organizer:", organizer);
    console.log("Join self:", joinSelf);
    console.log("=================================");

    const data = await apiRequest(
      `${API}/events`,
      {
        method: "POST",
        body: JSON.stringify({
          name,
          organizer,
          joinSelf,
        }),
      }
    );

    console.log("CREATE EVENT SUCCESS:", data);

    if (!data.adminToken) {
      throw new Error(
        "Die API antwortet zwar, aber es wurde kein adminToken zurückgegeben.\n\n" +
        JSON.stringify(data, null, 2)
      );
    }

    save(
      "wichteln-admin-token",
      data.adminToken
    );

    if (data.organizerParticipantToken) {
      save(
        "wichteln-organizer-participant-token",
        data.organizerParticipantToken
      );
    }

    // --------------------------------------------------------
    // ERFOLGSANZEIGE
    // --------------------------------------------------------

    status.innerHTML = `
      <div style="
        padding:16px;
        border-radius:16px;
        background:rgba(46,125,50,.12);
      ">

        <strong>🎉 Runde erfolgreich erstellt!</strong>

        <br><br>

        <strong>Admin-Link:</strong><br>

        <a
          href="${escapeHtml(data.adminUrl)}"
          style="word-break:break-all;"
        >
          ${escapeHtml(data.adminUrl)}
        </a>

        <br><br>

        <strong>Einladungs-Link:</strong><br>

        <a
          href="${escapeHtml(data.publicUrl)}"
          style="word-break:break-all;"
        >
          ${escapeHtml(data.publicUrl)}
        </a>

        ${
          data.organizerParticipantUrl
            ? `
              <br><br>

              <strong>Dein persönlicher Teilnehmer-Link:</strong><br>

              <a
                href="${escapeHtml(data.organizerParticipantUrl)}"
                style="word-break:break-all;"
              >
                ${escapeHtml(data.organizerParticipantUrl)}
              </a>
            `
            : ""
        }

        <br><br>

        <button
          type="button"
          id="openAdminButton"
        >
          👑 Organisator-Bereich öffnen
        </button>

      </div>
    `;

    document
      .querySelector("#openAdminButton")
      ?.addEventListener("click", () => {
        window.location.href =
          data.adminUrl;
      });

    button.textContent = "✅ Erfolgreich erstellt";

  } catch (error) {

    console.error(
      "CREATE EVENT ERROR:",
      error
    );

    status.style.display = "block";

    status.innerHTML = `
      <div style="
        padding:16px;
        border-radius:16px;
        background:rgba(198,40,40,.12);
        color:inherit;
      ">
        <strong>❌ Fehler beim Erstellen</strong>

        <br><br>

        ${escapeHtml(error.message)}

        <br><br>

        <small>
          API:
          ${escapeHtml(`${API}/events`)}
        </small>
      </div>
    `;

    button.disabled = false;
    button.textContent =
      "🎁 Wichtelrunde erstellen";
  }
}

// ------------------------------------------------------------
// RUNDE LADEN
// ------------------------------------------------------------

async function loadEvent(slug) {
  loading("Wichtelrunde wird geladen…");

  try {
    const data = await apiRequest(
      `${API}/events/${encodeURIComponent(slug)}`
    );

    renderJoin(data);

  } catch (error) {
    showError(error);
  }
}

// ------------------------------------------------------------
// BEITRETEN
// ------------------------------------------------------------

function renderJoin(event) {
  app.innerHTML = `
    <div class="page">

      <div class="hero">
        <div class="hero-icon">🎁</div>

        <h1>${escapeHtml(event.name)}</h1>

        <p>
          Du wurdest zum Wichteln eingeladen.
        </p>
      </div>

      <div class="card">

        <label for="joinName">
          Dein Name
        </label>

        <input
          id="joinName"
          type="text"
          placeholder="Wie heißt du?"
          autocomplete="name"
        />

        <label for="joinWish">
          Wunsch / Geschenkidee
          <span class="muted">(optional)</span>
        </label>

        <input
          id="joinWish"
          type="text"
          placeholder="z. B. etwas zum Kochen"
          autocomplete="off"
        />

        <button
          id="joinButton"
          type="button"
        >
          🎄 Teilnehmen
        </button>

      </div>

    </div>
  `;

  document
    .querySelector("#joinButton")
    .addEventListener("click", async () => {

      const button =
        document.querySelector("#joinButton");

      const name =
        document.querySelector("#joinName")
          .value
          .trim();

      const wish =
        document.querySelector("#joinWish")
          .value
          .trim();

      if (!name) {
        alert("Bitte deinen Namen eingeben.");
        return;
      }

      button.disabled = true;
      button.textContent =
        "⏳ Wird gespeichert…";

      try {

        const data = await apiRequest(
          `${API}/events/${encodeURIComponent(event.slug)}/join`,
          {
            method: "POST",
            body: JSON.stringify({
              name,
              wish,
              exclusions: [],
            }),
          }
        );

        if (!data.token) {
          throw new Error(
            "Die Teilnahme wurde gespeichert, aber es wurde kein persönlicher Link zurückgegeben."
          );
        }

        save(
          "wichteln-participant-token",
          data.token
        );

        window.location.href =
          `?p=${encodeURIComponent(data.token)}`;

      } catch (error) {

        alert(
          "Teilnahme konnte nicht gespeichert werden.\n\n" +
          error.message
        );

        button.disabled = false;
        button.textContent =
          "🎄 Teilnehmen";
      }
    });
}

// ------------------------------------------------------------
// PERSÖNLICHEN LINK LADEN
// ------------------------------------------------------------

async function loadParticipant(token) {
  loading("Deine Wichtelrunde wird geladen…");

  try {

    const data = await apiRequest(
      `${API}/p/${encodeURIComponent(token)}`
    );

    renderParticipant(data, token);

  } catch (error) {
    showError(error);
  }
}

// ------------------------------------------------------------
// TEILNEHMERANSICHT
// ------------------------------------------------------------

function renderParticipant(data, token) {

  if (data.status === "started" && data.assignment) {

    renderAssignment(
      data,
      token
    );

    return;
  }

  app.innerHTML = `
    <div class="page">

      <div class="hero">
        <div class="hero-icon">🎄</div>

        <h1>Hallo ${escapeHtml(data.participant.name)}!</h1>

        <p>
          Du bist dabei. 🎁
        </p>
      </div>

      <div class="card">

        <h2>Deine Angaben</h2>

        <label for="editName">
          Name
        </label>

        <input
          id="editName"
          value="${escapeHtml(data.participant.name)}"
        />

        <label for="editWish">
          Wunsch / Geschenkidee
        </label>

        <input
          id="editWish"
          value="${escapeHtml(data.participant.wish || "")}"
          placeholder="Optional"
        />

        <button
          id="saveParticipant"
          type="button"
        >
          💾 Änderungen speichern
        </button>

        <div
          id="participantStatus"
          style="margin-top:16px;"
        ></div>

      </div>

    </div>
  `;

  document
    .querySelector("#saveParticipant")
    .addEventListener("click", async () => {

      const button =
        document.querySelector("#saveParticipant");

      const name =
        document.querySelector("#editName")
          .value
          .trim();

      const wish =
        document.querySelector("#editWish")
          .value
          .trim();

      if (!name) {
        alert("Bitte deinen Namen eingeben.");
        return;
      }

      button.disabled = true;
      button.textContent =
        "⏳ Speichern…";

      try {

        await apiRequest(
          `${API}/p/${encodeURIComponent(token)}`,
          {
            method: "PUT",
            body: JSON.stringify({
              name,
              wish,
              exclusions:
                data.participant.exclusions || [],
            }),
          }
        );

        document.querySelector(
          "#participantStatus"
        ).innerHTML = `
          <div style="
            padding:12px;
            border-radius:12px;
            background:rgba(46,125,50,.12);
          ">
            ✅ Änderungen gespeichert.
          </div>
        `;

      } catch (error) {

        alert(
          "Speichern fehlgeschlagen.\n\n" +
          error.message
        );

      } finally {

        button.disabled = false;
        button.textContent =
          "💾 Änderungen speichern";
      }
    });
}

// ------------------------------------------------------------
// ZUORDNUNG
// ------------------------------------------------------------

function renderAssignment(data, token) {

  app.innerHTML = `
    <div class="page">

      <div class="hero">
        <div class="hero-icon">🎁</div>

        <h1>Dein Wichtel</h1>

        <p>
          Die Auslosung ist erfolgt.
        </p>
      </div>

      <div class="card center">

        <div style="font-size:64px;">
          🎄
        </div>

        <h2>
          Du beschenkst
        </h2>

        <div style="
          font-size:28px;
          font-weight:700;
          margin:20px 0;
        ">
          ${escapeHtml(
            data.assignment.receiverName
          )}
        </div>

        ${
          data.assignment.receiverWish
            ? `
              <p>
                💡 Wunsch:
                <strong>
                  ${escapeHtml(
                    data.assignment.receiverWish
                  )}
                </strong>
              </p>
            `
            : ""
        }

      </div>

    </div>
  `;
}

// ------------------------------------------------------------
// ADMIN
// ------------------------------------------------------------

async function loadAdmin(token) {

  loading("Organisator-Bereich wird geladen…");

  try {

    const data = await apiRequest(
      `${API}/admin/${encodeURIComponent(token)}`
    );

    renderAdmin(data, token);

  } catch (error) {
    showError(error);
  }
}

function renderAdmin(data, token) {

  app.innerHTML = `
    <div class="page">

      <div class="hero">
        <div class="hero-icon">👑</div>

        <h1>${escapeHtml(data.name)}</h1>

        <p>
          Organisator-Bereich
        </p>
      </div>

      <div class="card">

        <h2>
          Teilnehmer
        </h2>

        <p class="muted">
          ${data.participants.length}
          Teilnehmer
        </p>

        <div>
          ${
            data.participants.length
              ? data.participants
                  .map(
                    (p) => `
                      <div style="
                        padding:12px 0;
                        border-bottom:1px solid rgba(255,255,255,.08);
                      ">
                        <strong>
                          ${escapeHtml(p.name)}
                        </strong>

                        ${
                          p.wish
                            ? `
                              <div class="muted">
                                💡 ${escapeHtml(p.wish)}
                              </div>
                            `
                            : ""
                        }
                      </div>
                    `
                  )
                  .join("")
              : `
                <p class="muted">
                  Noch keine Teilnehmer.
                </p>
              `
          }
        </div>

        ${
          data.status === "open"
            ? `
              <button
                id="startDraw"
                type="button"
                style="margin-top:20px;"
              >
                🎲 Auslosung starten
              </button>
            `
            : `
              <div style="
                margin-top:20px;
                padding:14px;
                border-radius:14px;
                background:rgba(46,125,50,.12);
              ">
                ✅ Die Auslosung wurde gestartet.
              </div>
            `
        }

      </div>

    </div>
  `;

  document
    .querySelector("#startDraw")
    ?.addEventListener("click", async () => {

      if (
        !confirm(
          "Möchtest du die Auslosung wirklich starten?\n\nDanach können Teilnehmer ihre Daten nicht mehr ändern."
        )
      ) {
        return;
      }

      const button =
        document.querySelector("#startDraw");

      button.disabled = true;
      button.textContent =
        "⏳ Auslosung läuft…";

      try {

        await apiRequest(
          `${API}/admin/${encodeURIComponent(token)}/start`,
          {
            method: "POST",
            body: JSON.stringify({}),
          }
        );

        await loadAdmin(token);

      } catch (error) {

        alert(
          "Auslosung konnte nicht gestartet werden.\n\n" +
          error.message
        );

        button.disabled = false;
        button.textContent =
          "🎲 Auslosung starten";
      }
    });
}

// ------------------------------------------------------------
// ROUTER
// ------------------------------------------------------------

async function startApp() {

  console.log("=================================");
  console.log("🎄 WICHTEL APP START");
  console.log("API:", API);
  console.log("URL:", window.location.href);
  console.log("=================================");

  const adminToken =
    getQuery("admin");

  const participantToken =
    getQuery("p");

  const eventSlug =
    getQuery("event");

  try {

    if (adminToken) {
      await loadAdmin(adminToken);
      return;
    }

    if (participantToken) {
      await loadParticipant(participantToken);
      return;
    }

    if (eventSlug) {
      await loadEvent(eventSlug);
      return;
    }

    renderHome();

  } catch (error) {

    showError(error);
  }
}

// ------------------------------------------------------------
// GLOBAL
// ------------------------------------------------------------

window.createEvent = createEvent;
window.startApp = startApp;

// Start
startApp();