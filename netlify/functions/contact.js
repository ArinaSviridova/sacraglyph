export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'Method not allowed' })
    };
  }

  try {
    const token = process.env.TG_BOT_TOKEN;
    const chatId = process.env.TG_CHAT_ID;
    const gsheetWebhookUrl = process.env.GSHEET_WEBHOOK_URL;

    if (!token || !chatId) {
      return {
        statusCode: 500,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'Missing TG_BOT_TOKEN or TG_CHAT_ID' })
      };
    }

    const data = JSON.parse(event.body || '{}');

    const name = (data.name || '').trim();
    const phone = (data.phone || '').trim();
    const email = (data.email || '').trim();
    const website = (data.website || '').trim();
    const clientID = (data.clientID || '').trim();
    const page = (data.page || '').trim();
    const lang = (data.lang || '').trim();

    if (website) {
      return {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ok: true })
      };
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return {
        statusCode: 400,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'Validation error' })
      };
    }

    const text =
      `New lead from site\n\n` +
      (name ? `Name: ${name}\n` : '') +
      `Email: ${normalizedEmail}\n` +
      (phone ? `Phone: ${phone}\n` : '') +
      (lang ? `Lang: ${lang}\n` : '') +
      (page ? `Page: ${page}\n` : '') +
      (clientID ? `ClientID: ${clientID}\n` : '');

    const telegramPromise = fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text.trim() || 'New lead from site'
      })
    });

    const sheetsPromise = gsheetWebhookUrl
      ? fetch(gsheetWebhookUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            name,
            phone,
            email: normalizedEmail,
            clientID,
            page,
            lang
          })
        })
      : Promise.resolve(null);

    const [tgRes, sheetRes] = await Promise.all([telegramPromise, sheetsPromise]);

    const tgJson = await tgRes.json().catch(() => ({}));

    if (!tgRes.ok || !tgJson.ok) {
      return {
        statusCode: 502,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'Telegram API error', tg: tgJson })
      };
    }

    if (sheetRes && !sheetRes.ok) {
      const sheetText = await sheetRes.text().catch(() => '');
      return {
        statusCode: 502,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'Google Sheets error', sheet: sheetText })
      };
    }

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ok: true })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ok: false,
        error: 'Server error',
        details: String(err)
      })
    };
  }
}