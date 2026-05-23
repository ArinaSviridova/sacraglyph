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

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: false, error: "Method not allowed" }),
    };
  }

  try {
    const token = process.env.TG_BOT_TOKEN;
    const chatId = process.env.TG_CHAT_ID;
    const gsheetWebhookUrl = process.env.GSHEET_WEBHOOK_URL;
    const metaToken = process.env.META_CAPI_TOKEN;
    const metaPixelId = process.env.META_PIXEL_ID;

    if (!token || !chatId) {
      return {
        statusCode: 500,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ok: false,
          error: "Missing TG_BOT_TOKEN or TG_CHAT_ID",
        }),
      };
    }

    const data = JSON.parse(event.body || "{}");

    const name = (data.name || "").trim();
    const phone = (data.phone || "").trim();
    const email = (data.email || "").trim();
    const website = (data.website || "").trim();
    const clientID = (data.clientID || "").trim();
    const page = (data.page || "").trim();
    const lang = (data.lang || "").trim();
    const eventId = (data.event_id || "").trim() || `lead_${Date.now()}`;

    if (website) {
      return {
        statusCode: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ok: true }),
      };
    }

    const normalizedEmail = normalizeEmail(email);

    if (
      !normalizedEmail ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ok: false, error: "Validation error" }),
      };
    }

    const text =
      `New lead from site\n\n` +
      (name ? `Name: ${name}\n` : "") +
      `Email: ${normalizedEmail}\n` +
      (phone ? `Phone: ${phone}\n` : "") +
      (lang ? `Lang: ${lang}\n` : "") +
      (page ? `Page: ${page}\n` : "") +
      (clientID ? `ClientID: ${clientID}\n` : "") +
      `Event ID: ${eventId}\n`;

    const telegramPromise = fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: text.trim() || "New lead from site",
        }),
      },
    );

    const sheetsPromise = gsheetWebhookUrl
      ? fetch(gsheetWebhookUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name,
            phone,
            email: normalizedEmail,
            clientID,
            page,
            lang,
            event_id: eventId,
          }),
        })
      : Promise.resolve(null);

    const userData = {};
    const normalizedPhone = normalizePhone(phone);
    const userAgent =
      event.headers["user-agent"] || event.headers["User-Agent"] || "";

    if (normalizedEmail) {
      userData.em = [sha256(normalizedEmail)];
    }

    if (normalizedPhone) {
      userData.ph = [sha256(normalizedPhone)];
    }

    if (userAgent) {
      userData.client_user_agent = userAgent;
    }

    const metaPromise =
      metaToken && metaPixelId
        ? fetch(
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
                  },
                ],
              }),
            },
          )
        : Promise.resolve(null);

    const [tgRes, sheetRes, metaRes] = await Promise.all([
      telegramPromise,
      sheetsPromise,
      metaPromise,
    ]);

    const tgJson = await tgRes.json().catch(() => ({}));

    if (!tgRes.ok || !tgJson.ok) {
      return {
        statusCode: 502,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ok: false,
          error: "Telegram API error",
          tg: tgJson,
        }),
      };
    }

    if (sheetRes && !sheetRes.ok) {
      const sheetText = await sheetRes.text().catch(() => "");
      return {
        statusCode: 502,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ok: false,
          error: "Google Sheets error",
          sheet: sheetText,
        }),
      };
    }

    if (metaRes && !metaRes.ok) {
      const metaText = await metaRes.text().catch(() => "");
      return {
        statusCode: 502,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ok: false,
          error: "Meta CAPI error",
          meta: metaText,
        }),
      };
    }

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: true, event_id: eventId }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ok: false,
        error: "Server error",
        details: String(err),
      }),
    };
  }
}
