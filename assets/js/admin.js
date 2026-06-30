(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const cms = window.BazookaCMS;

  let merchItems = [];
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

  async function loadContent() {
    const content = await cms.getAdminContent();
    merchItems = content.merchItems || [];
    tattooWorks = content.tattooWorks || [];
    renderAll();
  }

  function renderMerchList() {
    const list = $("#merchList");
    if (!list) return;
    list.innerHTML = merchItems.length ? merchItems.map((item) => `
      <article class="adminItem">
        ${firstImage(item.images) ? `<img src="${escapeHtml(firstImage(item.images))}" alt="">` : ""}
        <div class="adminItemText">
          <div class="adminItemTitle">${escapeHtml(item.titleRu || item.titleEn || "Без названия")}</div>
          <div class="adminItemMeta">${escapeHtml(item.collectionRu || "Без коллекции")} · ${escapeHtml(priceLabel(item))}</div>
        </div>
        <button class="adminButton" type="button" data-edit-merch="${escapeHtml(item.id)}">Редактировать</button>
        <button class="adminButton adminDanger" type="button" data-delete-merch="${escapeHtml(item.id)}">Удалить</button>
      </article>
    `).join("") : `<p class="adminTiny">Пока товаров нет. Пустота, но с административными правами.</p>`;
  }

  function renderTattooList() {
    const list = $("#tattooList");
    if (!list) return;
    list.innerHTML = tattooWorks.length ? tattooWorks.map((work) => `
      <article class="adminItem">
        ${firstImage(work.images) || work.image ? `<img src="${escapeHtml(firstImage(work.images) || work.image)}" alt="">` : ""}
        <div class="adminItemText">
          <div class="adminItemTitle">${escapeHtml((work.descriptionRu || "Работа").slice(0, 100))}</div>
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

  function clearMerchForm() {
    $("#merchForm").reset();
    setValue("#merchEditId", "");
  }

  function clearTattooForm() {
    $("#tattooForm").reset();
    setValue("#tattooEditId", "");
  }

  async function onMerchSubmit(event) {
    event.preventDefault();
    try {
      status("Сохраняю товар...");
      const editId = text("#merchEditId");
      const existing = merchItems.find((item) => item.id === editId);
      const newImages = await cms.uploadImages($("#merchImages").files, "merch");
      const item = {
        id: editId || undefined,
        titleRu: text("#merchTitleRu"),
        titleEn: text("#merchTitleEn"),
        categoryRu: text("#merchCategoryRu") || "Мерч",
        categoryEn: text("#merchCategoryEn") || "Merch",
        collectionRu: text("#merchCollectionRu") || "Мерч",
        collectionEn: text("#merchCollectionEn") || "Merch",
        prices: pricesFromForm(),
        inStock: $("#merchStock").value === "true",
        isPublished: $("#merchPublished").value === "true",
        descriptionRu: text("#merchDescriptionRu"),
        descriptionEn: text("#merchDescriptionEn"),
        instagram: "https://www.instagram.com/yugenmagaz/",
        telegram: "https://t.me/bazookatattoo",
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

  function editMerch(id) {
    const item = merchItems.find((entry) => entry.id === id);
    if (!item) return;
    setValue("#merchEditId", item.id);
    setValue("#merchTitleRu", item.titleRu);
    setValue("#merchTitleEn", item.titleEn);
    setValue("#merchCollectionRu", item.collectionRu);
    setValue("#merchCollectionEn", item.collectionEn);
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

  async function seedTattooWorks() {
    const seed = window.BAZOOKA_SEED_CONTENT || {};
    const works = seed.tattooWorks || [];
    if (!works.length) {
      status("В seed-файле нет старых работ.", true);
      return;
    }
    if (!confirm(`Загрузить ${works.length} старых тату-работ в Supabase?`)) return;

    try {
      status("Переношу старые работы...");
      for (const work of works) {
        await cms.saveTattooWork({
          id: work.id,
          descriptionRu: work.descriptionRu,
          descriptionEn: work.descriptionEn,
          altRu: work.altRu,
          altEn: work.altEn,
          isPublished: true,
          sortOrder: work.sortOrder || 0,
        }, [work.image]);
      }
      await loadContent();
      status("Старые тату-работы перенесены в Supabase.");
    } catch (error) {
      status(error.message || "Не удалось перенести старые работы", true);
    }
  }

  function setupTabs() {
    $$('[data-admin-tab]').forEach((button) => {
      button.addEventListener('click', () => {
        $$('[data-admin-tab]').forEach((item) => item.classList.toggle('active', item === button));
        $$('[data-admin-panel]').forEach((panel) => panel.classList.toggle('active', panel.dataset.adminPanel === button.dataset.adminTab));
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

    $("#merchForm").addEventListener("submit", onMerchSubmit);
    $("#tattooForm").addEventListener("submit", onTattooSubmit);
    $("#clearMerchForm").addEventListener("click", clearMerchForm);
    $("#clearTattooForm").addEventListener("click", clearTattooForm);
    $("#seedTattooWorks").addEventListener("click", seedTattooWorks);
    $("#reloadContent").addEventListener("click", loadContent);

    document.addEventListener("click", (event) => {
      const editMerchButton = event.target.closest("[data-edit-merch]");
      const deleteMerchButton = event.target.closest("[data-delete-merch]");
      const editTattooButton = event.target.closest("[data-edit-tattoo]");
      const deleteTattooButton = event.target.closest("[data-delete-tattoo]");
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
