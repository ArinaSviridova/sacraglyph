(() => {
  "use strict";

  const cfg = window.BAZOOKA_SUPABASE || {};
  const PLACEHOLDER_RE = /PASTE_|YOUR_|CHANGE_ME/i;
  const ready = Boolean(cfg.url && cfg.anonKey && !PLACEHOLDER_RE.test(cfg.url) && !PLACEHOLDER_RE.test(cfg.anonKey));
  const bucket = cfg.bucket || "cms-media";
  const client = ready && window.supabase ? window.supabase.createClient(cfg.url, cfg.anonKey) : null;
  const MERCH_IMAGES_SELECT_SEO = "*, merch_images(id, image_url, alt_ru, alt_en, title_ru, title_en, sort_order)";
  const TATTOO_IMAGES_SELECT_SEO = "*, tattoo_images(id, image_url, alt_ru, alt_en, title_ru, title_en, sort_order)";
  const MERCH_IMAGES_SELECT_BASIC = "*, merch_images(id, image_url, sort_order)";
  const TATTOO_IMAGES_SELECT_BASIC = "*, tattoo_images(id, image_url, sort_order)";

  function isMissingImageSeoColumn(error) {
    const message = String(error?.message || error?.details || "").toLowerCase();
    return Boolean(error && (message.includes("alt_ru") || message.includes("alt_en") || message.includes("title_ru") || message.includes("title_en")));
  }

  function markMissingImageSeoSchema() {
    window.BAZOOKA_SCHEMA_NEEDS_IMAGE_SEO = true;
  }

  function isReady() {
    return Boolean(client);
  }

  function id(prefix) {
    if (crypto && crypto.randomUUID) return crypto.randomUUID();
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function slugify(value, fallback = "collection") {
    return String(value || fallback)
      .toLowerCase()
      .trim()
      .replace(/ё/g, "e")
      .replace(/[^a-zа-я0-9]+/gi, "-")
      .replace(/^-|-$/g, "") || fallback;
  }

  function toCamelCollection(row) {
    return {
      id: row.id,
      titleRu: row.title_ru || "Коллекция",
      titleEn: row.title_en || row.title_ru || "Collection",
      textRu: row.text_ru || "Выбери вещь и открой карточку для подробностей.",
      textEn: row.text_en || "Choose an item and open the card for details.",
      isPublished: row.is_published !== false,
      sortOrder: Number(row.sort_order || 0),
      isVirtual: false,
      items: [],
    };
  }

  function toCamelImage(row) {
    if (!row) return null;
    if (typeof row === "string") return { url: row, altRu: "", altEn: "", titleRu: "", titleEn: "", sortOrder: 0 };
    return {
      id: row.id || "",
      url: row.image_url || row.url || row.jpg || "",
      jpg: row.image_url || row.url || row.jpg || "",
      altRu: row.alt_ru || row.altRu || "",
      altEn: row.alt_en || row.altEn || "",
      titleRu: row.title_ru || row.titleRu || "",
      titleEn: row.title_en || row.titleEn || "",
      sortOrder: Number(row.sort_order ?? row.sortOrder ?? 0),
    };
  }

  function normalizeImageInput(image, index = 0) {
    const img = toCamelImage(image);
    return {
      id: id("img"),
      url: img?.url || img?.jpg || String(image || ""),
      altRu: img?.altRu || "",
      altEn: img?.altEn || "",
      titleRu: img?.titleRu || "",
      titleEn: img?.titleEn || "",
      sortOrder: Number(img?.sortOrder ?? index),
    };
  }

  function toCamelItem(row) {
    const prices = Array.isArray(row.prices) ? row.prices : [];
    const images = Array.isArray(row.merch_images)
      ? row.merch_images.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map(toCamelImage).filter((img) => img && img.url)
      : [];

    return {
      id: row.id,
      collectionId: row.collection_id || "",
      titleRu: row.title_ru || "",
      titleEn: row.title_en || row.title_ru || "",
      categoryRu: row.category_ru || "Мерч",
      categoryEn: row.category_en || "Merch",
      collectionRu: row.collection_ru || "Мерч",
      collectionEn: row.collection_en || "Merch",
      prices,
      stockStatus: row.stock_status || (row.in_stock === false ? "out" : "in"),
      inStock: row.in_stock !== false,
      descriptionRu: row.description_ru || "",
      descriptionEn: row.description_en || row.description_ru || "",
      images,
      instagram: row.instagram || "https://www.instagram.com/yugenmagaz/",
      telegram: row.telegram || "https://t.me/bazookatattoo",
      isPublished: row.is_published !== false,
      sortOrder: Number(row.sort_order || 0),
    };
  }

  function merchRowsToCollections(rows, collectionRows = [], includeEmpty = false) {
    const map = new Map();
    const collections = (collectionRows || []).map(toCamelCollection).sort((a, b) => a.sortOrder - b.sortOrder);

    collections.forEach((collection) => map.set(collection.id, { ...collection, items: [] }));

    (rows || []).forEach((row) => {
      const item = toCamelItem(row);
      let collection = item.collectionId ? map.get(item.collectionId) : null;

      if (!collection) {
        collection = collections.find((entry) => {
          return entry.titleRu === item.collectionRu || entry.titleEn === item.collectionEn;
        });
        if (collection) collection = map.get(collection.id);
      }

      if (!collection) {
        const virtualId = slugify(`${item.collectionRu}-${item.collectionEn}`, "merch");
        if (!map.has(virtualId)) {
          map.set(virtualId, {
            id: virtualId,
            titleRu: item.collectionRu || "Мерч",
            titleEn: item.collectionEn || "Merch",
            textRu: `Коллекция ${item.collectionRu || "Мерч"}. Выбери вещь и открой карточку для подробностей.`,
            textEn: `${item.collectionEn || "Merch"} collection. Choose an item and open the card for details.`,
            isPublished: true,
            sortOrder: 9999,
            isVirtual: true,
            items: [],
          });
        }
        collection = map.get(virtualId);
      }

      item.collectionId = collection.id;
      item.collectionRu = collection.titleRu;
      item.collectionEn = collection.titleEn;
      collection.items.push(item);
    });

    return Array.from(map.values())
      .map((collection) => ({
        ...collection,
        items: collection.items.sort((a, b) => a.sortOrder - b.sortOrder),
      }))
      .filter((collection) => includeEmpty || collection.items.length)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  function toCamelWork(row) {
    const images = Array.isArray(row.tattoo_images)
      ? row.tattoo_images.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map(toCamelImage).filter((img) => img && img.url)
      : [];

    return {
      id: row.id,
      image: images[0]?.url || row.image_url || "",
      images,
      descriptionRu: row.description_ru || row.alt_ru || "",
      descriptionEn: row.description_en || row.alt_en || row.description_ru || "",
      altRu: row.alt_ru || row.description_ru || "Тату-работа bazookatattoo.",
      altEn: row.alt_en || row.description_en || "Tattoo work by bazookatattoo.",
      isPublished: row.is_published !== false,
      sortOrder: Number(row.sort_order || 0),
    };
  }

  async function fetchCollections(onlyPublished = false) {
    if (!client) throw new Error("Supabase is not configured");
    let query = client.from("merch_collections").select("*").order("sort_order", { ascending: true });
    if (onlyPublished) query = query.eq("is_published", true);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async function selectMerchItems(onlyPublished = false, withSeo = true) {
    let query = client
      .from("merch_items")
      .select(withSeo ? MERCH_IMAGES_SELECT_SEO : MERCH_IMAGES_SELECT_BASIC)
      .order("sort_order", { ascending: true });
    if (onlyPublished) query = query.eq("is_published", true);
    const { data, error } = await query;
    if (error && withSeo && isMissingImageSeoColumn(error)) {
      markMissingImageSeoSchema();
      return selectMerchItems(onlyPublished, false);
    }
    if (error) throw error;
    return data || [];
  }

  async function selectTattooWorks(onlyPublished = false, withSeo = true) {
    let query = client
      .from("tattoo_works")
      .select(withSeo ? TATTOO_IMAGES_SELECT_SEO : TATTOO_IMAGES_SELECT_BASIC)
      .order("sort_order", { ascending: true });
    if (onlyPublished) query = query.eq("is_published", true);
    const { data, error } = await query;
    if (error && withSeo && isMissingImageSeoColumn(error)) {
      markMissingImageSeoSchema();
      return selectTattooWorks(onlyPublished, false);
    }
    if (error) throw error;
    return data || [];
  }

  async function getPublicContent() {
    if (!client) return null;

    const [collectionsResult, merchRows, tattooRows] = await Promise.all([
      client.from("merch_collections").select("*").eq("is_published", true).order("sort_order", { ascending: true }),
      selectMerchItems(true),
      selectTattooWorks(true),
    ]);

    if (collectionsResult.error) throw collectionsResult.error;

    return {
      merchCollections: merchRowsToCollections(merchRows || [], collectionsResult.data || [], false),
      tattooWorks: (tattooRows || []).map(toCamelWork),
    };
  }

  async function getAdminContent() {
    if (!client) throw new Error("Supabase is not configured");

    const [collectionsResult, merchRows, tattooRows] = await Promise.all([
      client.from("merch_collections").select("*").order("sort_order", { ascending: true }),
      selectMerchItems(false),
      selectTattooWorks(false),
    ]);

    if (collectionsResult.error) throw collectionsResult.error;

    const merchCollections = merchRowsToCollections(merchRows || [], collectionsResult.data || [], true);
    return {
      merchCollections,
      merchItems: (merchRows || []).map(toCamelItem),
      tattooWorks: (tattooRows || []).map(toCamelWork),
    };
  }

  function slugFileName(name) {
    const clean = String(name || "image.webp").toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-|-$/g, "");
    return clean || "image.webp";
  }

  function assertImageFile(file) {
    const name = String(file?.name || "").toLowerCase();
    const type = String(file?.type || "").toLowerCase();
    const allowedByType = type.startsWith("image/");
    const allowedByName = /\.(jpe?g|png|webp|avif|gif|heic|heif)$/i.test(name);
    if (!allowedByType && !allowedByName) {
      throw new Error("Это не похоже на фото. Загружай JPG, PNG, WEBP, AVIF, HEIC/HEIF или другой нормальный image-файл.");
    }
  }

  function webpFileName(name) {
    const base = slugFileName(name || "image.webp")
      .replace(/\.(jpe?g|png|webp|avif|gif|heic|heif)$/i, "")
      .replace(/\.+$/g, "") || "image";
    return `${base}.webp`;
  }

  function loadFileAsImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error(`Браузер не смог прочитать файл “${file.name}”. Если это HEIC/HEIF, пересохрани его в JPG или PNG и загрузи снова. Да, формально “любой формат”, но браузеры всё ещё живут своей тревожной жизнью.`));
      };
      image.src = url;
    });
  }

  async function fileToBitmap(file) {
    if ("createImageBitmap" in window) {
      try {
        return await createImageBitmap(file, { imageOrientation: "from-image" });
      } catch (error) {
        // fallback ниже через Image, потому что поддержка форматов у браузеров - цирк без расписания
      }
    }
    return loadFileAsImage(file);
  }

  function canvasToWebpBlob(canvas, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Не удалось сжать фото в .webp. Попробуй другой файл или другой браузер."));
      }, "image/webp", quality);
    });
  }

  async function convertImageFileToWebp(file, options = {}) {
    assertImageFile(file);
    const maxSide = Number(options.maxSide || 1800);
    const quality = Number(options.quality || 0.84);
    const bitmap = await fileToBitmap(file);
    const originalWidth = bitmap.width || bitmap.naturalWidth;
    const originalHeight = bitmap.height || bitmap.naturalHeight;
    if (!originalWidth || !originalHeight) throw new Error(`Не удалось определить размер фото “${file.name}”.`);

    const ratio = Math.min(1, maxSide / Math.max(originalWidth, originalHeight));
    const width = Math.max(1, Math.round(originalWidth * ratio));
    const height = Math.max(1, Math.round(originalHeight * ratio));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) throw new Error("Браузер не дал доступ к canvas для сжатия фото. Очень зрелое поведение, конечно.");
    context.drawImage(bitmap, 0, 0, width, height);
    if (bitmap.close) bitmap.close();

    const blob = await canvasToWebpBlob(canvas, quality);
    return {
      blob,
      fileName: webpFileName(file.name),
      originalName: file.name,
      originalSize: file.size || 0,
      size: blob.size || 0,
      width,
      height,
    };
  }

  async function uploadBlob(blob, folder, fileName) {
    if (!client) throw new Error("Supabase is not configured");
    const safeName = webpFileName(fileName);
    const path = `${folder}/${Date.now()}-${Math.random().toString(16).slice(2)}-${safeName}`;
    const { error } = await client.storage.from(bucket).upload(path, blob, {
      cacheControl: "31536000",
      upsert: false,
      contentType: "image/webp",
    });
    if (error) throw error;
    const { data } = client.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  async function uploadImages(files, folder) {
    const uploaded = [];
    for (const file of Array.from(files || [])) {
      const converted = await convertImageFileToWebp(file);
      const url = await uploadBlob(converted.blob, folder, converted.fileName);
      uploaded.push({
        url,
        altRu: "",
        altEn: "",
        titleRu: "",
        titleEn: "",
        sortOrder: uploaded.length,
        width: converted.width,
        height: converted.height,
      });
    }
    return uploaded;
  }

  async function uploadLegacyImageUrl(url, folder) {
    if (!url) return "";
    if (/^https:\/\//i.test(url) && url.includes("/storage/v1/object/public/")) return { url, altRu: "", altEn: "", titleRu: "", titleEn: "", sortOrder: 0 };
    const response = await fetch(url, { cache: "force-cache" });
    if (!response.ok) throw new Error(`Не удалось загрузить старое фото: ${url}`);
    const blob = await response.blob();
    const name = String(url).split("/").pop() || "legacy-image.webp";
    const publicUrl = await uploadBlob(blob, folder, name);
    return { url: publicUrl, altRu: "", altEn: "", titleRu: "", titleEn: "", sortOrder: 0 };
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

  async function saveMerchCollection(collection) {
    const row = {
      id: collection.id || id("collection"),
      title_ru: collection.titleRu || "Коллекция",
      title_en: collection.titleEn || collection.titleRu || "Collection",
      text_ru: collection.textRu || "",
      text_en: collection.textEn || "",
      is_published: collection.isPublished !== false,
      sort_order: Number(collection.sortOrder || 0),
    };
    const { data, error } = await client.from("merch_collections").upsert(row, { onConflict: "id" }).select("id").single();
    if (error) throw error;
    return data?.id || row.id;
  }

  async function deleteMerchCollection(collectionId) {
    const { error } = await client.from("merch_collections").delete().eq("id", collectionId);
    if (error) throw error;
  }

  async function saveMerchItem(item, imageUrls) {
    const row = {
      id: item.id || id("merch"),
      collection_id: item.collectionId || null,
      title_ru: item.titleRu,
      title_en: item.titleEn,
      category_ru: item.categoryRu || "Мерч",
      category_en: item.categoryEn || "Merch",
      collection_ru: item.collectionRu || "Мерч",
      collection_en: item.collectionEn || "Merch",
      description_ru: item.descriptionRu || "",
      description_en: item.descriptionEn || "",
      prices: pricesToDb(item.prices),
      stock_status: item.stockStatus || (item.inStock === false ? "out" : "in"),
      in_stock: (item.stockStatus || (item.inStock === false ? "out" : "in")) !== "out",
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
      const rows = imageUrls.map((image, index) => {
        const normalized = normalizeImageInput(image, index);
        return {
          id: id("merch-img"),
          item_id: row.id,
          image_url: normalized.url,
          alt_ru: normalized.altRu || "",
          alt_en: normalized.altEn || "",
          title_ru: normalized.titleRu || "",
          title_en: normalized.titleEn || "",
          sort_order: Number(normalized.sortOrder ?? index),
        };
      }).filter((image) => image.image_url);
      const ins = await client.from("merch_images").insert(rows);
      if (ins.error && isMissingImageSeoColumn(ins.error)) {
        throw new Error("В Supabase не хватает SEO-колонок у merch_images. Запусти свежий /supabase/schema.sql в SQL Editor и обнови страницу.");
      }
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
      const rows = imageUrls.map((image, index) => {
        const normalized = normalizeImageInput(image, index);
        return {
          id: id("tattoo-img"),
          work_id: row.id,
          image_url: normalized.url,
          alt_ru: normalized.altRu || "",
          alt_en: normalized.altEn || "",
          title_ru: normalized.titleRu || "",
          title_en: normalized.titleEn || "",
          sort_order: Number(normalized.sortOrder ?? index),
        };
      }).filter((image) => image.image_url);
      const ins = await client.from("tattoo_images").insert(rows);
      if (ins.error && isMissingImageSeoColumn(ins.error)) {
        throw new Error("В Supabase не хватает SEO-колонок у tattoo_images. Запусти свежий /supabase/schema.sql в SQL Editor и обнови страницу.");
      }
      if (ins.error) throw ins.error;
    }
    return row.id;
  }

  async function deleteTattooWork(workId) {
    const { error } = await client.from("tattoo_works").delete().eq("id", workId);
    if (error) throw error;
  }


  async function updateMerchOrders(updates) {
    for (const update of updates || []) {
      const row = { sort_order: Number(update.sortOrder || 0) };
      if (update.collectionId !== undefined) row.collection_id = update.collectionId || null;
      const { error } = await client.from("merch_items").update(row).eq("id", update.id);
      if (error) throw error;
    }
  }

  async function updateTattooOrders(updates) {
    for (const update of updates || []) {
      const { error } = await client.from("tattoo_works").update({ sort_order: Number(update.sortOrder || 0) }).eq("id", update.id);
      if (error) throw error;
    }
  }

  async function updateCollectionOrders(updates) {
    for (const update of updates || []) {
      const { error } = await client.from("merch_collections").update({ sort_order: Number(update.sortOrder || 0) }).eq("id", update.id);
      if (error) throw error;
    }
  }

  async function bulkUpdateMerchStock(ids, stockStatus) {
    const status = stockStatus || "in";
    const { error } = await client
      .from("merch_items")
      .update({ stock_status: status, in_stock: status !== "out" })
      .in("id", ids || []);
    if (error) throw error;
  }

  window.BazookaCMS = {
    isReady,
    client,
    bucket,
    getPublicContent,
    getAdminContent,
    fetchCollections,
    uploadImages,
    uploadLegacyImageUrl,
    signIn,
    signOut,
    getSession,
    isAdmin,
    saveMerchCollection,
    deleteMerchCollection,
    saveMerchItem,
    deleteMerchItem,
    saveTattooWork,
    deleteTattooWork,
    updateMerchOrders,
    updateTattooOrders,
    updateCollectionOrders,
    bulkUpdateMerchStock,
  };
})();
