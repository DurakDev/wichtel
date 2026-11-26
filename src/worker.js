// ============================================================
// 🎄 WICHTELN – CLOUDFLARE WORKER API
// ============================================================

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
  "access-control-allow-headers": "content-type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders,
    },
  });
}

function token() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);

  return [...bytes]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function createSlug() {
  return token().slice(0, 8);
}

async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function getEvent(env, slug) {
  return await env.DB
    .prepare("SELECT * FROM events WHERE slug = ?")
    .bind(slug)
    .first();
}

async function getParticipants(env, eventId) {
  return await env.DB
    .prepare(`
      SELECT id, name, wish
      FROM participants
      WHERE event_id = ?
      ORDER BY created_at
    `)
    .bind(eventId)
    .all();
}

// ============================================================
// AUSLOSUNG
// ============================================================

function createAssignment(participants, exclusions) {
  const ids = participants.map((p) => p.id);
  const allowed = new Map();

  for (const id of ids) {
    allowed.set(
      id,
      ids.filter(
        (otherId) =>
          otherId !== id &&
          !(exclusions.get(id) || []).includes(otherId)
      )
    );
  }

  for (const list of allowed.values()) {
    list.sort(() => Math.random() - 0.5);
  }

  const order = [...ids].sort(
    (a, b) => allowed.get(a).length - allowed.get(b).length
  );
  const used = new Set();
  const result = new Map();

  function backtrack(index) {
    if (index === order.length) return true;
    const giver = order[index];
    const options = [...allowed.get(giver)]
      .filter((receiver) => !used.has(receiver))
      .sort(() => Math.random() - 0.5);

    for (const receiver of options) {
      result.set(giver, receiver);
      used.add(receiver);
      if (backtrack(index + 1)) return true;
      used.delete(receiver);
      result.delete(giver);
    }

    return false;
  }

  return backtrack(0) ? result : null;
}

// ============================================================
// WORKER
// ============================================================

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.split("/").filter(Boolean);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    try {
      if (
        request.method === "GET" &&
        path[0] === "api" &&
        path[1] === "health"
      ) {
        if (!env.DB) {
          return json({
            ok: false,
            worker: true,
            database: false,
            error: "D1 Binding DB fehlt",
          }, 500);
        }
        const result = await env.DB
          .prepare("SELECT 1 AS test")
          .first();
        return json({
          ok: true,
          worker: true,
          database: true,
          databaseTest: result?.test === 1,
          message: "Wichtel API und D1 funktionieren.",
        });
      }

      if (
        request.method === "GET" &&
        path[0] === "api" &&
        path.length === 1
      ) {
        return json({
          ok: true,
          name: "Wichteln API",
          version: "1.0.0",
          endpoints: [
            "GET /api/health",
            "POST /api/events",
            "GET /api/events/:slug",
            "POST /api/events/:slug/join",
            "GET /api/p/:token",
            "PUT /api/p/:token",
            "GET /api/admin/:token",
            "DELETE /api/admin/:token",
            "POST /api/admin/:token/start",
            "GET /api/admin/:token/assignments",
          ],
        });
      }

      // Create a new Wichtel event.
      if (
        request.method === "POST" &&
        path[0] === "api" &&
        path[1] === "events" &&
        path.length === 2
      ) {
        const body = await readBody(request);
        if (!body.name || !String(body.name).trim()) {
          return json({ ok: false, error: "Der Name der Wichtelrunde fehlt." }, 400);
        }
        if (body.joinSelf && (!body.organizer || !String(body.organizer).trim())) {
          return json({ ok: false, error: "Der Name des Organisators fehlt." }, 400);
        }
        if (!env.DB) {
          return json({ ok: false, error: "D1 Binding DB ist nicht vorhanden." }, 500);
        }

        const eventId = crypto.randomUUID();
        const eventSlug = createSlug();
        const adminToken = token();
        const wishesAllowed = body.wishesAllowed !== false;
        await env.DB.prepare(`
          INSERT INTO events (id, slug, name, admin_token, status, wishes_allowed, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
          eventId, eventSlug, String(body.name).trim(), adminToken, "open",
          wishesAllowed ? 1 : 0, Date.now()
        ).run();

        let organizerParticipantToken = null;
        if (body.joinSelf) {
          organizerParticipantToken = token();
          await env.DB.prepare(`
            INSERT INTO participants
              (id, event_id, name, wish, personal_token, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `).bind(
            crypto.randomUUID(), eventId, String(body.organizer).trim(), "",
            organizerParticipantToken, Date.now()
          ).run();
        }

        return json({
          ok: true,
          message: "Wichtelrunde erfolgreich erstellt.",
          slug: eventSlug,
          adminToken,
          organizerParticipantToken,
          publicUrl: `${url.origin}/?event=${eventSlug}`,
          adminUrl: `${url.origin}/?admin=${adminToken}`,
          organizerParticipantUrl: organizerParticipantToken
            ? `${url.origin}/?p=${organizerParticipantToken}`
            : null,
        }, 201);
      }

      // Public event details.
      if (
        request.method === "GET" &&
        path[0] === "api" &&
        path[1] === "events" &&
        path[2]
      ) {
        const event = await getEvent(env, path[2]);
        if (!event) return json({ ok: false, error: "Runde nicht gefunden." }, 404);
        const participants = await getParticipants(env, event.id);
        return json({
          ok: true,
          slug: event.slug,
          name: event.name,
          status: event.status,
          wishesAllowed: event.wishes_allowed !== 0,
          participants: participants.results.map((p) => ({ id: p.id, name: p.name })),
        });
      }

      // Participant joins an event.
      if (
        request.method === "POST" &&
        path[0] === "api" &&
        path[1] === "events" &&
        path[2] &&
        path[3] === "join"
      ) {
        const event = await getEvent(env, path[2]);
        if (!event) return json({ ok: false, error: "Runde nicht gefunden." }, 404);
        if (event.status !== "open") {
          return json({ ok: false, error: "Die Auslosung wurde bereits gestartet." }, 409);
        }
        const body = await readBody(request);
        if (!body.name || !String(body.name).trim()) {
          return json({ ok: false, error: "Name fehlt." }, 400);
        }

        const participantId = crypto.randomUUID();
        const personalToken = token();
        await env.DB.prepare(`
          INSERT INTO participants
            (id, event_id, name, wish, personal_token, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
          participantId, event.id, String(body.name).trim(),
          event.wishes_allowed !== 0 ? body.wish || "" : "",
          personalToken, Date.now()
        ).run();

        for (const excludedId of body.exclusions || []) {
          await env.DB.prepare(`
            INSERT INTO exclusions (participant_id, excluded_id)
            VALUES (?, ?)
          `).bind(participantId, excludedId).run();
        }

        return json({
          ok: true,
          token: personalToken,
          participantId,
          personalUrl: `${url.origin}/?p=${personalToken}`,
        }, 201);
      }

      // Get participant data by their personal link.
      if (
        request.method === "GET" &&
        path[0] === "api" &&
        path[1] === "p" &&
        path[2]
      ) {
        const participant = await env.DB.prepare(`
          SELECT * FROM participants WHERE personal_token = ?
        `).bind(path[2]).first();
        if (!participant) {
          return json({ ok: false, error: "Persönlicher Link ungültig." }, 404);
        }

        const event = await env.DB.prepare(`
          SELECT * FROM events WHERE id = ?
        `).bind(participant.event_id).first();
        const exclusions = await env.DB.prepare(`
          SELECT excluded_id FROM exclusions WHERE participant_id = ?
        `).bind(participant.id).all();
        const participants = await getParticipants(env, event.id);
        let assignment = null;

        if (event.status === "started") {
          const result = await env.DB.prepare(`
            SELECT a.receiver_id, r.name AS receiverName, r.wish AS receiverWish
            FROM assignments a
            JOIN participants r ON r.id = a.receiver_id
            WHERE a.giver_id = ?
          `).bind(participant.id).first();
          if (result) {
            assignment = {
              receiverId: result.receiver_id,
              receiverName: result.receiverName,
              receiverWish: result.receiverWish,
            };
          }
        }

        return json({
          ok: true,
          status: event.status,
          event: {
            name: event.name,
            slug: event.slug,
            wishesAllowed: event.wishes_allowed !== 0,
          },
          participant: {
            id: participant.id,
            name: participant.name,
            wish: participant.wish,
            exclusions: exclusions.results.map((x) => x.excluded_id),
          },
          participants: participants.results.map((p) => ({ id: p.id, name: p.name })),
          assignment,
          firstReveal: event.status === "started" && participant.revealed === 0,
        });
      }

      // Update participant data.
      if (
        request.method === "PUT" &&
        path[0] === "api" &&
        path[1] === "p" &&
        path[2]
      ) {
        const participant = await env.DB.prepare(`
          SELECT * FROM participants WHERE personal_token = ?
        `).bind(path[2]).first();
        if (!participant) {
          return json({ ok: false, error: "Persönlicher Link ungültig." }, 404);
        }
        const event = await env.DB.prepare(`
          SELECT status, wishes_allowed FROM events WHERE id = ?
        `).bind(participant.event_id).first();
        if (event.status !== "open") {
          return json({ ok: false, error: "Die Auslosung wurde bereits gestartet." }, 409);
        }

        const body = await readBody(request);
        if (!body.name || !String(body.name).trim()) {
          return json({ ok: false, error: "Name fehlt." }, 400);
        }
        await env.DB.prepare(`
          UPDATE participants SET name = ?, wish = ? WHERE id = ?
        `).bind(
          String(body.name).trim(),
          event.wishes_allowed !== 0 ? body.wish || "" : "",
          participant.id
        ).run();
        await env.DB.prepare(`
          DELETE FROM exclusions WHERE participant_id = ?
        `).bind(participant.id).run();
        for (const excludedId of body.exclusions || []) {
          await env.DB.prepare(`
            INSERT INTO exclusions (participant_id, excluded_id)
            VALUES (?, ?)
          `).bind(participant.id, excludedId).run();
        }
        return json({ ok: true, message: "Daten gespeichert." });
      }

      // Organizer dashboard; the admin token is the credential.
      if (
        request.method === "GET" &&
        path[0] === "api" &&
        path[1] === "admin" &&
        path[2] &&
        !path[3]
      ) {
        const event = await env.DB.prepare(`
          SELECT * FROM events WHERE admin_token = ?
        `).bind(path[2]).first();
        if (!event) {
          return json({ ok: false, error: "Organisator-Link ungültig." }, 404);
        }

        const participants = await env.DB.prepare(`
          SELECT id, name, wish, personal_token
          FROM participants WHERE event_id = ? ORDER BY created_at
        `).bind(event.id).all();
        const exclusions = await env.DB.prepare(`
          SELECT participant_id, COUNT(*) AS count
          FROM exclusions GROUP BY participant_id
        `).all();
        const counts = new Map(exclusions.results.map((x) => [x.participant_id, x.count]));

        return json({
          ok: true,
          slug: event.slug,
          name: event.name,
          status: event.status,
          wishesAllowed: event.wishes_allowed !== 0,
          participants: participants.results.map((p) => ({
            id: p.id,
            name: p.name,
            wish: p.wish,
            personalToken: p.personal_token,
            joined: true,
            exclusionsCount: counts.get(p.id) || 0,
          })),
        });
      }

      // Permanently delete the event and all dependent records.
      if (
        request.method === "DELETE" &&
        path[0] === "api" &&
        path[1] === "admin" &&
        path[2] &&
        !path[3]
      ) {
        const event = await env.DB.prepare(`
          SELECT id FROM events WHERE admin_token = ?
        `).bind(path[2]).first();
        if (!event) {
          return json({ ok: false, error: "Organisator-Link ungültig." }, 404);
        }

        // Explicitly remove dependent rows before participants and event.
        // D1 batch runs these statements transactionally.
        await env.DB.batch([
          env.DB.prepare(`
            DELETE FROM assignments
            WHERE giver_id IN (SELECT id FROM participants WHERE event_id = ?)
               OR receiver_id IN (SELECT id FROM participants WHERE event_id = ?)
          `).bind(event.id, event.id),
          env.DB.prepare(`
            DELETE FROM exclusions
            WHERE participant_id IN (SELECT id FROM participants WHERE event_id = ?)
               OR excluded_id IN (SELECT id FROM participants WHERE event_id = ?)
          `).bind(event.id, event.id),
          env.DB.prepare(`DELETE FROM participants WHERE event_id = ?`).bind(event.id),
          env.DB.prepare(`DELETE FROM events WHERE id = ?`).bind(event.id),
        ]);

        return json({ ok: true, message: "Wichtelrunde und alle zugehörigen Daten wurden gelöscht." });
      }

      // Start draw.
      if (
        request.method === "POST" &&
        path[0] === "api" &&
        path[1] === "admin" &&
        path[2] &&
        path[3] === "start"
      ) {
        const event = await env.DB.prepare(`
          SELECT * FROM events WHERE admin_token = ?
        `).bind(path[2]).first();
        if (!event) {
          return json({ ok: false, error: "Organisator-Link ungültig." }, 404);
        }
        if (event.status !== "open") {
          return json({ ok: false, error: "Die Auslosung wurde bereits gestartet." }, 409);
        }

        const participants = (await getParticipants(env, event.id)).results;
        if (participants.length < 2) {
          return json({ ok: false, error: "Mindestens zwei Teilnehmer erforderlich." }, 400);
        }
        const exclusionRows = await env.DB.prepare(`
          SELECT participant_id, excluded_id FROM exclusions
          WHERE participant_id IN (
            SELECT id FROM participants WHERE event_id = ?
          )
        `).bind(event.id).all();
        const exclusions = new Map();
        for (const row of exclusionRows.results) {
          if (!exclusions.has(row.participant_id)) exclusions.set(row.participant_id, []);
          exclusions.get(row.participant_id).push(row.excluded_id);
        }

        const assignment = createAssignment(participants, exclusions);
        if (!assignment) {
          return json({
            ok: false,
            error: "Keine gültige Zuordnung möglich. Bitte Ausschlüsse reduzieren.",
          }, 409);
        }
        for (const [giverId, receiverId] of assignment) {
          await env.DB.prepare(`
            INSERT INTO assignments (giver_id, receiver_id) VALUES (?, ?)
          `).bind(giverId, receiverId).run();
        }
        await env.DB.prepare(`
          UPDATE events SET status = 'started', started_at = ? WHERE id = ?
        `).bind(Date.now(), event.id).run();
        return json({ ok: true, message: "Auslosung erfolgreich gestartet." });
      }

      // Organizer-only assignments view.
      if (
        request.method === "GET" &&
        path[0] === "api" &&
        path[1] === "admin" &&
        path[2] &&
        path[3] === "assignments"
      ) {
        const event = await env.DB.prepare(`
          SELECT * FROM events WHERE admin_token = ?
        `).bind(path[2]).first();
        if (!event) {
          return json({ ok: false, error: "Organisator-Link ungültig." }, 404);
        }
        const assignments = await env.DB.prepare(`
          SELECT g.name AS giverName, r.name AS receiverName
          FROM assignments a
          JOIN participants g ON g.id = a.giver_id
          JOIN participants r ON r.id = a.receiver_id
          WHERE g.event_id = ?
          ORDER BY g.name
        `).bind(event.id).all();
        return json({ ok: true, assignments: assignments.results });
      }

      return json({
        ok: false,
        error: "API-Endpunkt nicht gefunden.",
        path: url.pathname,
        method: request.method,
      }, 404);
    } catch (error) {
      console.error("WICHTEL API ERROR:", error);
      return json({
        ok: false,
        error: error?.message || "Serverfehler",
        type: error?.name || "UnknownError",
      }, 500);
    }
  },
};
