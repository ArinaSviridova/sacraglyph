(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const cms = window.BazookaCMS;

  let merchItems = [];
  let merchCollections = [];
  let tattooWorks = [];

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

  function firstImage(images) {
    return Array.isArray(images) && images.length ? images[0] : "";
  }

  function priceLabel(item) {
    if (item.inStock === false) return "нет в наличии";
    return (item.prices || []).map((price) => `${price.amount} ${price.currency}`).join(" / ") || "цена по запросу";
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
        <section class="adminCollectionGroup">
          <div class="adminCollectionHead">
            <div>
              <div class="adminItemTitle">№${escapeHtml(collection.sortOrder)} · ${escapeHtml(collection.titleRu)} / ${escapeHtml(collection.titleEn)}</div>
              <div class="adminItemMeta">${items.length} товар(ов) · ${collection.isVirtual ? "нужно сохранить как коллекцию" : (collection.isPublished === false ? "скрыта" : "опубликована")}</div>
            </div>
            <div class="adminActions compact">
              <button class="adminButton" type="button" data-edit-collection="${escapeHtml(collection.id)}">Редактировать коллекцию</button>
              <button class="adminButton adminDanger" type="button" data-delete-collection="${escapeHtml(collection.id)}">Удалить</button>
            </div>
          </div>
          <div class="adminList compactList">
            ${items.length ? items.map(renderMerchItem).join("") : `<p class="adminTiny">В этой коллекции пока нет товаров. Лента появится на сайте, когда добавишь товар.</p>`}
          </div>
        </section>
      `;
    }).join("");

    const unassigned = merchItems.filter((item) => !assigned.has(item.id));
    const unassignedBlock = unassigned.length ? `
      <section class="adminCollectionGroup">
        <div class="adminCollectionHead">
          <div>
            <div class="adminItemTitle">Без коллекции</div>
            <div class="adminItemMeta">${unassigned.length} товар(ов), которые надо пристроить в нормальный дом</div>
          </div>
        </div>
        <div class="adminList compactList">${unassigned.map(renderMerchItem).join("")}</div>
      </section>
    ` : "";

    list.innerHTML = collectionBlocks + unassignedBlock;
  }

  function renderMerchItem(item) {
    const collection = collectionForItem(item);
    return `
      <article class="adminItem">
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
    list.innerHTML = tattooWorks.length ? tattooWorks.map((work) => `
      <article class="adminItem">
        ${firstImage(work.images) || work.image ? `<img src="${escapeHtml(firstImage(work.images) || work.image)}" alt="">` : ""}
        <div class="adminItemText">
          <div class="adminItemTitle">№${escapeHtml(work.sortOrder)} · ${escapeHtml((work.descriptionRu || "Работа").slice(0, 100))}</div>
          <div class="adminItemMeta">${escapeHtml((work.descriptionEn || "").slice(0, 120))}</div>
        </div>
        <button class="adminButton" type="button" data-edit-tattoo="${escapeHtml(work.id)}">Редактировать</button>
        <button class="adminButton adminDanger" type="button" data-delete-tattoo="${escapeHtml(work.id)}">Удалить</button>
      </article>
    `).join("") : `<p class="adminTiny">Пока работ нет.</p>`;
  }

  function renderAll() {
    renderMerchList();
    renderTattooList();
  }

  function clearCollectionForm() {
    $("#collectionForm").reset();
    setValue("#collectionEditId", "");
  }

  function clearMerchForm() {
    $("#merchForm").reset();
    setValue("#merchEditId", "");
    renderCollectionSelect();
  }

  function clearTattooForm() {
    $("#tattooForm").reset();
    setValue("#tattooEditId", "");
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
      status("Сохраняю товар...");
      const editId = text("#merchEditId");
      const existing = merchItems.find((item) => item.id === editId);
      const collectionId = text("#merchCollectionId");
      let collection = collectionById(collectionId);
      if (!collection) throw new Error("Сначала выбери коллекцию. Да, товару нужен дом.");
      if (collection.isVirtual) {
        await cms.saveMerchCollection(collection);
        collection = { ...collection, isVirtual: false };
      }
      const newImages = await cms.uploadImages($("#merchImages").files, "merch");
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
        inStock: $("#merchStock").value === "true",
        isPublished: $("#merchPublished").value === "true",
        descriptionRu: text("#merchDescriptionRu"),
        descriptionEn: text("#merchDescriptionEn"),
        instagram: "https://www.instagram.com/yugenmagaz/",
        telegram: "https://t.me/bazookatattoo",
        sortOrder: Number(text("#merchSortOrder") || 0),
      };
      await cms.saveMerchItem(item, newImages.length ? newImages : existing?.images || []);
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
      status("Сохраняю работу...");
      const editId = text("#tattooEditId");
      const existing = tattooWorks.find((work) => work.id === editId);
      const newImages = await cms.uploadImages($("#tattooImages").files, "tattoo");
      const work = {
        id: editId || undefined,
        descriptionRu: text("#tattooDescriptionRu"),
        descriptionEn: text("#tattooDescriptionEn"),
        altRu: text("#tattooDescriptionRu"),
        altEn: text("#tattooDescriptionEn"),
        isPublished: $("#tattooPublished").value === "true",
        sortOrder: Number(text("#tattooSortOrder") || tattooWorks.length),
      };
      await cms.saveTattooWork(work, newImages.length ? newImages : existing?.images || (existing?.image ? [existing.image] : []));
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
    $("#merchStock").value = item.inStock === false ? "false" : "true";
    $("#merchPublished").value = item.isPublished === false ? "false" : "true";
    setValue("#merchDescriptionRu", item.descriptionRu);
    setValue("#merchDescriptionEn", item.descriptionEn);
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
        const images = await uploadLegacyImages([work.image], "legacy-tattoo");
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
        const images = await uploadLegacyImages(item.images || [], "legacy-merch");
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
          inStock: item.inStock !== false,
          isPublished: item.isPublished !== false,
          instagram: item.instagram,
          telegram: item.telegram,
          sortOrder: Number(item.sortOrder || index),
        }, images.length ? images : item.images || []);
      }
      await loadContent();
      status("Старый мерч перенесён в Supabase, коллекции созданы, фото скопированы в Storage.");
    } catch (error) {
      status(error.message || "Не удалось перенести старый мерч", true);
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

    document.addEventListener("click", (event) => {
      const editCollectionButton = event.target.closest("[data-edit-collection]");
      const deleteCollectionButton = event.target.closest("[data-delete-collection]");
      const editMerchButton = event.target.closest("[data-edit-merch]");
      const deleteMerchButton = event.target.closest("[data-delete-merch]");
      const editTattooButton = event.target.closest("[data-edit-tattoo]");
      const deleteTattooButton = event.target.closest("[data-delete-tattoo]");
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
