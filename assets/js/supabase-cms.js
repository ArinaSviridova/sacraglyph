(() => {
  "use strict";

  const cfg = window.BAZOOKA_SUPABASE || {};
  const PLACEHOLDER_RE = /PASTE_|YOUR_|CHANGE_ME/i;
  const ready = Boolean(cfg.url && cfg.anonKey && !PLACEHOLDER_RE.test(cfg.url) && !PLACEHOLDER_RE.test(cfg.anonKey));
  const bucket = cfg.bucket || "cms-media";
  const client = ready && window.supabase ? window.supabase.createClient(cfg.url, cfg.anonKey) : null;

  function isReady() {
    return Boolean(client);
  }

  function toCamelItem(row) {
    const prices = Array.isArray(row.prices) ? row.prices : [];
    const images = Array.isArray(row.merch_images)
      ? row.merch_images.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map((img) => img.image_url).filter(Boolean)
      : [];

    return {
      id: row.id,
      titleRu: row.title_ru || "",
      titleEn: row.title_en || row.title_ru || "",
      categoryRu: row.category_ru || "Мерч",
      categoryEn: row.category_en || "Merch",
      collectionRu: row.collection_ru || "Мерч",
      collectionEn: row.collection_en || "Merch",
      prices,
      inStock: row.in_stock !== false,
      descriptionRu: row.description_ru || "",
      descriptionEn: row.description_en || row.description_ru || "",
      images,
      instagram: row.instagram || "https://www.instagram.com/yugenmagaz/",
      telegram: row.telegram || "https://t.me/bazookatattoo",
      isPublished: row.is_published !== false,
      sortOrder: row.sort_order || 0,
    };
  }

  function merchRowsToCollections(rows) {
    const map = new Map();
    (rows || []).forEach((row) => {
      const item = toCamelItem(row);
      const key = `${item.collectionRu}|||${item.collectionEn}`;
      if (!map.has(key)) {
        map.set(key, {
          id: key.toLowerCase().replace(/[^a-zа-я0-9]+/gi, "-").replace(/^-|-$/g, "") || "merch",
          titleRu: item.collectionRu,
          titleEn: item.collectionEn,
          textRu: `Коллекция ${item.collectionRu}. Выбери вещь и открой карточку для подробностей.`,
          textEn: `${item.collectionEn} collection. Choose an item and open the card for details.`,
          items: [],
        });
      }
      map.get(key).items.push(item);
    });
    return Array.from(map.values());
  }

  function toCamelWork(row) {
    const images = Array.isArray(row.tattoo_images)
      ? row.tattoo_images.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map((img) => img.image_url).filter(Boolean)
      : [];

    return {
      id: row.id,
      image: images[0] || row.image_url || "",
      images,
      descriptionRu: row.description_ru || row.alt_ru || "",
      descriptionEn: row.description_en || row.alt_en || row.description_ru || "",
      altRu: row.alt_ru || row.description_ru || "Тату-работа bazookatattoo.",
      altEn: row.alt_en || row.description_en || "Tattoo work by bazookatattoo.",
      isPublished: row.is_published !== false,
      sortOrder: row.sort_order || 0,
    };
  }

  async function getPublicContent() {
    if (!client) return null;

    const [merchResult, tattooResult] = await Promise.all([
      client
        .from("merch_items")
        .select("*, merch_images(id, image_url, sort_order)")
        .eq("is_published", true)
        .order("sort_order", { ascending: true }),
      client
        .from("tattoo_works")
        .select("*, tattoo_images(id, image_url, sort_order)")
        .eq("is_published", true)
        .order("sort_order", { ascending: true }),
    ]);

    if (merchResult.error) throw merchResult.error;
    if (tattooResult.error) throw tattooResult.error;

    return {
      merchCollections: merchRowsToCollections(merchResult.data || []),
      tattooWorks: (tattooResult.data || []).map(toCamelWork),
    };
  }

  async function getAdminContent() {
    if (!client) throw new Error("Supabase is not configured");

    const [merchResult, tattooResult] = await Promise.all([
      client
        .from("merch_items")
        .select("*, merch_images(id, image_url, sort_order)")
        .order("sort_order", { ascending: true }),
      client
        .from("tattoo_works")
        .select("*, tattoo_images(id, image_url, sort_order)")
        .order("sort_order", { ascending: true }),
    ]);

    if (merchResult.error) throw merchResult.error;
    if (tattooResult.error) throw tattooResult.error;

    return {
      merchItems: (merchResult.data || []).map(toCamelItem),
      tattooWorks: (tattooResult.data || []).map(toCamelWork),
    };
  }

  function id(prefix) {
    if (crypto && crypto.randomUUID) return crypto.randomUUID();
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function slugFileName(name) {
    const clean = String(name || "image").toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-|-$/g, "");
    return clean || "image.jpg";
  }

  async function uploadImages(files, folder) {
    if (!client) throw new Error("Supabase is not configured");
    const uploaded = [];
    for (const file of Array.from(files || [])) {
      const path = `${folder}/${Date.now()}-${Math.random().toString(16).slice(2)}-${slugFileName(file.name)}`;
      const { error } = await client.storage.from(bucket).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || "image/jpeg",
      });
      if (error) throw error;
      const { data } = client.storage.from(bucket).getPublicUrl(path);
      uploaded.push(data.publicUrl);
    }
    return uploaded;
  }

  async function signIn(email, password) {
    if (!client) throw new Error("Supabase config is empty");
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    if (!client) return;
    await client.auth.signOut();
  }

  async function getSession() {
    if (!client) return null;
    const { data } = await client.auth.getSession();
    return data.session || null;
  }

  async function isAdmin() {
    if (!client) return false;
    const session = await getSession();
    if (!session) return false;
    const { data, error } = await client.from("admin_users").select("user_id").eq("user_id", session.user.id).maybeSingle();
    if (error) return false;
    return Boolean(data);
  }

  function pricesToDb(prices) {
    return (prices || []).filter((price) => price && price.currency && price.amount).map((price) => ({
      currency: String(price.currency).toUpperCase(),
      amount: String(price.amount),
    }));
  }

  async function saveMerchItem(item, imageUrls) {
    const row = {
      id: item.id || id("merch"),
      title_ru: item.titleRu,
      title_en: item.titleEn,
      category_ru: item.categoryRu || "Мерч",
      category_en: item.categoryEn || "Merch",
      collection_ru: item.collectionRu || "Мерч",
      collection_en: item.collectionEn || "Merch",
      description_ru: item.descriptionRu || "",
      description_en: item.descriptionEn || "",
      prices: pricesToDb(item.prices),
      in_stock: item.inStock !== false,
      is_published: item.isPublished !== false,
      instagram: item.instagram || "https://www.instagram.com/yugenmagaz/",
      telegram: item.telegram || "https://t.me/bazookatattoo",
      sort_order: Number(item.sortOrder || 0),
    };

    const { error } = await client.from("merch_items").upsert(row, { onConflict: "id" });
    if (error) throw error;

    if (Array.isArray(imageUrls) && imageUrls.length) {
      const del = await client.from("merch_images").delete().eq("item_id", row.id);
      if (del.error) throw del.error;
      const rows = imageUrls.map((url, index) => ({ id: id("merch-img"), item_id: row.id, image_url: url, sort_order: index }));
      const ins = await client.from("merch_images").insert(rows);
      if (ins.error) throw ins.error;
    }
    return row.id;
  }

  async function deleteMerchItem(itemId) {
    const { error } = await client.from("merch_items").delete().eq("id", itemId);
    if (error) throw error;
  }

  async function saveTattooWork(work, imageUrls) {
    const row = {
      id: work.id || id("work"),
      description_ru: work.descriptionRu || "",
      description_en: work.descriptionEn || "",
      alt_ru: work.altRu || work.descriptionRu || "Тату-работа bazookatattoo.",
      alt_en: work.altEn || work.descriptionEn || "Tattoo work by bazookatattoo.",
      is_published: work.isPublished !== false,
      sort_order: Number(work.sortOrder || 0),
    };

    const { error } = await client.from("tattoo_works").upsert(row, { onConflict: "id" });
    if (error) throw error;

    if (Array.isArray(imageUrls) && imageUrls.length) {
      const del = await client.from("tattoo_images").delete().eq("work_id", row.id);
      if (del.error) throw del.error;
      const rows = imageUrls.map((url, index) => ({ id: id("tattoo-img"), work_id: row.id, image_url: url, sort_order: index }));
      const ins = await client.from("tattoo_images").insert(rows);
      if (ins.error) throw ins.error;
    }
    return row.id;
  }

  async function deleteTattooWork(workId) {
    const { error } = await client.from("tattoo_works").delete().eq("id", workId);
    if (error) throw error;
  }

  window.BazookaCMS = {
    isReady,
    client,
    bucket,
    getPublicContent,
    getAdminContent,
    uploadImages,
    signIn,
    signOut,
    getSession,
    isAdmin,
    saveMerchItem,
    deleteMerchItem,
    saveTattooWork,
    deleteTattooWork,
  };
})();
