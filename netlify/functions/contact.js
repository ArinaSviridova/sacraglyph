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
      body: JSON.stringify({ ok: false, error: "Method not allowed" })
    };
  }

  try {
    const token = process.env.TG_BOT_TOKEN;
    const chatId = process.env.TG_CHAT_ID;
    const gsheetWebhookUrl = process.env.GSHEET_WEBHOOK_URL;
    const metaToken = process.env.META_CAPI_TOKEN;
    const metaPixelId = process.env.META_PIXEL_ID;

    console.log("ENV CHECK", {
      hasTelegramToken: !!token,
      hasTelegramChatId: !!chatId,
      hasGoogleSheetsWebhook: !!gsheetWebhookUrl,
      hasMetaToken: !!metaToken,
      hasMetaPixelId: !!metaPixelId,
      metaPixelId: metaPixelId || null
    });

    if (!token || !chatId) {
      console.error("Missing Telegram env vars");
      return {
        statusCode: 500,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ok: false, error: "Missing TG_BOT_TOKEN or TG_CHAT_ID" })
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

    console.log("Incoming contact payload", {
      hasName: !!name,
      hasPhone: !!phone,
      hasEmail: !!email,
      hasWebsite: !!website,
      hasClientID: !!clientID,
      page,
      lang,
      eventId
    });

    if (website) {
      console.log("Honeypot triggered, returning ok:true");
      return {
        statusCode: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ok: true })
      };
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.error("Validation error: invalid email");
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ok: false, error: "Validation error" })
      };
    }

    const text =
      `New lead from site\n\n` +
      (name ? `Name: ${name}\n` : "") +
      (phone ? `Phone: ${phone}\n` : "") +
      (email ? `Email: ${email}\n` : "") +
      (lang ? `Lang: ${lang}\n` : "") +
      (page ? `Page: ${page}\n` : "") +
      (clientID ? `ClientID: ${clientID}\n` : "") +
      `Event ID: ${eventId}\n`;

    console.log("Sending Telegram message");

    const telegramPromise = fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text.trim() || "New lead from site"
      })
    });

    const sheetsPromise = gsheetWebhookUrl
      ? fetch(gsheetWebhookUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name,
            phone,
            email,
            clientID,
            page,
            lang,
            event_id: eventId
          })
        })
      : Promise.resolve(null);

    const userData = {};
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phone);

    if (normalizedEmail) {
      userData.em = [sha256(normalizedEmail)];
    }

    if (normalizedPhone) {
      userData.ph = [sha256(normalizedPhone)];
    }

    const userAgent =
      event.headers["user-agent"] ||
      event.headers["User-Agent"] ||
      "";

    if (userAgent) {
      userData.client_user_agent = userAgent;
    }

    console.log("Sending Lead to Meta CAPI", {
      hasMetaToken: !!metaToken,
      pixelId: metaPixelId || null,
      eventId,
      page: page || "https://sacraglyph.com/",
      hasEmail: !!normalizedEmail,
      hasPhone: !!normalizedPhone,
      userDataKeys: Object.keys(userData)
    });

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
                    user_data: userData
                  }
                ]
              })
            }
          )
        : Promise.resolve(null);

    const [tgRes, sheetRes, metaRes] = await Promise.all([
      telegramPromise,
      sheetsPromise,
      metaPromise
    ]);

    const tgJson = await tgRes.json().catch(() => ({}));
    console.log("Telegram response", {
      ok: tgRes.ok,
      status: tgRes.status,
      body: tgJson
    });

    if (!tgRes.ok || !tgJson.ok) {
      console.error("Telegram API error", tgJson);
      return {
        statusCode: 502,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ok: false, error: "Telegram API error", tg: tgJson })
      };
    }

    if (sheetRes) {
      const sheetText = await sheetRes.text().catch(() => "");
      console.log("Google Sheets response", {
        ok: sheetRes.ok,
        status: sheetRes.status,
        body: sheetText
      });

      if (!sheetRes.ok) {
        console.error("Google Sheets error", sheetText);
        return {
          statusCode: 502,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ok: false, error: "Google Sheets error", sheet: sheetText })
        };
      }
    }

    if (metaRes) {
      const metaText = await metaRes.text().catch(() => "");
      console.log("Meta response", {
        ok: metaRes.ok,
        status: metaRes.status,
        body: metaText
      });

      if (!metaRes.ok) {
        console.error("Meta CAPI error", metaText);
        return {
          statusCode: 502,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ok: false, error: "Meta CAPI error", meta: metaText })
        };
      }
    } else {
      console.log("Meta request skipped because token or pixel id is missing");
    }

    console.log("Function completed successfully", { eventId });

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: true, event_id: eventId })
    };
  } catch (err) {
    console.error("Unhandled server error", String(err), err);
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ok: false,
        error: "Server error",
        details: String(err)
      })
    };
  }
}
