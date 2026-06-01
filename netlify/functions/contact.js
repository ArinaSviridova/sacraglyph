import crypto from "node:crypto";

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizePhone(phone) {
  return String(phone || "").replace(/[^\d]/g, "");
}

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  };
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

  const result = await response.json().catch(() => ({}));

  if (!response.ok || !result.ok) {
    throw new Error(`Telegram API error: ${JSON.stringify(result)}`);
  }

  return result;
}

async function sendToGoogleSheets(webhookUrl, payload) {
  if (!webhookUrl) {
    return null;
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    // text/plain avoids some Apps Script/preflight weirdness. Server-side Netlify does not need CORS,
    // but Apps Script is still less dramatic with this header. Naturally.
    headers: { "content-type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });

  const text = await response.text().catch(() => "");

  if (!response.ok) {
    throw new Error(`Google Sheets error ${response.status}: ${text}`);
  }

  try {
    const parsed = JSON.parse(text);
    if (parsed && parsed.ok === false) {
      throw new Error(`Google Sheets rejected payload: ${text}`);
    }
    return parsed;
  } catch {
    return { ok: true, raw: text };
  }
}

async function sendToMetaCapi({ metaToken, metaPixelId, eventId, page, lang, userData }) {
  if (!metaToken || !metaPixelId) {
    return null;
  }

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

  const text = await response.text().catch(() => "");

  if (!response.ok) {
    throw new Error(`Meta CAPI error ${response.status}: ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return { ok: true, raw: text };
  }
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { ok: false, error: "Method not allowed" });
  }

  try {
    const token = process.env.TG_BOT_TOKEN;
    const chatId = process.env.TG_CHAT_ID;

    // Supports both names, so you do not have to rename env variables if one already exists.
    const googleSheetsWebhookUrl =
      process.env.GOOGLE_SHEETS_WEBHOOK_URL || process.env.GSHEET_WEBHOOK_URL || "";

    const metaToken = process.env.META_CAPI_TOKEN;
    const metaPixelId = process.env.META_PIXEL_ID;

    if (!token || !chatId) {
      return jsonResponse(500, {
        ok: false,
        error: "Missing TG_BOT_TOKEN or TG_CHAT_ID",
      });
    }

    const data = JSON.parse(event.body || "{}");

    const name = String(data.name || "").trim();
    const phone = String(data.phone || "").trim();
    const email = String(data.email || "").trim();
    const message = String(data.message || data.comment || "").trim();
    const website = String(data.website || "").trim(); // honeypot
    const clientID = String(data.clientID || data.client_id || "").trim();
    const page = String(data.page || data.url || data.referer || "").trim();
    const lang = String(data.lang || "").trim();
    const fbp = String(data.fbp || "").trim();
    const fbc = String(data.fbc || "").trim();
    const externalId = String(data.external_id || "").trim();
    const referer = String(data.referer || "").trim();
    const city = String(data.city || "").trim();
    const source = String(data.source || "website").trim();
    const utm_source = String(data.utm_source || "").trim();
    const utm_medium = String(data.utm_medium || "").trim();
    const utm_campaign = String(data.utm_campaign || "").trim();
    const eventId = String(data.event_id || "").trim() || `lead_${Date.now()}`;

    // Spam bot filled the hidden field. Pretend everything is fine, because arguing with bots is beneath us.
    if (website) {
      return jsonResponse(200, { ok: true });
    }

    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return jsonResponse(400, { ok: false, error: "Validation error: valid email is required" });
    }

    const normalizedPhone = normalizePhone(phone);
    const userAgent = event.headers["user-agent"] || event.headers["User-Agent"] || "";
    const forwardedFor =
      event.headers["x-forwarded-for"] || event.headers["X-Forwarded-For"] || "";
    const clientIp = forwardedFor.split(",")[0].trim();

    const telegramText =
      `New lead from site\n\n` +
      (name ? `Name: ${name}\n` : "") +
      `Email: ${normalizedEmail}\n` +
      (phone ? `Phone: ${phone}\n` : "") +
      (message ? `Message: ${message}\n` : "") +
      (lang ? `Lang: ${lang}\n` : "") +
      (city ? `City: ${city}\n` : "") +
      (page ? `Page: ${page}\n` : "") +
      (utm_source || utm_medium || utm_campaign
        ? `UTM: ${utm_source || "-"} / ${utm_medium || "-"} / ${utm_campaign || "-"}\n`
        : "") +
      (clientID ? `ClientID: ${clientID}\n` : "") +
      `Event ID: ${eventId}`;

    const sheetsPayload = {
      name,
      email: normalizedEmail,
      phone,
      message,
      page,
      source,
      utm_source,
      utm_medium,
      utm_campaign,
      city,
      lang,
      clientID,
      fbp,
      fbc,
      external_id: externalId,
      referer,
      event_id: eventId,
    };

    const userData = {};

    if (normalizedEmail) {
      userData.em = [sha256(normalizedEmail)];
    }

    if (normalizedPhone) {
      userData.ph = [sha256(normalizedPhone)];
    }

    if (userAgent) {
      userData.client_user_agent = userAgent;
    }

    if (clientIp) {
      userData.client_ip_address = clientIp;
    }

    if (fbp) {
      userData.fbp = fbp;
    }

    if (fbc) {
      userData.fbc = fbc;
    }

    if (externalId) {
      userData.external_id = [sha256(externalId)];
    }

    const results = await Promise.allSettled([
      sendToTelegram({ token, chatId, text: telegramText }),
      sendToGoogleSheets(googleSheetsWebhookUrl, sheetsPayload),
      sendToMetaCapi({ metaToken, metaPixelId, eventId, page, lang, userData }),
    ]);

    const [telegramResult, sheetsResult, metaResult] = results;

    if (telegramResult.status === "rejected") {
      return jsonResponse(502, {
        ok: false,
        error: "Telegram API error",
        details: String(telegramResult.reason),
      });
    }

    if (sheetsResult.status === "rejected") {
      return jsonResponse(502, {
        ok: false,
        error: "Google Sheets error",
        details: String(sheetsResult.reason),
      });
    }

    if (metaResult.status === "rejected") {
      return jsonResponse(502, {
        ok: false,
        error: "Meta CAPI error",
        details: String(metaResult.reason),
      });
    }

    return jsonResponse(200, {
      ok: true,
      event_id: eventId,
      sheets: sheetsResult.value ? "sent" : "skipped",
      meta: metaResult.value ? "sent" : "skipped",
    });
  } catch (err) {
    return jsonResponse(500, {
      ok: false,
      error: "Server error",
      details: String(err),
    });
  }
}
