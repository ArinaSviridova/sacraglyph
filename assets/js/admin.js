(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const cms = window.BazookaCMS;

  let merchItems = [];
  let merchCollections = [];
  let tattooWorks = [];
  let editingMerchImages = [];
  let editingTattooImages = [];

  function status(message, isError = false) {
    const el = $("#adminStatus");
    if (!el) return;
    el.textContent = message;
    el.classList.toggle("adminStatusError", Boolean(isError));
  }

  function text(id) {
    return ($(id)?.value || "").trim();
  }

  function setValue(id, value) {
    const el = $(id);
    if (el) el.value = value ?? "";
  }

  function escapeHtml(str) {
    return String(str || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function slugify(value, fallback = "collection") {
    return String(value || fallback)
      .toLowerCase()
      .trim()
      .replace(/ё/g, "e")
      .replace(/[^a-zа-я0-9]+/gi, "-")
      .replace(/^-|-$/g, "") || fallback;
  }

  function pricesFromForm() {
    return [
      ["GEL", text("#priceGel")],
      ["USD", text("#priceUsd")],
      ["EUR", text("#priceEur")],
    ].filter(([, amount]) => amount).map(([currency, amount]) => ({ currency, amount }));
  }

  function fillPrices(prices) {
    const byCurrency = Object.fromEntries((prices || []).map((price) => [price.currency, price.amount]));
    setValue("#priceGel", byCurrency.GEL || "");
    setValue("#priceUsd", byCurrency.USD || "");
    setValue("#priceEur", byCurrency.EUR || "");
  }

  function imageUrl(image) {
    if (!image) return "";
    if (typeof image === "string") return image;
    return image.url || image.jpg || image.image_url || "";
  }

  function firstImage(images) {
    return Array.isArray(images) && images.length ? imageUrl(images[0]) : "";
  }

  function merchStockStatus(item) {
    return item?.stockStatus || (item?.inStock === false ? "out" : "in");
  }

  function stockLabel(statusValue) {
    const value = statusValue || "in";
    if (value === "out") return "нет в наличии";
    if (value === "preorder") return "под заказ";
    return "в наличии";
  }

  function normalizeImage(image, index = 0) {
    if (!image) return null;
    if (typeof image === "string") {
      return { url: image, altRu: "", altEn: "", titleRu: "", titleEn: "", sortOrder: index };
    }
    return {
      url: image.url || image.jpg || image.image_url || "",
      altRu: image.altRu || image.alt_ru || "",
      altEn: image.altEn || image.alt_en || "",
      titleRu: image.titleRu || image.title_ru || "",
      titleEn: image.titleEn || image.title_en || "",
      sortOrder: Number(image.sortOrder ?? image.sort_order ?? index),
    };
  }

  function renderImageManager(containerId, images, inputId, prefix) {
    const container = $(containerId);
    const input = $(inputId);
    if (!container) return;
    const files = Array.from(input?.files || []);
    const existingRows = (images || []).map((image, index) => renderImageRow(normalizeImage(image, index), index, "existing", prefix));
    const newRows = files.map((file, index) => {
      const preview = URL.createObjectURL(file);
      const image = { url: preview, altRu: "", altEn: "", titleRu: "", titleEn: "", sortOrder: existingRows.length + index, fileName: file.name };
      return renderImageRow(image, existingRows.length + index, "new", prefix, file.name);
    });
    const empty = !existingRows.length && !newRows.length;
    container.innerHTML = `
      <div class="adminImageManagerHead">
        <div>
          <strong>Фото и SEO для каждого фото</strong>
          <span>Заглавное фото будет первым на сайте. Остальные откроются внутри карточки. Новые файлы перед загрузкой автоматически сжимаются и конвертируются в .webp.</span>
        </div>
        <div class="adminImageManagerBadge">авто .webp</div>
      </div>
      <div class="adminSeoGuide">
        <b>Как подписывать:</b> в ALT пиши коротко, что видно на фото: предмет/работа, стиль, цвет, важная деталь. Без набора ключей через запятую.
        <br><b>Пример RU:</b> “Черная футболка Yugen с белым lettering-принтом на груди”.
        <br><b>Пример EN:</b> “Black Yugen T-shirt with white lettering print on the chest”.
      </div>
      ${empty ? `<p class="adminTiny">Фото пока не выбраны. Выбери JPG, PNG, WEBP, AVIF или HEIC/HEIF выше, и здесь появятся строки для порядка, заглавного фото и SEO-подписей. При сохранении файлы станут сжатыми .webp.</p>` : `<div class="adminImageRows">${existingRows.concat(newRows).join("")}</div>`}
    `;
  }

  function renderImageRow(image, index, kind, prefix, fileName = "") {
    const safeUrl = imageUrl(image);
    const name = fileName || safeUrl.split("/").pop() || `Фото ${index + 1}`;
    return `
      <article class="adminImageRow" data-image-kind="${kind}" data-image-index="${index}" data-image-url="${escapeHtml(kind === "existing" ? safeUrl : "")}">
        <div class="adminImagePreview">${safeUrl ? `<img src="${escapeHtml(safeUrl)}" alt="">` : ""}</div>
        <div class="adminImageFields">
          <div class="adminImageFileName">${escapeHtml(name)}</div>
          <div class="adminThree">
            <label class="adminCheck"><input type="radio" name="${prefix}Cover" ${index === 0 ? "checked" : ""}> Заглавная</label>
            <div class="adminField"><label>Порядок</label><input class="adminInput" data-image-field="sortOrder" inputmode="numeric" value="${escapeHtml(image.sortOrder ?? index)}"></div>
            <label class="adminCheck"><input type="checkbox" data-image-remove> Убрать фото</label>
          </div>
          <div class="adminImageSeoBox">
            <div class="adminSeoBoxTitle">SEO-подпись этого фото</div>
            <div class="adminTwo">
              <div class="adminField"><label>ALT RU - что изображено на фото</label><input class="adminInput" data-image-field="altRu" placeholder="Черная футболка Yugen с белым lettering-принтом" value="${escapeHtml(image.altRu || "")}"></div>
              <div class="adminField"><label>ALT EN - same description in English</label><input class="adminInput" data-image-field="altEn" placeholder="Black Yugen T-shirt with white lettering print" value="${escapeHtml(image.altEn || "")}"></div>
            </div>
            <div class="adminTwo">
              <div class="adminField"><label>Title RU - короткая подпись при наведении</label><input class="adminInput" data-image-field="titleRu" placeholder="Yugen Black - футболка с lettering-принтом" value="${escapeHtml(image.titleRu || "")}"></div>
              <div class="adminField"><label>Title EN - short hover title</label><input class="adminInput" data-image-field="titleEn" placeholder="Yugen Black - lettering T-shirt" value="${escapeHtml(image.titleEn || "")}"></div>
            </div>
            <p class="adminSeoMiniHint">ALT важнее для SEO и доступности. Title можно делать короче. Это не текст на странице, он живёт внутри HTML-картинки.</p>
          </div>
        </div>
      </article>
    `;
  }

  function collectImageManager(containerId) {
    const rows = $$(".adminImageRow", $(containerId));
    const existingTotal = rows.filter((row) => row.dataset.imageKind === "existing").length;
    const items = rows.map((row, visualIndex) => {
      const field = (name) => row.querySelector(`[data-image-field="${name}"]`)?.value?.trim() || "";
      const sourceIndex = Number(row.dataset.imageIndex || visualIndex);
      return {
        kind: row.dataset.imageKind,
        sourceIndex,
        fileIndex: row.dataset.imageKind === "new" ? sourceIndex - existingTotal : -1,
        url: row.dataset.imageUrl || "",
        altRu: field("altRu"),
        altEn: field("altEn"),
        titleRu: field("titleRu"),
        titleEn: field("titleEn"),
        sortOrder: Number(field("sortOrder") || visualIndex),
        remove: Boolean(row.querySelector("[data-image-remove]")?.checked),
        cover: Boolean(row.querySelector('input[type="radio"]')?.checked),
      };
    }).filter((item) => !item.remove);
    const cover = items.find((item) => item.cover);
    const sorted = items.slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    if (cover) {
      const withoutCover = sorted.filter((item) => item !== cover);
      return [cover, ...withoutCover].map((item, index) => ({ ...item, sortOrder: index }));
    }
    return sorted.map((item, index) => ({ ...item, sortOrder: index }));
  }

  async function buildImagesForSave(inputId, containerId, folder) {
    const meta = collectImageManager(containerId);
    const files = Array.from($(inputId)?.files || []);
    const uploads = await cms.uploadImages(files, folder);
    return meta.map((entry) => {
      const base = entry.kind === "new" ? uploads[entry.fileIndex] : { url: entry.url };
      return {
        url: base?.url || base?.jpg || entry.url || "",
        altRu: entry.altRu,
        altEn: entry.altEn,
        titleRu: entry.titleRu,
        titleEn: entry.titleEn,
        sortOrder: entry.sortOrder,
      };
    }).filter((image) => image.url);
  }

  function priceLabel(item) {
    const statusText = stockLabel(merchStockStatus(item));
    const prices = (item.prices || []).map((price) => `${price.amount} ${price.currency}`).join(" / ");
    return prices ? `${prices} · ${statusText}` : statusText;
  }

  function collectionById(id) {
    return merchCollections.find((collection) => collection.id === id) || null;
  }

  function collectionForItem(item) {
    return collectionById(item.collectionId) || merchCollections.find((collection) => {
      return collection.titleRu === item.collectionRu || collection.titleEn === item.collectionEn;
    }) || null;
  }

  async function loadContent() {
    const content = await cms.getAdminContent();
    merchCollections = (content.merchCollections || []).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    merchItems = (content.merchItems || []).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    tattooWorks = (content.tattooWorks || []).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    renderAll();
    if (window.BAZOOKA_SCHEMA_NEEDS_IMAGE_SEO) {
      status("В Supabase не хватает SEO-колонок для фото. Запусти свежий /supabase/schema.sql в SQL Editor и обнови страницу.", true);
    }
  }

  function renderCollectionSelect() {
    const select = $("#merchCollectionId");
    if (!select) return;
    select.innerHTML = merchCollections.length
      ? merchCollections.map((collection) => `<option value="${escapeHtml(collection.id)}">№${escapeHtml(collection.sortOrder)} · ${escapeHtml(collection.titleRu)} / ${escapeHtml(collection.titleEn)}</option>`).join("")
      : `<option value="">Сначала создай коллекцию выше</option>`;
  }

  function renderMerchList() {
    const list = $("#merchList");
    if (!list) return;

    renderCollectionSelect();

    if (!merchCollections.length && !merchItems.length) {
      list.innerHTML = `<p class="adminTiny">Пока товаров и коллекций нет. Пустота, но с административными правами.</p>`;
      return;
    }

    const assigned = new Set();
    const collectionBlocks = merchCollections.map((collection) => {
      const items = merchItems
        .filter((item) => {
          const belongs = item.collectionId === collection.id || (!item.collectionId && (item.collectionRu === collection.titleRu || item.collectionEn === collection.titleEn));
          if (belongs) assigned.add(item.id);
          return belongs;
        })
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

      return `
        <section class="adminCollectionGroup" data-sort-id="${escapeHtml(collection.id)}" data-collection-id="${escapeHtml(collection.id)}">
          <div class="adminCollectionHead">
            <button class="adminDragHandle" type="button" data-drag-handle aria-label="Передвинуть коллекцию">☰</button>
            <div>
              <div class="adminItemTitle">№${escapeHtml(collection.sortOrder)} · ${escapeHtml(collection.titleRu)} / ${escapeHtml(collection.titleEn)}</div>
              <div class="adminItemMeta">${items.length} товар(ов) · ${collection.isVirtual ? "нужно сохранить как коллекцию" : (collection.isPublished === false ? "скрыта" : "опубликована")}</div>
            </div>
            <div class="adminActions compact">
              <button class="adminButton" type="button" data-edit-collection="${escapeHtml(collection.id)}">Редактировать коллекцию</button>
              <button class="adminButton adminDanger" type="button" data-delete-collection="${escapeHtml(collection.id)}">Удалить</button>
            </div>
          </div>
          <div class="adminBulkBar">
            <label class="adminCheck"><input type="checkbox" data-select-all-merch="${escapeHtml(collection.id)}"> выбрать всё в коллекции</label>
            <button class="adminButton" type="button" data-bulk-stock="in" data-bulk-collection="${escapeHtml(collection.id)}">В наличии</button>
            <button class="adminButton" type="button" data-bulk-stock="preorder" data-bulk-collection="${escapeHtml(collection.id)}">Под заказ</button>
            <button class="adminButton" type="button" data-bulk-stock="out" data-bulk-collection="${escapeHtml(collection.id)}">Нет в наличии</button>
          </div>
          <div class="adminList compactList adminSortable" data-sortable="merch" data-collection-id="${escapeHtml(collection.id)}">
            ${items.length ? items.map(renderMerchItem).join("") : `<p class="adminTiny">В этой коллекции пока нет товаров. Лента появится на сайте, когда добавишь товар.</p>`}
          </div>
        </section>
      `;
    }).join("");

    const unassigned = merchItems.filter((item) => !assigned.has(item.id));
    const unassignedBlock = unassigned.length ? `
      <section class="adminCollectionGroup" data-collection-id="">
        <div class="adminCollectionHead">
          <div>
            <div class="adminItemTitle">Без коллекции</div>
            <div class="adminItemMeta">${unassigned.length} товар(ов), которые надо пристроить в нормальный дом</div>
          </div>
        </div>
        <div class="adminList compactList adminSortable" data-sortable="merch" data-collection-id="">${unassigned.map(renderMerchItem).join("")}</div>
      </section>
    ` : "";

    list.innerHTML = `
      <div class="adminBulkBar global">
        <label class="adminCheck"><input type="checkbox" id="selectAllMerchGlobal"> выбрать все товары</label>
        <button class="adminButton" type="button" data-bulk-stock="in">Все выбранные: в наличии</button>
        <button class="adminButton" type="button" data-bulk-stock="preorder">Все выбранные: под заказ</button>
        <button class="adminButton" type="button" data-bulk-stock="out">Все выбранные: нет в наличии</button>
        <span class="adminTiny">Очередность меняется перетаскиванием за ☰. В мерче номер считается отдельно внутри каждой коллекции.</span>
      </div>
      <div class="adminSortable" data-sortable="collections">${collectionBlocks}</div>
      ${unassignedBlock}
    `;
    setupSortableLists();
  }

  function renderMerchItem(item) {
    const collection = collectionForItem(item);
    return `
      <article class="adminItem" data-sort-id="${escapeHtml(item.id)}" data-merch-id="${escapeHtml(item.id)}">
        <button class="adminDragHandle" type="button" data-drag-handle aria-label="Передвинуть товар">☰</button>
        <label class="adminSelectBox"><input type="checkbox" data-merch-select value="${escapeHtml(item.id)}"></label>
        ${firstImage(item.images) ? `<img src="${escapeHtml(firstImage(item.images))}" alt="">` : ""}
        <div class="adminItemText">
          <div class="adminItemTitle">№${escapeHtml(item.sortOrder)} · ${escapeHtml(item.titleRu || item.titleEn || "Без названия")}</div>
          <div class="adminItemMeta">${escapeHtml(collection?.titleRu || item.collectionRu || "Без коллекции")} · ${escapeHtml(priceLabel(item))}</div>
        </div>
        <button class="adminButton" type="button" data-edit-merch="${escapeHtml(item.id)}">Редактировать</button>
        <button class="adminButton adminDanger" type="button" data-delete-merch="${escapeHtml(item.id)}">Удалить</button>
      </article>
    `;
  }

  function renderTattooList() {
    const list = $("#tattooList");
    if (!list) return;
    list.innerHTML = tattooWorks.length ? `
      <div class="adminTiny adminOrderHint">Очередность меняется перетаскиванием за ☰. После отпускания порядок сразу сохраняется.</div>
      <div class="adminList adminSortable" data-sortable="tattoo">
        ${tattooWorks.map((work) => `
          <article class="adminItem" data-sort-id="${escapeHtml(work.id)}">
            <button class="adminDragHandle" type="button" data-drag-handle aria-label="Передвинуть работу">☰</button>
            ${firstImage(work.images) || work.image ? `<img src="${escapeHtml(firstImage(work.images) || work.image)}" alt="">` : ""}
            <div class="adminItemText">
              <div class="adminItemTitle">№${escapeHtml(work.sortOrder)} · ${escapeHtml((work.descriptionRu || "Работа").slice(0, 100))}</div>
              <div class="adminItemMeta">${escapeHtml((work.descriptionEn || "").slice(0, 120))}</div>
            </div>
            <button class="adminButton" type="button" data-edit-tattoo="${escapeHtml(work.id)}">Редактировать</button>
            <button class="adminButton adminDanger" type="button" data-delete-tattoo="${escapeHtml(work.id)}">Удалить</button>
          </article>
        `).join("")}
      </div>
    ` : `<p class="adminTiny">Пока работ нет.</p>`;
    setupSortableLists();
  }

  function renderAll() {
    renderMerchList();
    renderTattooList();
    renderImageManager("#merchImageManager", editingMerchImages, "#merchImages", "merch");
    renderImageManager("#tattooImageManager", editingTattooImages, "#tattooImages", "tattoo");
  }

  function clearCollectionForm() {
    $("#collectionForm").reset();
    setValue("#collectionEditId", "");
  }

  function clearMerchForm() {
    $("#merchForm").reset();
    setValue("#merchEditId", "");
    setValue("#merchEtsyUrl", "https://yugenmagazart.etsy.com");
    editingMerchImages = [];
    renderCollectionSelect();
    renderImageManager("#merchImageManager", editingMerchImages, "#merchImages", "merch");
  }

  function clearTattooForm() {
    $("#tattooForm").reset();
    setValue("#tattooEditId", "");
    editingTattooImages = [];
    renderImageManager("#tattooImageManager", editingTattooImages, "#tattooImages", "tattoo");
  }

  async function onCollectionSubmit(event) {
    event.preventDefault();
    try {
      status("Сохраняю коллекцию...");
      const editId = text("#collectionEditId");
      await cms.saveMerchCollection({
        id: editId || `collection-${slugify(text("#collectionTitleEn") || text("#collectionTitleRu"))}`,
        titleRu: text("#collectionTitleRu"),
        titleEn: text("#collectionTitleEn"),
        textRu: text("#collectionTextRu"),
        textEn: text("#collectionTextEn"),
        isPublished: $("#collectionPublished").value === "true",
        sortOrder: Number(text("#collectionSortOrder") || merchCollections.length),
      });
      clearCollectionForm();
      await loadContent();
      status("Коллекция сохранена.");
    } catch (error) {
      status(error.message || "Не удалось сохранить коллекцию", true);
    }
  }

  async function onMerchSubmit(event) {
    event.preventDefault();
    try {
      status("Сжимаю фото и сохраняю товар...");
      const editId = text("#merchEditId");
      const existing = merchItems.find((item) => item.id === editId);
      const collectionId = text("#merchCollectionId");
      let collection = collectionById(collectionId);
      if (!collection) throw new Error("Сначала выбери коллекцию. Да, товару нужен дом.");
      if (collection.isVirtual) {
        await cms.saveMerchCollection(collection);
        collection = { ...collection, isVirtual: false };
      }
      const itemImages = await buildImagesForSave("#merchImages", "#merchImageManager", "merch");
      const item = {
        id: editId || undefined,
        collectionId,
        titleRu: text("#merchTitleRu"),
        titleEn: text("#merchTitleEn"),
        categoryRu: text("#merchCategoryRu") || "Мерч",
        categoryEn: text("#merchCategoryEn") || "Merch",
        collectionRu: collection.titleRu,
        collectionEn: collection.titleEn,
        prices: pricesFromForm(),
        stockStatus: $("#merchStock").value,
        inStock: $("#merchStock").value !== "out",
        isPublished: $("#merchPublished").value === "true",
        descriptionRu: text("#merchDescriptionRu"),
        descriptionEn: text("#merchDescriptionEn"),
        instagram: "https://www.instagram.com/yugenmagaz/",
        telegram: "https://t.me/bazookatattoo",
        etsyUrl: text("#merchEtsyUrl") || "https://yugenmagazart.etsy.com",
        sortOrder: Number(text("#merchSortOrder") || 0),
      };
      await cms.saveMerchItem(item, itemImages.length ? itemImages : existing?.images || []);
      clearMerchForm();
      await loadContent();
      status("Товар сохранён.");
    } catch (error) {
      status(error.message || "Не удалось сохранить товар", true);
    }
  }

  async function onTattooSubmit(event) {
    event.preventDefault();
    try {
      status("Сжимаю фото и сохраняю работу...");
      const editId = text("#tattooEditId");
      const existing = tattooWorks.find((work) => work.id === editId);
      const workImages = await buildImagesForSave("#tattooImages", "#tattooImageManager", "tattoo");
      const work = {
        id: editId || undefined,
        descriptionRu: text("#tattooDescriptionRu"),
        descriptionEn: text("#tattooDescriptionEn"),
        altRu: text("#tattooDescriptionRu"),
        altEn: text("#tattooDescriptionEn"),
        isPublished: $("#tattooPublished").value === "true",
        sortOrder: Number(text("#tattooSortOrder") || tattooWorks.length),
      };
      await cms.saveTattooWork(work, workImages.length ? workImages : existing?.images || (existing?.image ? [existing.image] : []));
      clearTattooForm();
      await loadContent();
      status("Работа сохранена.");
    } catch (error) {
      status(error.message || "Не удалось сохранить работу", true);
    }
  }

  function editCollection(id) {
    const collection = merchCollections.find((entry) => entry.id === id);
    if (!collection) return;
    setValue("#collectionEditId", collection.id);
    setValue("#collectionTitleRu", collection.titleRu);
    setValue("#collectionTitleEn", collection.titleEn);
    setValue("#collectionTextRu", collection.textRu);
    setValue("#collectionTextEn", collection.textEn);
    setValue("#collectionSortOrder", collection.sortOrder || "");
    $("#collectionPublished").value = collection.isPublished === false ? "false" : "true";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function editMerch(id) {
    const item = merchItems.find((entry) => entry.id === id);
    if (!item) return;
    setValue("#merchEditId", item.id);
    setValue("#merchTitleRu", item.titleRu);
    setValue("#merchTitleEn", item.titleEn);
    renderCollectionSelect();
    const collection = collectionForItem(item);
    if (collection) $("#merchCollectionId").value = collection.id;
    setValue("#merchSortOrder", item.sortOrder || "");
    setValue("#merchCategoryRu", item.categoryRu);
    setValue("#merchCategoryEn", item.categoryEn);
    fillPrices(item.prices);
    $("#merchStock").value = merchStockStatus(item);
    $("#merchPublished").value = item.isPublished === false ? "false" : "true";
    setValue("#merchDescriptionRu", item.descriptionRu);
    setValue("#merchDescriptionEn", item.descriptionEn);
    setValue("#merchEtsyUrl", item.etsyUrl || item.etsy_url || "https://yugenmagazart.etsy.com");
    editingMerchImages = (item.images || []).map(normalizeImage).filter(Boolean);
    $("#merchImages").value = "";
    renderImageManager("#merchImageManager", editingMerchImages, "#merchImages", "merch");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function editTattoo(id) {
    const work = tattooWorks.find((entry) => entry.id === id);
    if (!work) return;
    setValue("#tattooEditId", work.id);
    setValue("#tattooDescriptionRu", work.descriptionRu || work.altRu);
    setValue("#tattooDescriptionEn", work.descriptionEn || work.altEn);
    setValue("#tattooSortOrder", work.sortOrder || "");
    $("#tattooPublished").value = work.isPublished === false ? "false" : "true";
    editingTattooImages = (work.images && work.images.length ? work.images : (work.image ? [work.image] : [])).map(normalizeImage).filter(Boolean);
    $("#tattooImages").value = "";
    renderImageManager("#tattooImageManager", editingTattooImages, "#tattooImages", "tattoo");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteCollection(id) {
    if (!confirm("Удалить коллекцию? Товары останутся, но станут без коллекции.")) return;
    try {
      await cms.deleteMerchCollection(id);
      await loadContent();
      status("Коллекция удалена.");
    } catch (error) {
      status(error.message || "Не удалось удалить коллекцию", true);
    }
  }

  async function deleteMerch(id) {
    if (!confirm("Удалить товар?")) return;
    try {
      await cms.deleteMerchItem(id);
      await loadContent();
      status("Товар удалён.");
    } catch (error) {
      status(error.message || "Не удалось удалить товар", true);
    }
  }

  async function deleteTattoo(id) {
    if (!confirm("Удалить работу?")) return;
    try {
      await cms.deleteTattooWork(id);
      await loadContent();
      status("Работа удалена.");
    } catch (error) {
      status(error.message || "Не удалось удалить работу", true);
    }
  }

  async function uploadLegacyImages(urls, folder) {
    const uploaded = [];
    for (const url of (urls || []).filter(Boolean)) {
      uploaded.push(await cms.uploadLegacyImageUrl(url, folder));
    }
    return uploaded;
  }

  async function seedTattooWorks() {
    const seed = window.BAZOOKA_SEED_CONTENT || {};
    const works = seed.tattooWorks || [];
    if (!works.length) {
      status("В seed-файле нет старых работ.", true);
      return;
    }
    if (!confirm(`Загрузить ${works.length} старых тату-работ в Supabase и скопировать фото в Storage?`)) return;

    try {
      status("Переношу старые тату-работы и копирую фото в Storage...");
      for (let index = 0; index < works.length; index += 1) {
        const work = works[index];
        status(`Переношу тату-работу ${index + 1}/${works.length}...`);
        const images = (await uploadLegacyImages([work.image], "legacy-tattoo")).map((image, imageIndex) => ({
          ...normalizeImage(image, imageIndex),
          altRu: "",
          altEn: "",
          titleRu: "",
          titleEn: "",
        }));
        await cms.saveTattooWork({
          id: work.id,
          descriptionRu: work.descriptionRu,
          descriptionEn: work.descriptionEn,
          altRu: work.altRu,
          altEn: work.altEn,
          isPublished: true,
          sortOrder: Number(work.sortOrder || index),
        }, images.length ? images : [work.image]);
      }
      await loadContent();
      status("Старые тату-работы перенесены в Supabase, фото скопированы в Storage.");
    } catch (error) {
      status(error.message || "Не удалось перенести старые работы", true);
    }
  }

  async function seedMerchItems() {
    const seed = window.BAZOOKA_SEED_CONTENT || {};
    const items = seed.merchItems || [];
    if (!items.length) {
      status("В seed-файле нет старого мерча.", true);
      return;
    }
    if (!confirm(`Загрузить ${items.length} старых товаров в Supabase, создать коллекции и скопировать фото в Storage?`)) return;

    try {
      status("Создаю коллекции старого мерча...");
      const collectionMap = new Map();
      const uniqueCollections = [];

      items.forEach((item) => {
        const ru = item.collectionRu || "Мерч";
        const en = item.collectionEn || item.collectionRu || "Merch";
        const key = `${ru}|||${en}`;
        if (!collectionMap.has(key)) {
          const collection = {
            id: `legacy-collection-${slugify(en || ru)}`,
            titleRu: ru,
            titleEn: en,
            textRu: `Линейка ${ru}. Выбери вещь и открой карточку для подробностей.`,
            textEn: `${en} collection. Choose an item and open the card for details.`,
            isPublished: true,
            sortOrder: uniqueCollections.length,
          };
          collectionMap.set(key, collection);
          uniqueCollections.push(collection);
        }
      });

      for (const collection of uniqueCollections) {
        await cms.saveMerchCollection(collection);
      }

      status("Переношу старый мерч и копирую фото в Storage...");
      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        status(`Переношу товар ${index + 1}/${items.length}: ${item.titleRu || item.titleEn || "без названия"}...`);
        const images = (await uploadLegacyImages(item.images || [], "legacy-merch")).map((image, imageIndex) => ({
          ...normalizeImage(image, imageIndex),
          altRu: "",
          altEn: "",
          titleRu: "",
          titleEn: "",
        }));
        const collection = collectionMap.get(`${item.collectionRu || "Мерч"}|||${item.collectionEn || item.collectionRu || "Merch"}`);
        await cms.saveMerchItem({
          id: item.id,
          collectionId: collection?.id || "",
          titleRu: item.titleRu,
          titleEn: item.titleEn,
          categoryRu: item.categoryRu,
          categoryEn: item.categoryEn,
          collectionRu: collection?.titleRu || item.collectionRu,
          collectionEn: collection?.titleEn || item.collectionEn,
          descriptionRu: item.descriptionRu,
          descriptionEn: item.descriptionEn,
          prices: item.prices || [],
          stockStatus: item.stockStatus || (item.inStock === false ? "out" : "in"),
          inStock: item.inStock !== false,
          isPublished: item.isPublished !== false,
          instagram: item.instagram,
          telegram: item.telegram,
          etsyUrl: item.etsyUrl || item.etsy_url || "https://yugenmagazart.etsy.com",
          sortOrder: Number(item.sortOrder || index),
        }, images.length ? images : item.images || []);
      }
      await loadContent();
      status("Старый мерч перенесён в Supabase, коллекции созданы, фото скопированы в Storage.");
    } catch (error) {
      status(error.message || "Не удалось перенести старый мерч", true);
    }
  }


  let sortableSetupTimer = 0;

  function setupSortableLists() {
    clearTimeout(sortableSetupTimer);
    sortableSetupTimer = setTimeout(() => {
      $$(".adminSortable").forEach((list) => {
        if (list.dataset.sortReady === "true") return;
        list.dataset.sortReady = "true";
        list.addEventListener("pointerdown", onSortPointerDown);
      });
    }, 0);
  }

  function sortableItems(list) {
    return Array.from(list.children).filter((el) => el.matches("[data-sort-id]"));
  }

  async function saveOrderFromList(list) {
    const type = list.dataset.sortable;
    const items = sortableItems(list);
    try {
      status("Сохраняю порядок...");
      if (type === "merch") {
        const collectionId = list.dataset.collectionId || null;
        await cms.updateMerchOrders(items.map((el, index) => ({ id: el.dataset.sortId, collectionId, sortOrder: index })));
      }
      if (type === "tattoo") {
        await cms.updateTattooOrders(items.map((el, index) => ({ id: el.dataset.sortId, sortOrder: index })));
      }
      if (type === "collections") {
        await cms.updateCollectionOrders(items.map((el, index) => ({ id: el.dataset.sortId, sortOrder: index })));
      }
      await loadContent();
      status("Порядок сохранён.");
    } catch (error) {
      status(error.message || "Не удалось сохранить порядок", true);
    }
  }

  function onSortPointerDown(event) {
    const handle = event.target.closest("[data-drag-handle]");
    if (!handle) return;
    const item = handle.closest("[data-sort-id]");
    const list = handle.closest(".adminSortable");
    if (!item || !list) return;

    event.preventDefault();
    item.classList.add("isDragging");
    item.setPointerCapture?.(event.pointerId);

    const onMove = (moveEvent) => {
      moveEvent.preventDefault();
      item.style.opacity = "0.55";
      const target = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY)?.closest("[data-sort-id]");
      if (!target || target === item || target.parentElement !== list) return;
      const rect = target.getBoundingClientRect();
      const before = moveEvent.clientY < rect.top + rect.height / 2;
      list.insertBefore(item, before ? target : target.nextSibling);
    };

    const onUp = async (upEvent) => {
      item.releasePointerCapture?.(upEvent.pointerId);
      item.classList.remove("isDragging");
      item.style.opacity = "";
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      await saveOrderFromList(list);
    };

    document.addEventListener("pointermove", onMove, { passive: false });
    document.addEventListener("pointerup", onUp, { once: true });
    document.addEventListener("pointercancel", onUp, { once: true });
  }

  function selectedMerchIds(collectionId = null) {
    const selector = collectionId ? `[data-collection-id="${CSS.escape(collectionId)}"] [data-merch-select]:checked` : "[data-merch-select]:checked";
    return $$(selector).map((input) => input.value).filter(Boolean);
  }

  async function bulkSetStock(statusValue, collectionId = null) {
    const ids = selectedMerchIds(collectionId);
    if (!ids.length) {
      status("Сначала выбери товары галочками.", true);
      return;
    }
    try {
      status("Меняю наличие выбранных товаров...");
      await cms.bulkUpdateMerchStock(ids, statusValue);
      await loadContent();
      status(`Обновлено товаров: ${ids.length}.`);
    } catch (error) {
      status(error.message || "Не удалось поменять наличие", true);
    }
  }

  function setupTabs() {
    $$('[data-admin-tab]').forEach((button) => {
      button.addEventListener("click", () => {
        $$('[data-admin-tab]').forEach((item) => item.classList.toggle("active", item === button));
        $$('[data-admin-panel]').forEach((panel) => panel.classList.toggle("active", panel.dataset.adminPanel === button.dataset.adminTab));
      });
    });
  }

  async function showAdmin() {
    $("#loginPanel").hidden = true;
    $("#adminApp").hidden = false;
    $("#logoutBtn").hidden = false;
    await loadContent();
  }

  async function init() {
    setupTabs();

    if (!cms || !cms.isReady()) {
      status("Supabase не настроен. Заполни /assets/js/supabase-config.js.", true);
      return;
    }

    $("#loginForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        status("Вхожу...");
        await cms.signIn(text("#loginEmail"), text("#loginPassword"));
        if (!(await cms.isAdmin())) throw new Error("Этот пользователь не добавлен в admin_users.");
        await showAdmin();
        status("Вход выполнен.");
      } catch (error) {
        status(error.message || "Не удалось войти", true);
      }
    });

    $("#logoutBtn").addEventListener("click", async () => {
      await cms.signOut();
      location.reload();
    });

    $("#collectionForm").addEventListener("submit", onCollectionSubmit);
    $("#merchForm").addEventListener("submit", onMerchSubmit);
    $("#tattooForm").addEventListener("submit", onTattooSubmit);
    $("#clearCollectionForm").addEventListener("click", clearCollectionForm);
    $("#clearMerchForm").addEventListener("click", clearMerchForm);
    $("#clearTattooForm").addEventListener("click", clearTattooForm);
    $("#seedTattooWorks").addEventListener("click", seedTattooWorks);
    $("#seedMerchItems").addEventListener("click", seedMerchItems);
    $("#reloadContent").addEventListener("click", loadContent);
    $("#merchImages").addEventListener("change", () => renderImageManager("#merchImageManager", editingMerchImages, "#merchImages", "merch"));
    $("#tattooImages").addEventListener("change", () => renderImageManager("#tattooImageManager", editingTattooImages, "#tattooImages", "tattoo"));

    const loveButton = $("#adminLoveButton");
    const loveModal = $("#adminLoveModal");
    const loveClose = $("#adminLoveClose");
    loveButton?.addEventListener("click", () => {
      loveModal?.classList.add("open");
      loveModal?.setAttribute("aria-hidden", "false");
    });
    loveClose?.addEventListener("click", () => {
      loveModal?.classList.remove("open");
      loveModal?.setAttribute("aria-hidden", "true");
    });
    loveModal?.addEventListener("click", (event) => {
      if (event.target === loveModal) {
        loveModal.classList.remove("open");
        loveModal.setAttribute("aria-hidden", "true");
      }
    });

    document.addEventListener("click", (event) => {
      const bulkStockButton = event.target.closest("[data-bulk-stock]");
      const selectAllCollection = event.target.closest("[data-select-all-merch]");
      const editCollectionButton = event.target.closest("[data-edit-collection]");
      const deleteCollectionButton = event.target.closest("[data-delete-collection]");
      const editMerchButton = event.target.closest("[data-edit-merch]");
      const deleteMerchButton = event.target.closest("[data-delete-merch]");
      const editTattooButton = event.target.closest("[data-edit-tattoo]");
      const deleteTattooButton = event.target.closest("[data-delete-tattoo]");
      if (bulkStockButton) bulkSetStock(bulkStockButton.dataset.bulkStock, bulkStockButton.dataset.bulkCollection || null);
      if (selectAllCollection) {
        const wrap = selectAllCollection.closest("[data-collection-id]");
        $$("[data-merch-select]", wrap).forEach((input) => { input.checked = selectAllCollection.checked; });
      }
      if (event.target && event.target.id === "selectAllMerchGlobal") {
        $$("[data-merch-select]").forEach((input) => { input.checked = event.target.checked; });
      }
      if (editCollectionButton) editCollection(editCollectionButton.dataset.editCollection);
      if (deleteCollectionButton) deleteCollection(deleteCollectionButton.dataset.deleteCollection);
      if (editMerchButton) editMerch(editMerchButton.dataset.editMerch);
      if (deleteMerchButton) deleteMerch(deleteMerchButton.dataset.deleteMerch);
      if (editTattooButton) editTattoo(editTattooButton.dataset.editTattoo);
      if (deleteTattooButton) deleteTattoo(deleteTattooButton.dataset.deleteTattoo);
    });

    try {
      if (await cms.isAdmin()) {
        await showAdmin();
        status("Ты уже в админке.");
      } else {
        status("Войди через email и пароль Supabase.");
      }
    } catch (error) {
      status(error.message || "Ошибка проверки доступа", true);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
