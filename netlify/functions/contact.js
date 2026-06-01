import crypto from "node:crypto";

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS, GET",
      "access-control-allow-headers": "content-type",
    },
    body: JSON.stringify(payload),
  };
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizePhone(phone) {
  return String(phone || "").replace(/[^\d]/g, "");
}

function getHeader(headers, name) {
  const lowerName = name.toLowerCase();
  const foundKey = Object.keys(headers || {}).find((key) => key.toLowerCase() === lowerName);
  return foundKey ? headers[foundKey] : "";
}

function parseBody(event) {
  const rawBody = event.body || "";
  const contentType = getHeader(event.headers, "content-type").toLowerCase();

  if (!rawBody) return {};

  let bodyText = rawBody;
  if (event.isBase64Encoded) {
    bodyText = Buffer.from(rawBody, "base64").toString("utf8");
  }

  // Normal fetch(... JSON.stringify(data)) request
  if (contentType.includes("application/json")) {
    return JSON.parse(bodyText);
  }

  // Netlify Forms and normal HTML forms often send this:
  // form-name=contact&name=...&email=...
  if (contentType.includes("application/x-www-form-urlencoded") || bodyText.includes("form-name=")) {
    return Object.fromEntries(new URLSearchParams(bodyText));
  }

  // Fallback: try JSON first, then URLSearchParams.
  try {
    return JSON.parse(bodyText);
  } catch (_) {
    return Object.fromEntries(new URLSearchParams(bodyText));
  }
}

async function sendToTelegram({ token, chatId, text }) {
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok || !json.ok) {
    throw new Error(`Telegram API error: ${JSON.stringify(json)}`);
  }
}

async function sendToGoogleSheets(url, payload) {
  if (!url) return;

  const response = await fetch(url, {
    method: "POST",
    // text/plain avoids unnecessary CORS/preflight pain with Google Apps Script.
    headers: { "content-type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Google Sheets error: ${response.status} ${text}`);
  }
}

async function sendToMeta({ metaToken, metaPixelId, event, payload, normalizedEmail, normalizedPhone, eventId, page, lang }) {
  if (!metaToken || !metaPixelId) return;

  const userAgent = getHeader(event.headers, "user-agent");
  const forwardedFor = getHeader(event.headers, "x-forwarded-for");
  const clientIp = forwardedFor.split(",")[0].trim();

  const userData = {};

  if (normalizedEmail) userData.em = [sha256(normalizedEmail)];
  if (normalizedPhone) userData.ph = [sha256(normalizedPhone)];
  if (userAgent) userData.client_user_agent = userAgent;
  if (clientIp) userData.client_ip_address = clientIp;
  if (payload.fbp) userData.fbp = String(payload.fbp).trim();
  if (payload.fbc) userData.fbc = String(payload.fbc).trim();
  if (payload.external_id) userData.external_id = [sha256(String(payload.external_id).trim())];

  const response = await fetch(
    `https://graph.facebook.com/v20.0/${metaPixelId}/events?access_token=${metaToken}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        data: [
          {
            event_name: "Lead",
            event_time: Math.floor(Date.now() / 1000),
            event_id: eventId,
            action_source: "website",
            event_source_url: page || "https://sacraglyph.com/",
            user_data: userData,
            custom_data: {
              content_name: "tattoo_booking",
              page: page || "",
              lang: lang || "",
            },
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Meta CAPI error: ${response.status} ${text}`);
  }
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return jsonResponse(200, { ok: true });
  }

  // So opening /.netlify/functions/contact in the browser doesn't look like a murder scene.
  if (event.httpMethod === "GET") {
    return jsonResponse(200, {
      ok: true,
      message: "Contact function is alive. Send POST requests from the site form.",
    });
  }

  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { ok: false, error: "Method not allowed" });
  }

  try {
    const token = process.env.TG_BOT_TOKEN;
    const chatId = process.env.TG_CHAT_ID;
    const gsheetWebhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL || process.env.GSHEET_WEBHOOK_URL;
    const metaToken = process.env.META_CAPI_TOKEN;
    const metaPixelId = process.env.META_PIXEL_ID;

    if (!token || !chatId) {
      return jsonResponse(500, {
        ok: false,
        error: "Missing TG_BOT_TOKEN or TG_CHAT_ID",
      });
    }

    const data = parseBody(event);

    const name = String(data.name || data.full_name || "").trim();
    const phone = String(data.phone || data.tel || data.contact || "").trim();
    const email = String(data.email || "").trim();
    const message = String(data.message || data.text || data.comment || "").trim();
    const website = String(data.website || data["bot-field"] || "").trim();
    const clientID = String(data.clientID || data.client_id || "").trim();
    const page = String(data.page || data.referer || getHeader(event.headers, "referer") || "").trim();
    const lang = String(data.lang || data.language || "").trim();
    const eventId = String(data.event_id || "").trim() || `lead_${Date.now()}`;

    // Honeypot: silently accept spam bot submissions.
    if (website) {
      return jsonResponse(200, { ok: true });
    }

    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return jsonResponse(400, { ok: false, error: "Validation error: email is required" });
    }

    const crmPayload = {
      name,
      email: normalizedEmail,
      phone,
      message,
      clientID,
      page,
      lang,
      source: data.source || "website",
      utm_source: data.utm_source || "",
      utm_medium: data.utm_medium || "",
      utm_campaign: data.utm_campaign || "",
      city: data.city || "",
      fbp: data.fbp || "",
      fbc: data.fbc || "",
      external_id: data.external_id || "",
      event_id: eventId,
    };

    const telegramText =
      `New lead from site\n\n` +
      (name ? `Name: ${name}\n` : "") +
      `Email: ${normalizedEmail}\n` +
      (phone ? `Phone: ${phone}\n` : "") +
      (message ? `Message: ${message}\n` : "") +
      (lang ? `Lang: ${lang}\n` : "") +
      (page ? `Page: ${page}\n` : "") +
      (clientID ? `ClientID: ${clientID}\n` : "") +
      `Event ID: ${eventId}`;

    await Promise.all([
      sendToTelegram({ token, chatId, text: telegramText }),
      sendToGoogleSheets(gsheetWebhookUrl, crmPayload),
      sendToMeta({
        metaToken,
        metaPixelId,
        event,
        payload: data,
        normalizedEmail,
        normalizedPhone,
        eventId,
        page,
        lang,
      }),
    ]);

    return jsonResponse(200, { ok: true, event_id: eventId });
  } catch (err) {
    console.error(err);
    return jsonResponse(500, {
      ok: false,
      error: "Server error",
      details: String(err && err.message ? err.message : err),
    });
  }
}
