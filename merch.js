(() => {
  const lang = (document.documentElement.lang || "ru").toLowerCase();

  function t(ru, en) {
    return lang === "en" ? en : ru;
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function createImageSet(baseName) {
    const basePath = `/assets/img/merch/${baseName}`;

    return {
      baseName,
      jpg: `${basePath}.jpg`,
      avif: `${basePath}-400.avif 400w, ${basePath}-600.avif 600w, ${basePath}-900.avif 900w, ${basePath}-1600.avif 1600w`,
      webp: `${basePath}-400.webp 400w, ${basePath}-600.webp 600w, ${basePath}-900.webp 900w, ${basePath}-1600.webp 1600w`,
    };
  }

  function renderPicture(
    imageSet,
    alt,
    imgClass = "",
    sizes = "100vw",
    loading = "lazy",
  ) {
    return `
      <picture>
        <source
          type="image/avif"
          srcset="${escapeHtml(imageSet.avif)}"
          sizes="${escapeHtml(sizes)}">
        <source
          type="image/webp"
          srcset="${escapeHtml(imageSet.webp)}"
          sizes="${escapeHtml(sizes)}">
        <img
          class="${escapeHtml(imgClass)}"
          src="${escapeHtml(imageSet.jpg)}"
          alt="${escapeHtml(alt)}"
          loading="${escapeHtml(loading)}"
          decoding="async">
      </picture>
    `;
  }


  function buildTelegramMessageUrl(item) {
    return 'https://t.me/bazookatattoo';
  }

  const merchCollections = [
    {
      id: "black",
      titleRu: "Black",
      titleEn: "Black",
      textRu: "Линейка Black. Выбери вещь и открой карточку для подробностей.",
      textEn: "Black collection. Choose an item and open the card for details.",
      items: [
        {
          id: "black-1",
          categoryRu: "Футболка",
          categoryEn: "T-shirt",
          titleRu: "Black 1",
          titleEn: "Black 1",
          priceRu: "Нет в наличии",
          priceEn: "Out of stock",
          descriptionRu:
            "Футболка из линейки Black. Для заказа напиши в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Black collection. Contact via Instagram or Telegram to order.",
          images: [createImageSet("Black1")],
          instagram: "https://www.instagram.com/bazookatats",
          telegram: 'https://t.me/bazookatattoo',
        },
        {
          id: "black-2",
          categoryRu: "Футболка",
          categoryEn: "T-shirt",
          titleRu: "Black 2",
          titleEn: "Black 2",
          priceRu: "Нет в наличии",
          priceEn: "Out of stock",
          descriptionRu:
            "Футболка из линейки Black. Для заказа напиши в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Black collection. Contact via Instagram or Telegram to order.",
          images: [createImageSet("Black2")],
          instagram: "https://www.instagram.com/bazookatats",
          telegram: 'https://t.me/bazookatattoo',
        },
        {
          id: "black-3",
          categoryRu: "Футболка",
          categoryEn: "T-shirt",
          titleRu: "Black 3",
          titleEn: "Black 3",
          priceRu: "Нет в наличии",
          priceEn: "Out of stock",
          descriptionRu:
            "Футболка из линейки Black. Для заказа напиши в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Black collection. Contact via Instagram or Telegram to order.",
          images: [createImageSet("Black3")],
          instagram: "https://www.instagram.com/bazookatats",
          telegram: 'https://t.me/bazookatattoo',
        },
        {
          id: "black-4",
          categoryRu: "Футболка",
          categoryEn: "T-shirt",
          titleRu: "Black 4",
          titleEn: "Black 4",
          priceRu: "Нет в наличии",
          priceEn: "Out of stock",
          descriptionRu:
            "Футболка из линейки Black. Для заказа напиши в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Black collection. Contact via Instagram or Telegram to order.",
          images: [createImageSet("Black4")],
          instagram: "https://www.instagram.com/bazookatats",
          telegram: 'https://t.me/bazookatattoo',
        },
        {
          id: "black-5",
          categoryRu: "Футболка",
          categoryEn: "T-shirt",
          titleRu: "Black 5",
          titleEn: "Black 5",
          priceRu: "Нет в наличии",
          priceEn: "Out of stock",
          descriptionRu:
            "Футболка из линейки Black. Для заказа напиши в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Black collection. Contact via Instagram or Telegram to order.",
          images: [createImageSet("Black5")],
          instagram: "https://www.instagram.com/bazookatats",
          telegram: 'https://t.me/bazookatattoo',
        },
        {
          id: "black-6",
          categoryRu: "Футболка",
          categoryEn: "T-shirt",
          titleRu: "Black 6",
          titleEn: "Black 6",
          priceRu: "Нет в наличии",
          priceEn: "Out of stock",
          descriptionRu:
            "Футболка из линейки Black. Для заказа напиши в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Black collection. Contact via Instagram or Telegram to order.",
          images: [createImageSet("Black6")],
          instagram: "https://www.instagram.com/bazookatats",
          telegram: 'https://t.me/bazookatattoo',
        },
        {
          id: "black-7",
          categoryRu: "Футболка",
          categoryEn: "T-shirt",
          titleRu: "Black 7",
          titleEn: "Black 7",
          priceRu: "Нет в наличии",
          priceEn: "Out of stock",
          descriptionRu:
            "Футболка из линейки Black. Для заказа напиши в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Black collection. Contact via Instagram or Telegram to order.",
          images: [createImageSet("Black7")],
          instagram: "https://www.instagram.com/bazookatats",
          telegram: 'https://t.me/bazookatattoo',
        },
        {
          id: "black-8",
          categoryRu: "Футболка",
          categoryEn: "T-shirt",
          titleRu: "Black 8",
          titleEn: "Black 8",
          priceRu: "Нет в наличии",
          priceEn: "Out of stock",
          descriptionRu:
            "Футболка из линейки Black. Для заказа напиши в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Black collection. Contact via Instagram or Telegram to order.",
          images: [createImageSet("Black8")],
          instagram: "https://www.instagram.com/bazookatats",
          telegram: 'https://t.me/bazookatattoo',
        },
        {
          id: "black-9",
          categoryRu: "Футболка",
          categoryEn: "T-shirt",
          titleRu: "Black 9",
          titleEn: "Black 9",
          priceRu: "Нет в наличии",
          priceEn: "Out of stock",
          descriptionRu:
            "Футболка из линейки Black. Для заказа напиши в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Black collection. Contact via Instagram or Telegram to order.",
          images: [createImageSet("Black9")],
          instagram: "https://www.instagram.com/bazookatats",
          telegram: 'https://t.me/bazookatattoo',
        },
        {
          id: "black-10",
          categoryRu: "Футболка",
          categoryEn: "T-shirt",
          titleRu: "Black 10",
          titleEn: "Black 10",
          priceRu: "Нет в наличии",
          priceEn: "Out of stock",
          descriptionRu:
            "Футболка из линейки Black. Для заказа напиши в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Black collection. Contact via Instagram or Telegram to order.",
          images: [createImageSet("Black10")],
          instagram: "https://www.instagram.com/bazookatats",
          telegram: 'https://t.me/bazookatattoo',
        },
        {
          id: "black-11",
          categoryRu: "Футболка",
          categoryEn: "T-shirt",
          titleRu: "Black 11",
          titleEn: "Black 11",
          priceRu: "Нет в наличии",
          priceEn: "Out of stock",
          descriptionRu:
            "Футболка из линейки Black. Для заказа напиши в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Black collection. Contact via Instagram or Telegram to order.",
          images: [createImageSet("Black11")],
          instagram: "https://www.instagram.com/bazookatats",
          telegram: 'https://t.me/bazookatattoo',
        },
      ],
    },

    {
      id: "custom",
      titleRu: "Custom",
      titleEn: "Custom",
      textRu: "Линейка Custom. Выбери вещь и открой карточку для подробностей.",
      textEn:
        "Custom collection. Choose an item and open the card for details.",
      items: [
        {
          id: "custom-1",
          categoryRu: "Футболка",
          categoryEn: "T-shirt",
          titleRu: "Custom 1",
          titleEn: "Custom 1",
          priceRu: "Нет в наличии",
          priceEn: "Out of stock",
          descriptionRu:
            "Футболка из линейки Custom. Для заказа напиши в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Custom collection. Contact via Instagram or Telegram to order.",
          images: [createImageSet("Custom1"), createImageSet("CustomBack1")],
          instagram: "https://www.instagram.com/bazookatats",
          telegram: 'https://t.me/bazookatattoo',
        },
        {
          id: "custom-2",
          categoryRu: "Футболка",
          categoryEn: "T-shirt",
          titleRu: "Custom 2",
          titleEn: "Custom 2",
          priceRu: "Нет в наличии",
          priceEn: "Out of stock",
          descriptionRu:
            "Футболка из линейки Custom. Для заказа напиши в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Custom collection. Contact via Instagram or Telegram to order.",
          images: [createImageSet("Custom2"), createImageSet("CustomBack2")],
          instagram: "https://www.instagram.com/bazookatats",
          telegram: 'https://t.me/bazookatattoo',
        },
        {
          id: "custom-3",
          categoryRu: "Футболка",
          categoryEn: "T-shirt",
          titleRu: "Custom 3",
          titleEn: "Custom 3",
          priceRu: "Нет в наличии",
          priceEn: "Out of stock",
          descriptionRu:
            "Футболка из линейки Custom. Для заказа напиши в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Custom collection. Contact via Instagram or Telegram to order.",
          images: [createImageSet("Custom3"), createImageSet("CustomBack3")],
          instagram: "https://www.instagram.com/bazookatats",
          telegram: 'https://t.me/bazookatattoo',
        },
        {
          id: "custom-4",
          categoryRu: "Футболка",
          categoryEn: "T-shirt",
          titleRu: "Custom 4",
          titleEn: "Custom 4",
          priceRu: "Нет в наличии",
          priceEn: "Out of stock",
          descriptionRu:
            "Футболка из линейки Custom. Для заказа напиши в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Custom collection. Contact via Instagram or Telegram to order.",
          images: [createImageSet("Custom4"), createImageSet("CustomBack4")],
          instagram: "https://www.instagram.com/bazookatats",
          telegram: 'https://t.me/bazookatattoo',
        },
      ],
    },

    {
      id: "hoodie",
      titleRu: "Hoodie",
      titleEn: "Hoodie",
      textRu: "Линейка Hoodie. Выбери вещь и открой карточку для подробностей.",
      textEn:
        "Hoodie collection. Choose an item and open the card for details.",
      items: [
        {
          id: "hoodie-1",
          categoryRu: "Худи",
          categoryEn: "Hoodie",
          titleRu: "Hoodie 1",
          titleEn: "Hoodie 1",
          priceRu: "Нет в наличии",
          priceEn: "Out of stock",
          descriptionRu:
            "Худи из линейки Hoodie. Для заказа напиши в Instagram или Telegram.",
          descriptionEn:
            "Hoodie from the Hoodie collection. Contact via Instagram or Telegram to order.",
          images: [createImageSet("Hoodie1"), createImageSet("HoodieBack1")],
          instagram: "https://www.instagram.com/bazookatats",
          telegram: 'https://t.me/bazookatattoo',
        },
        {
          id: "hoodie-2",
          categoryRu: "Худи",
          categoryEn: "Hoodie",
          titleRu: "Hoodie 2",
          titleEn: "Hoodie 2",
          priceRu: "Нет в наличии",
          priceEn: "Out of stock",
          descriptionRu:
            "Худи из линейки Hoodie. Для заказа напиши в Instagram или Telegram.",
          descriptionEn:
            "Hoodie from the Hoodie collection. Contact via Instagram or Telegram to order.",
          images: [
            createImageSet("Hoodie2"),
            createImageSet("HoodieBack2"),
            createImageSet("HoodieBack2-1"),
          ],
          instagram: "https://www.instagram.com/bazookatats",
          telegram: 'https://t.me/bazookatattoo',
        },
      ],
    },

    {
      id: "yugen",
      titleRu: "Yugen",
      titleEn: "Yugen",
      textRu: "Линейка Yugen. Выбери вещь и открой карточку для подробностей.",
      textEn: "Yugen collection. Choose an item and open the card for details.",
      items: [
        {
          id: "yugen-1",
          categoryRu: "Футболка",
          categoryEn: "T-shirt",
          titleRu: "Yugen 1",
          titleEn: "Yugen 1",
          priceRu: "Нет в наличии",
          priceEn: "Out of stock",
          descriptionRu:
            "Футболка из линейки Yugen. Для заказа напиши в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Yugen collection. Contact via Instagram or Telegram to order.",
          images: [createImageSet("Yugen1")],
          instagram: "https://www.instagram.com/bazookatats",
          telegram: 'https://t.me/bazookatattoo',
        },
        {
          id: "yugen-2",
          categoryRu: "Футболка",
          categoryEn: "T-shirt",
          titleRu: "Yugen 2",
          titleEn: "Yugen 2",
          priceRu: "Нет в наличии",
          priceEn: "Out of stock",
          descriptionRu:
            "Футболка из линейки Yugen. Для заказа напиши в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Yugen collection. Contact via Instagram or Telegram to order.",
          images: [
            createImageSet("Yugen2"),
            createImageSet("Yugen12"),
            createImageSet("Yugen13"),
          ],
          instagram: "https://www.instagram.com/bazookatats",
          telegram: 'https://t.me/bazookatattoo',
        },
        {
          id: "yugen-3",
          categoryRu: "Футболка",
          categoryEn: "T-shirt",
          titleRu: "Yugen 3",
          titleEn: "Yugen 3",
          priceRu: "Нет в наличии",
          priceEn: "Out of stock",
          descriptionRu:
            "Футболка из линейки Yugen. Для заказа напиши в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Yugen collection. Contact via Instagram or Telegram to order.",
          images: [createImageSet("Yugen3")],
          instagram: "https://www.instagram.com/bazookatats",
          telegram: 'https://t.me/bazookatattoo',
        },
        {
          id: "yugen-4",
          categoryRu: "Футболка",
          categoryEn: "T-shirt",
          titleRu: "Yugen 4",
          titleEn: "Yugen 4",
          priceRu: "Нет в наличии",
          priceEn: "Out of stock",
          descriptionRu:
            "Футболка из линейки Yugen. Для заказа напиши в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Yugen collection. Contact via Instagram or Telegram to order.",
          images: [createImageSet("Yugen4")],
          instagram: "https://www.instagram.com/bazookatats",
          telegram: 'https://t.me/bazookatattoo',
        },
        {
          id: "yugen-5",
          categoryRu: "Футболка",
          categoryEn: "T-shirt",
          titleRu: "Yugen 5",
          titleEn: "Yugen 5",
          priceRu: "Нет в наличии",
          priceEn: "Out of stock",
          descriptionRu:
            "Футболка из линейки Yugen. Для заказа напиши в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Yugen collection. Contact via Instagram or Telegram to order.",
          images: [createImageSet("Yugen5"), createImageSet("Yugen14")],
          instagram: "https://www.instagram.com/bazookatats",
          telegram: 'https://t.me/bazookatattoo',
        },
        {
          id: "yugen-6",
          categoryRu: "Футболка",
          categoryEn: "T-shirt",
          titleRu: "Yugen 6",
          titleEn: "Yugen 6",
          priceRu: "Нет в наличии",
          priceEn: "Out of stock",
          descriptionRu:
            "Футболка из линейки Yugen. Для заказа напиши в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Yugen collection. Contact via Instagram or Telegram to order.",
          images: [createImageSet("Yugen6")],
          instagram: "https://www.instagram.com/bazookatats",
          telegram: 'https://t.me/bazookatattoo',
        },
        {
          id: "yugen-7",
          categoryRu: "Футболка",
          categoryEn: "T-shirt",
          titleRu: "Yugen 7",
          titleEn: "Yugen 7",
          priceRu: "Нет в наличии",
          priceEn: "Out of stock",
          descriptionRu:
            "Футболка из линейки Yugen. Для заказа напиши в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Yugen collection. Contact via Instagram or Telegram to order.",
          images: [createImageSet("Yugen7")],
          instagram: "https://www.instagram.com/bazookatats",
          telegram: 'https://t.me/bazookatattoo',
        },
        {
          id: "yugen-8",
          categoryRu: "Футболка",
          categoryEn: "T-shirt",
          titleRu: "Yugen 8",
          titleEn: "Yugen 8",
          priceRu: "Нет в наличии",
          priceEn: "Out of stock",
          descriptionRu:
            "Футболка из линейки Yugen. Для заказа напиши в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Yugen collection. Contact via Instagram or Telegram to order.",
          images: [createImageSet("Yugen8")],
          instagram: "https://www.instagram.com/bazookatats",
          telegram: 'https://t.me/bazookatattoo',
        },
        {
          id: "yugen-10",
          categoryRu: "Футболка",
          categoryEn: "T-shirt",
          titleRu: "Yugen 10",
          titleEn: "Yugen 10",
          priceRu: "Нет в наличии",
          priceEn: "Out of stock",
          descriptionRu:
            "Футболка из линейки Yugen. Для заказа напиши в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Yugen collection. Contact via Instagram or Telegram to order.",
          images: [createImageSet("Yugen10"), createImageSet("Yugen9")],
          instagram: "https://www.instagram.com/bazookatats",
          telegram: 'https://t.me/bazookatattoo',
        },
        {
          id: "yugen-11",
          categoryRu: "Футболка",
          categoryEn: "T-shirt",
          titleRu: "Yugen 11",
          titleEn: "Yugen 11",
          priceRu: "Нет в наличии",
          priceEn: "Out of stock",
          descriptionRu:
            "Футболка из линейки Yugen. Для заказа напиши в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Yugen collection. Contact via Instagram or Telegram to order.",
          images: [createImageSet("Yugen11")],
          instagram: "https://www.instagram.com/bazookatats",
          telegram: 'https://t.me/bazookatattoo',
        },
      ],
    },
  ];

  const root = document.getElementById("merchCollections");
  const modal = document.getElementById("merchModal");

  if (!root || !modal) return;

  const viewerMedia =
    document.getElementById("merchViewerMedia") ||
    document.getElementById("merchViewerImg")?.parentElement;
  const categoryEl = document.getElementById("merchCategory");
  const titleEl = document.getElementById("merchTitle");
  const priceEl = document.getElementById("merchPrice");
  const descriptionEl = document.getElementById("merchDescription");
  const thumbsEl = document.getElementById("merchThumbs");
  const instagramBtn = document.getElementById("merchInstagramBtn");
  const telegramBtn = document.getElementById("merchTelegramBtn");

  let currentCollection = null;
  let currentItem = null;
  let currentItemIndex = 0;
  let currentImageIndex = 0;

  function getCollectionById(collectionId) {
    return (
      merchCollections.find((collection) => collection.id === collectionId) ||
      null
    );
  }

  function getItemById(collection, itemId) {
    if (!collection) return { item: null, index: -1 };
    const index = collection.items.findIndex((item) => item.id === itemId);
    return {
      item: index >= 0 ? collection.items[index] : null,
      index,
    };
  }

  function renderCollections() {
    root.className = "merchCollections";

    root.innerHTML = merchCollections
      .map(
        (collection) => `
      <section class="merchCollection">
        <div class="merchCollectionHead">
          <h2 class="merchCollectionTitle">${escapeHtml(t(collection.titleRu, collection.titleEn))}</h2>
          <p class="merchCollectionText">${escapeHtml(t(collection.textRu, collection.textEn))}</p>
        </div>

        <div class="merchRow" data-merch-row>
          ${collection.items
            .map(
              (item) => `
            <article class="merchItem">
              <button
                class="merchCard"
                type="button"
                data-merch-id="${escapeHtml(item.id)}"
                data-collection-id="${escapeHtml(collection.id)}">
                <div class="merchMedia">
                  ${renderPicture(
                    item.images[0],
                    t(item.titleRu, item.titleEn),
                    "merchCardImg",
                    "(max-width: 767px) 70vw, (max-width: 1200px) 33vw, 280px",
                  )}
                </div>
                <div class="merchBody">
                  <div class="merchTitle">${escapeHtml(t(item.titleRu, item.titleEn))}</div>
                </div>
              </button>
              <a
                class="merchStockBtn"
                href="${escapeHtml(buildTelegramMessageUrl(item))}"
                target="_blank"
                rel="noopener">
                ${escapeHtml(t("Уточнить наличие в Telegram @bazookatattoo", "Check availability via Telegram @bazookatattoo"))}
              </a>
            </article>
          `,
            )
            .join("")}
        </div>
      </section>
    `,
      )
      .join("");
  }

  function renderMainImage() {
    if (!currentItem || !viewerMedia) return;

    viewerMedia.innerHTML = renderPicture(
      currentItem.images[currentImageIndex],
      t(currentItem.titleRu, currentItem.titleEn),
      "merchViewerImg",
      "(max-width: 767px) 100vw, 900px",
      "eager",
    );
  }

  function renderThumbs() {
    if (!currentItem || !thumbsEl) return;

    thumbsEl.innerHTML = currentItem.images
      .map(
        (imageSet, index) => `
      <button
        class="merchThumb ${index === currentImageIndex ? "active" : ""}"
        type="button"
        data-thumb-index="${index}">
        ${renderPicture(imageSet, "", "merchThumbImg", "120px")}
      </button>
    `,
      )
      .join("");
  }

  function renderModalMeta() {
    if (!currentItem) return;

    if (categoryEl)
      categoryEl.textContent = t(
        currentItem.categoryRu,
        currentItem.categoryEn,
      );
    if (titleEl)
      titleEl.textContent = t(currentItem.titleRu, currentItem.titleEn);
    if (priceEl)
      priceEl.textContent = t(
        "Уточнить наличие в Telegram @bazookatattoo",
        "Check availability via Telegram @bazookatattoo",
      );
    if (descriptionEl)
      descriptionEl.textContent = t(
        currentItem.descriptionRu,
        currentItem.descriptionEn,
      );

    if (instagramBtn) instagramBtn.href = currentItem.instagram;
    if (telegramBtn) {
      telegramBtn.href = buildTelegramMessageUrl(currentItem);
      telegramBtn.textContent = t("Уточнить наличие в Telegram @bazookatattoo", "Check availability in Telegram @bazookatattoo");
    }
  }

  function openModalByIds(collectionId, itemId) {
    currentCollection = getCollectionById(collectionId);
    if (!currentCollection) return;

    const found = getItemById(currentCollection, itemId);
    if (!found.item) return;

    currentItem = found.item;
    currentItemIndex = found.index;
    currentImageIndex = 0;

    renderModalMeta();
    renderMainImage();
    renderThumbs();

    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function setCurrentItemByIndex(nextIndex) {
    if (!currentCollection) return;

    const total = currentCollection.items.length;
    currentItemIndex = (nextIndex + total) % total;
    currentItem = currentCollection.items[currentItemIndex];
    currentImageIndex = 0;

    renderModalMeta();
    renderMainImage();
    renderThumbs();
  }

  function nextItem() {
    if (!currentCollection) return;
    setCurrentItemByIndex(currentItemIndex + 1);
  }

  function prevItem() {
    if (!currentCollection) return;
    setCurrentItemByIndex(currentItemIndex - 1);
  }

  function setupHorizontalWheel() {
    const rows = document.querySelectorAll("[data-merch-row]");

    rows.forEach((row) => {
      row.addEventListener(
        "wheel",
        (e) => {
          if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            e.preventDefault();
            row.scrollLeft += e.deltaY;
          }
        },
        { passive: false },
      );
    });
  }

  root.addEventListener("click", (e) => {
    const button = e.target.closest("[data-merch-id]");
    if (!button) return;

    openModalByIds(button.dataset.collectionId, button.dataset.merchId);
  });

  modal.addEventListener("click", (e) => {
    if (e.target.closest("[data-merch-close]")) {
      closeModal();
      return;
    }

    if (e.target.closest("[data-merch-next]")) {
      nextItem();
      return;
    }

    if (e.target.closest("[data-merch-prev]")) {
      prevItem();
      return;
    }

    const thumb = e.target.closest("[data-thumb-index]");
    if (thumb) {
      currentImageIndex = Number(thumb.dataset.thumbIndex);
      renderMainImage();
      renderThumbs();
      return;
    }

    if (e.target === modal) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (!modal.classList.contains("open")) return;

    if (e.key === "Escape") closeModal();
    if (e.key === "ArrowRight") nextItem();
    if (e.key === "ArrowLeft") prevItem();
  });

  renderCollections();
  setupHorizontalWheel();
})();
