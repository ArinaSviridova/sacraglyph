(() => {
  const lang = (document.documentElement.lang || "ru").toLowerCase();

  function t(ru, en) {
    return lang === "en" ? en : ru;
  }

  const CMS_STORAGE_KEY = "bazookaCmsContent";

  function readCmsContent() {
    if (window.BAZOOKA_RUNTIME_CONTENT) return window.BAZOOKA_RUNTIME_CONTENT;
    try {
      const local = window.localStorage && window.localStorage.getItem(CMS_STORAGE_KEY);
      if (local) return JSON.parse(local) || {};
    } catch (error) {}

    return window.BAZOOKA_SITE_CONTENT || {};
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

  function normalizeImageSet(image) {
    if (!image) return { jpg: "/assets/img/price-placeholder.jpg" };
    if (typeof image === "string") return { jpg: image };
    if (image.url) return { ...image, jpg: image.url };
    if (image.path) return { ...image, jpg: image.path };
    if (image.jpg || image.webp || image.avif) return image;
    if (image.baseName) return createImageSet(image.baseName);
    return { jpg: "/assets/img/price-placeholder.jpg" };
  }

  function imageSeo(imageSet, fallback) {
    const normalized = normalizeImageSet(imageSet);
    return {
      alt: t(normalized.altRu || fallback, normalized.altEn || normalized.altRu || fallback),
      title: t(normalized.titleRu || "", normalized.titleEn || normalized.titleRu || ""),
    };
  }

  function renderPicture(
    imageSet,
    alt,
    imgClass = "",
    sizes = "100vw",
    loading = "lazy",
    fetchPriority = "auto",
  ) {
    const normalized = normalizeImageSet(imageSet);
    const jpg = normalized.jpg || normalized.webp || normalized.avif || "/assets/img/price-placeholder.jpg";

    if (!normalized.avif && !normalized.webp) {
      return `
        <img
          class="${escapeHtml(imgClass)}"
          src="${escapeHtml(jpg)}"
          alt="${escapeHtml(alt)}"
          ${normalized.titleRu || normalized.titleEn || normalized.title ? `title="${escapeHtml(t(normalized.titleRu || normalized.title || "", normalized.titleEn || normalized.titleRu || normalized.title || ""))}"` : ""}
          loading="${escapeHtml(loading)}"
          fetchpriority="${escapeHtml(fetchPriority)}"
          decoding="async">
      `;
    }

    return `
      <picture>
        ${normalized.avif ? `<source type="image/avif" srcset="${escapeHtml(normalized.avif)}" sizes="${escapeHtml(sizes)}">` : ""}
        ${normalized.webp ? `<source type="image/webp" srcset="${escapeHtml(normalized.webp)}" sizes="${escapeHtml(sizes)}">` : ""}
        <img
          class="${escapeHtml(imgClass)}"
          src="${escapeHtml(jpg)}"
          alt="${escapeHtml(alt)}"
          ${normalized.titleRu || normalized.titleEn || normalized.title ? `title="${escapeHtml(t(normalized.titleRu || normalized.title || "", normalized.titleEn || normalized.titleRu || normalized.title || ""))}"` : ""}
          loading="${escapeHtml(loading)}"
          fetchpriority="${escapeHtml(fetchPriority)}"
          decoding="async">
      </picture>
    `;
  }

  let merchCollections = [
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
            "Футболка из линейки Black. Купить можно на Etsy. Вопросы по размеру, наличию и доставке - в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Black collection. Buy on Etsy. For sizing, stock and delivery questions, message Instagram or Telegram.",
          images: [createImageSet("Black1")],
          instagram: "https://www.instagram.com/yugenmagaz/",
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
            "Футболка из линейки Black. Купить можно на Etsy. Вопросы по размеру, наличию и доставке - в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Black collection. Buy on Etsy. For sizing, stock and delivery questions, message Instagram or Telegram.",
          images: [createImageSet("Black2")],
          instagram: "https://www.instagram.com/yugenmagaz/",
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
            "Футболка из линейки Black. Купить можно на Etsy. Вопросы по размеру, наличию и доставке - в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Black collection. Buy on Etsy. For sizing, stock and delivery questions, message Instagram or Telegram.",
          images: [createImageSet("Black3")],
          instagram: "https://www.instagram.com/yugenmagaz/",
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
            "Футболка из линейки Black. Купить можно на Etsy. Вопросы по размеру, наличию и доставке - в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Black collection. Buy on Etsy. For sizing, stock and delivery questions, message Instagram or Telegram.",
          images: [createImageSet("Black4")],
          instagram: "https://www.instagram.com/yugenmagaz/",
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
            "Футболка из линейки Black. Купить можно на Etsy. Вопросы по размеру, наличию и доставке - в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Black collection. Buy on Etsy. For sizing, stock and delivery questions, message Instagram or Telegram.",
          images: [createImageSet("Black5")],
          instagram: "https://www.instagram.com/yugenmagaz/",
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
            "Футболка из линейки Black. Купить можно на Etsy. Вопросы по размеру, наличию и доставке - в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Black collection. Buy on Etsy. For sizing, stock and delivery questions, message Instagram or Telegram.",
          images: [createImageSet("Black6")],
          instagram: "https://www.instagram.com/yugenmagaz/",
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
            "Футболка из линейки Black. Купить можно на Etsy. Вопросы по размеру, наличию и доставке - в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Black collection. Buy on Etsy. For sizing, stock and delivery questions, message Instagram or Telegram.",
          images: [createImageSet("Black7")],
          instagram: "https://www.instagram.com/yugenmagaz/",
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
            "Футболка из линейки Black. Купить можно на Etsy. Вопросы по размеру, наличию и доставке - в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Black collection. Buy on Etsy. For sizing, stock and delivery questions, message Instagram or Telegram.",
          images: [createImageSet("Black8")],
          instagram: "https://www.instagram.com/yugenmagaz/",
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
            "Футболка из линейки Black. Купить можно на Etsy. Вопросы по размеру, наличию и доставке - в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Black collection. Buy on Etsy. For sizing, stock and delivery questions, message Instagram or Telegram.",
          images: [createImageSet("Black9")],
          instagram: "https://www.instagram.com/yugenmagaz/",
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
            "Футболка из линейки Black. Купить можно на Etsy. Вопросы по размеру, наличию и доставке - в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Black collection. Buy on Etsy. For sizing, stock and delivery questions, message Instagram or Telegram.",
          images: [createImageSet("Black10")],
          instagram: "https://www.instagram.com/yugenmagaz/",
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
            "Футболка из линейки Black. Купить можно на Etsy. Вопросы по размеру, наличию и доставке - в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Black collection. Buy on Etsy. For sizing, stock and delivery questions, message Instagram or Telegram.",
          images: [createImageSet("Black11")],
          instagram: "https://www.instagram.com/yugenmagaz/",
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
            "Футболка из линейки Custom. Купить можно на Etsy. Вопросы по размеру, наличию и доставке - в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Custom collection. Buy on Etsy. For sizing, stock and delivery questions, message Instagram or Telegram.",
          images: [createImageSet("Custom1"), createImageSet("CustomBack1")],
          instagram: "https://www.instagram.com/yugenmagaz/",
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
            "Футболка из линейки Custom. Купить можно на Etsy. Вопросы по размеру, наличию и доставке - в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Custom collection. Buy on Etsy. For sizing, stock and delivery questions, message Instagram or Telegram.",
          images: [createImageSet("Custom2"), createImageSet("CustomBack2")],
          instagram: "https://www.instagram.com/yugenmagaz/",
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
            "Футболка из линейки Custom. Купить можно на Etsy. Вопросы по размеру, наличию и доставке - в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Custom collection. Buy on Etsy. For sizing, stock and delivery questions, message Instagram or Telegram.",
          images: [createImageSet("Custom3"), createImageSet("CustomBack3")],
          instagram: "https://www.instagram.com/yugenmagaz/",
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
            "Футболка из линейки Custom. Купить можно на Etsy. Вопросы по размеру, наличию и доставке - в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Custom collection. Buy on Etsy. For sizing, stock and delivery questions, message Instagram or Telegram.",
          images: [createImageSet("Custom4"), createImageSet("CustomBack4")],
          instagram: "https://www.instagram.com/yugenmagaz/",
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
            "Худи из линейки Hoodie. Купить можно на Etsy. Вопросы по размеру, наличию и доставке - в Instagram или Telegram.",
          descriptionEn:
            "Hoodie from the Hoodie collection. Buy on Etsy. For sizing, stock and delivery questions, message Instagram or Telegram.",
          images: [createImageSet("Hoodie1"), createImageSet("HoodieBack1")],
          instagram: "https://www.instagram.com/yugenmagaz/",
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
            "Худи из линейки Hoodie. Купить можно на Etsy. Вопросы по размеру, наличию и доставке - в Instagram или Telegram.",
          descriptionEn:
            "Hoodie from the Hoodie collection. Buy on Etsy. For sizing, stock and delivery questions, message Instagram or Telegram.",
          images: [
            createImageSet("Hoodie2"),
            createImageSet("HoodieBack2"),
            createImageSet("HoodieBack2-1"),
          ],
          instagram: "https://www.instagram.com/yugenmagaz/",
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
            "Футболка из линейки Yugen. Купить можно на Etsy. Вопросы по размеру, наличию и доставке - в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Yugen collection. Buy on Etsy. For sizing, stock and delivery questions, message Instagram or Telegram.",
          images: [createImageSet("Yugen1")],
          instagram: "https://www.instagram.com/yugenmagaz/",
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
            "Футболка из линейки Yugen. Купить можно на Etsy. Вопросы по размеру, наличию и доставке - в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Yugen collection. Buy on Etsy. For sizing, stock and delivery questions, message Instagram or Telegram.",
          images: [
            createImageSet("Yugen2"),
            createImageSet("Yugen12"),
            createImageSet("Yugen13"),
          ],
          instagram: "https://www.instagram.com/yugenmagaz/",
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
            "Футболка из линейки Yugen. Купить можно на Etsy. Вопросы по размеру, наличию и доставке - в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Yugen collection. Buy on Etsy. For sizing, stock and delivery questions, message Instagram or Telegram.",
          images: [createImageSet("Yugen3")],
          instagram: "https://www.instagram.com/yugenmagaz/",
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
            "Футболка из линейки Yugen. Купить можно на Etsy. Вопросы по размеру, наличию и доставке - в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Yugen collection. Buy on Etsy. For sizing, stock and delivery questions, message Instagram or Telegram.",
          images: [createImageSet("Yugen4")],
          instagram: "https://www.instagram.com/yugenmagaz/",
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
            "Футболка из линейки Yugen. Купить можно на Etsy. Вопросы по размеру, наличию и доставке - в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Yugen collection. Buy on Etsy. For sizing, stock and delivery questions, message Instagram or Telegram.",
          images: [createImageSet("Yugen5"), createImageSet("Yugen14")],
          instagram: "https://www.instagram.com/yugenmagaz/",
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
            "Футболка из линейки Yugen. Купить можно на Etsy. Вопросы по размеру, наличию и доставке - в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Yugen collection. Buy on Etsy. For sizing, stock and delivery questions, message Instagram or Telegram.",
          images: [createImageSet("Yugen6")],
          instagram: "https://www.instagram.com/yugenmagaz/",
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
            "Футболка из линейки Yugen. Купить можно на Etsy. Вопросы по размеру, наличию и доставке - в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Yugen collection. Buy on Etsy. For sizing, stock and delivery questions, message Instagram or Telegram.",
          images: [createImageSet("Yugen7")],
          instagram: "https://www.instagram.com/yugenmagaz/",
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
            "Футболка из линейки Yugen. Купить можно на Etsy. Вопросы по размеру, наличию и доставке - в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Yugen collection. Buy on Etsy. For sizing, stock and delivery questions, message Instagram or Telegram.",
          images: [createImageSet("Yugen8")],
          instagram: "https://www.instagram.com/yugenmagaz/",
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
            "Футболка из линейки Yugen. Купить можно на Etsy. Вопросы по размеру, наличию и доставке - в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Yugen collection. Buy on Etsy. For sizing, stock and delivery questions, message Instagram or Telegram.",
          images: [createImageSet("Yugen10"), createImageSet("Yugen9")],
          instagram: "https://www.instagram.com/yugenmagaz/",
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
            "Футболка из линейки Yugen. Купить можно на Etsy. Вопросы по размеру, наличию и доставке - в Instagram или Telegram.",
          descriptionEn:
            "T-shirt from the Yugen collection. Buy on Etsy. For sizing, stock and delivery questions, message Instagram or Telegram.",
          images: [createImageSet("Yugen11")],
          instagram: "https://www.instagram.com/yugenmagaz/",
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
  const etsyBtn = document.getElementById("merchEtsyBtn");

  let currentCollection = null;
  let currentItem = null;
  let currentItemIndex = 0;
  let currentImageIndex = 0;
  let lastFocusedElement = null;

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


  function normalizeCmsMerchItem(item, index, collectionId) {
    const id = item.id || `${collectionId || "item"}-${Date.now()}-${index}`;
    return {
      id,
      categoryRu: item.categoryRu || item.typeRu || "Мерч",
      categoryEn: item.categoryEn || item.typeEn || "Merch",
      titleRu: item.titleRu || item.title || "Товар",
      titleEn: item.titleEn || item.title || "Product",
      collectionRu: item.collectionRu || "",
      collectionEn: item.collectionEn || "",
      stockStatus: item.stockStatus || (item.inStock === false ? "out" : "in"),
      priceRu: formatPrice(item, "ru"),
      priceEn: formatPrice(item, "en"),
      inStock: item.inStock !== false,
      descriptionRu: item.descriptionRu || "",
      descriptionEn: item.descriptionEn || item.descriptionRu || "",
      images: Array.isArray(item.images) && item.images.length ? item.images.map(normalizeImageSet) : [normalizeImageSet(item.image)],
      instagram: item.instagram || "https://www.instagram.com/yugenmagaz/",
      telegram: item.telegram || "https://t.me/bazookatattoo",
      etsyUrl: item.etsyUrl || item.etsy_url || "https://yugenmagazart.etsy.com",
    };
  }

  function normalizeCmsCollection(collection, index) {
    const id = collection.id || `collection-${Date.now()}-${index}`;
    const items = Array.isArray(collection.items)
      ? collection.items.map((item, itemIndex) => normalizeCmsMerchItem(item, itemIndex, id))
      : [];

    return {
      id,
      titleRu: collection.titleRu || collection.title || "Коллекция",
      titleEn: collection.titleEn || collection.title || "Collection",
      textRu: collection.textRu || "Выбери вещь и открой карточку для подробностей.",
      textEn: collection.textEn || "Choose an item and open the card for details.",
      items,
    };
  }

  function stockLabel(item, targetLang) {
    const status = item.stockStatus || (item.inStock === false ? "out" : "in");
    if (status === "out") return targetLang === "en" ? "Out of stock" : "Нет в наличии";
    if (status === "preorder") return targetLang === "en" ? "Made to order" : "Под заказ";
    return targetLang === "en" ? "In stock" : "В наличии";
  }

  function formatPrice(item, targetLang) {
    const status = stockLabel(item, targetLang);
    if (Array.isArray(item.prices) && item.prices.length) {
      const prices = item.prices
        .filter((price) => price && (price.amount || price.value))
        .map((price) => `${price.amount || price.value} ${price.currency || ""}`.trim())
        .join(" / ");
      return prices ? `${prices} · ${status}` : status;
    }
    return status;
  }

  function applyCmsMerch() {
    const cms = readCmsContent();
    if (!cms || !Array.isArray(cms.merchCollections) || !cms.merchCollections.length) return;
    merchCollections = cms.merchCollections.map(normalizeCmsCollection).filter((collection) => collection.items.length);
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
              (item, itemIndex) => {
                const isPriority = itemIndex < 4;
                return `
            <article class="merchItem">
              <button
                class="merchCard"
                type="button"
                data-merch-id="${escapeHtml(item.id)}"
                data-collection-id="${escapeHtml(collection.id)}">
                <div class="merchMedia">
                  ${renderPicture(
                    item.images[0],
                    imageSeo(item.images[0], t(item.titleRu, item.titleEn)).alt,
                    "merchCardImg",
                    "(max-width: 767px) 70vw, (max-width: 1200px) 33vw, 280px",
                    isPriority ? "eager" : "lazy",
                    isPriority ? "high" : "auto",
                  )}
                </div>
                <div class="merchBody">
                  <div class="merchTitle">${escapeHtml(t(item.titleRu, item.titleEn))}</div>
                  <div class="merchMeta merchMetaVisible">${escapeHtml(t(item.priceRu, item.priceEn))}</div>
                </div>
              </button>
            </article>
          `;
              },
            )
            .join("")}
        </div>
      </section>
    `,
      )
      .join("");
  }


  function warmUpMerchImages() {
    if (!root) return;
    const urls = Array.from(root.querySelectorAll(".merchCardImg"))
      .slice(0, 12)
      .map((img) => img.currentSrc || img.src)
      .filter(Boolean);
    urls.forEach((url) => {
      const image = new Image();
      image.decoding = "async";
      image.src = url;
    });
  }

  function renderMainImage() {
    if (!currentItem || !viewerMedia) return;

    viewerMedia.innerHTML = renderPicture(
      currentItem.images[currentImageIndex],
      imageSeo(currentItem.images[currentImageIndex], t(currentItem.titleRu, currentItem.titleEn)).alt,
      "merchViewerImg",
      "(max-width: 767px) 100vw, 900px",
      "eager",
      "high",
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
        ${renderPicture(imageSet, imageSeo(imageSet, t(currentItem.titleRu, currentItem.titleEn)).alt, "merchThumbImg", "120px")}
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
      priceEl.textContent = t(currentItem.priceRu, currentItem.priceEn);
    if (descriptionEl)
      descriptionEl.textContent = t(
        currentItem.descriptionRu,
        currentItem.descriptionEn,
      );

    if (instagramBtn) instagramBtn.href = currentItem.instagram;
    if (telegramBtn) telegramBtn.href = currentItem.telegram;
    if (etsyBtn) etsyBtn.href = currentItem.etsyUrl || "https://yugenmagazart.etsy.com";
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

    lastFocusedElement = document.activeElement;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    const closeButton = modal.querySelector("[data-merch-close]");
    if (closeButton) closeButton.focus({ preventScroll: true });
  }

  function closeModal() {
    const active = document.activeElement;
    if (active && modal.contains(active)) active.blur();
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (lastFocusedElement && document.contains(lastFocusedElement)) {
      lastFocusedElement.focus({ preventScroll: true });
    }
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
    // Keep the mouse wheel / trackpad vertical gesture for normal page scrolling.
    // Horizontal scrolling still works with horizontal swipe/trackpad gestures, drag, and scrollbar.
    // The previous version converted vertical wheel movement into horizontal row scroll,
    // which trapped users inside the merch carousel. A tiny UX prison, basically.
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

  async function loadSupabaseRuntimeContent() {
    try {
      if (!window.BazookaCMS || !window.BazookaCMS.isReady()) return;
      const content = await window.BazookaCMS.getPublicContent();
      if (content) window.BAZOOKA_RUNTIME_CONTENT = content;
    } catch (error) {
      console.warn("Supabase merch fallback:", error);
    }
  }

  async function initMerchPage() {
    await loadSupabaseRuntimeContent();
    applyCmsMerch();
    renderCollections();
    setupHorizontalWheel();
  }

  initMerchPage();
})();
