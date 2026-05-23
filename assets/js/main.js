(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const works = [
    {
      id: 12,
      altRu:
        "Каллиграфическая татуировка с элементами lettering на предплечье, freehand.",
      altEn: "Calligraphy and lettering tattoo on forearm, freehand.",
    },
    {
      id: 11,
      altRu:
        "Абстрактная blackwork татуировка на руке по индивидуальному эскизу.",
      altEn: "Abstract blackwork tattoo on arm, custom design.",
    },
    {
      id: 10,
      altRu: "Dark lettering татуировка на кисти, freehand.",
      altEn: "Dark lettering tattoo on hand, freehand.",
    },
    {
      id: 8,
      altRu:
        "Lettering татуировка на шее, ключице и груди с круговой композицией.",
      altEn:
        "Lettering tattoo on neck, collarbone and chest in circular composition.",
    },
    {
      id: 7,
      altRu: "Каллиграфическая lettering татуировка с надписью на груди.",
      altEn: "Calligraphic lettering tattoo with inscription on chest.",
    },
    {
      id: 6,
      altRu: "Lettering татуировка на предплечье с высокой детализацией.",
      altEn: "High-detail lettering tattoo on forearm.",
    },
    {
      id: 4,
      altRu: "Симметричная dark lettering композиция на шее.",
      altEn: "Symmetrical dark lettering composition on neck.",
    },
    {
      id: 3,
      altRu:
        "Татуировка с сочетанием реализма, lettering и грузинского шрифта.",
      altEn: "Tattoo combining realism, lettering and Georgian script.",
    },
    {
      id: 21,
      altRu: "Рукав в стиле suminagashi, blackwork и абстракции, freehand.",
      altEn: "Suminagashi, blackwork and abstract sleeve tattoo, freehand.",
    },
    {
      id: 22,
      altRu: "Абстрактный blackwork рукав в стиле suminagashi, freehand.",
      altEn: "Abstract blackwork sleeve in suminagashi style, freehand.",
    },
    {
      id: 1,
      altRu: "Freehand рукав в стиле suminagashi и blackwork.",
      altEn: "Freehand sleeve tattoo in suminagashi and blackwork style.",
    },
    {
      id: 17,
      altRu: "Freehand lettering татуировка.",
      altEn: "Freehand lettering tattoo.",
    },
    {
      id: 16,
      altRu: "Круговая каллиграфическая татуировка вокруг локтя, freehand.",
      altEn: "Circular calligraphy tattoo around elbow, freehand.",
    },
    {
      id: 13,
      altRu: "Каллиграфическая круговая татуировка на локте, freehand.",
      altEn: "Circular calligraphy tattoo on elbow, freehand.",
    },
    {
      id: 14,
      altRu: "Freehand lettering татуировка на ноге.",
      altEn: "Freehand lettering tattoo on leg.",
    },
    {
      id: 15,
      altRu: "Lettering татуировка на ноге, freehand.",
      altEn: "Lettering tattoo on leg, freehand.",
    },
    {
      id: 30,
      altRu: "Blastover татуировка на руке с freehand композицией.",
      altEn: "Blastover tattoo on arm with freehand composition.",
    },
    {
      id: 32,
      altRu: "Blastover татуировка на запястье, freehand.",
      altEn: "Blastover tattoo on wrist, freehand.",
    },
    {
      id: 18,
      altRu: "Татуировка по индивидуальной идее клиента.",
      altEn: "Custom tattoo based on client idea.",
    },
    {
      id: 27,
      altRu: "Freehand татуировка на бицепсе.",
      altEn: "Freehand tattoo on bicep.",
    },
    {
      id: 2,
      altRu: "Готическая каллиграфия на предплечье.",
      altEn: "Gothic calligraphy tattoo on forearm.",
    },
    {
      id: 24,
      altRu: "Абстрактная татуировка на руке.",
      altEn: "Abstract tattoo on arm.",
    },
    {
      id: 28,
      altRu: "Freehand dark lettering рукав.",
      altEn: "Freehand dark lettering sleeve tattoo.",
    },
    {
      id: 29,
      altRu: "Dark lettering рукав, freehand.",
      altEn: "Dark lettering sleeve tattoo, freehand.",
    },
    {
      id: 31,
      altRu: "Коррекция старой татуировки на шее.",
      altEn: "Correction of an existing tattoo on neck.",
    },
    {
      id: 23,
      altRu: "Граффити татуировка со шрифтом в стиле Star Wars.",
      altEn: "Graffiti tattoo with Star Wars inspired lettering.",
    },
    {
      id: 25,
      altRu: "Каллиграфическая татуировка на кисти по идее клиента.",
      altEn: "Calligraphy tattoo on hand based on client idea.",
    },
    {
      id: 26,
      altRu: "Шрифтовая татуировка на груди.",
      altEn: "Lettering tattoo on chest.",
    },
    {
      id: 19,
      altRu: "Шрифтовая татуировка с текстом на бедре.",
      altEn: "Text lettering tattoo on thigh.",
    },
    {
      id: 20,
      altRu: "Шрифтовая татуировка со словом на грузинском языке.",
      altEn: "Lettering tattoo with Georgian word.",
    },
  ];

  const state = {
    scrollingLock: false,
    mobileOpen: false,
    currentHash: location.hash || "",
  };

  const el = {
    header: $(".header"),
    burger: $("[data-burger]"),
    mobileNav: $("[data-mobile]"),
    body: document.body,
    lightbox: $("[data-lightbox]"),
    lightboxImg: $("[data-lightbox-img]"),
    lightboxCaption: $("[data-lightbox-caption]"),
    lightboxSrcAvif: $("[data-lightbox-source-avif]"),
    lightboxSrcWebp: $("[data-lightbox-source-webp]"),
  };

  function getSections() {
    return $$("section[id]");
  }

  const navLinks = $$(".nav a, .mobileNav a");

  function renderWorksGallery() {
    const gallery = document.getElementById("worksGallery");
    if (!gallery) return;

    const lang = (document.documentElement.lang || "ru").toLowerCase();
    const isEn = lang === "en";

    gallery.innerHTML = works
      .map((work) => {
        const alt = isEn
          ? work.altEn || work.altRu || ""
          : work.altRu || work.altEn || "";

        return `
        <a class="thumb"
          href="/assets/img/works/work-${work.id}-1600.webp"
          data-full-avif="/assets/img/works/work-${work.id}-1600.avif"
          data-lightbox-link>
          <picture>
            <source
              type="image/avif"
              srcset="/assets/img/works/work-${work.id}-400.avif 400w, /assets/img/works/work-${work.id}-600.avif 600w, /assets/img/works/work-${work.id}-900.avif 900w"
              sizes="(max-width: 900px) 100vw, 33vw">
            <source
              type="image/webp"
              srcset="/assets/img/works/work-${work.id}-400.webp 400w, /assets/img/works/work-${work.id}-600.webp 600w, /assets/img/works/work-${work.id}-900.webp 900w"
              sizes="(max-width: 900px) 100vw, 33vw">
            <img
              src="/assets/img/works/work-${work.id}-600.webp"
              alt="${alt}"
              width="800"
              height="600"
              loading="lazy"
              decoding="async"
              fetchpriority="low">
          </picture>
        </a>
      `;
      })
      .join("");
  }

  function headerOffset() {
    return (el.header ? el.header.offsetHeight : 0) + 20;
  }

  function setActive(hash) {
    if (!hash) return;
    navLinks.forEach((a) => {
      a.classList.toggle("active", a.getAttribute("href") === hash);
    });
  }

  function replaceHash(hash) {
    if (!hash || hash === state.currentHash) return;
    state.currentHash = hash;
    history.replaceState(null, "", hash);
    setActive(hash);
  }

  function scrollToId(id) {
    const target = document.getElementById(id);
    if (!target) return;

    const top =
      target.getBoundingClientRect().top + window.pageYOffset - headerOffset();
    state.scrollingLock = true;
    replaceHash(`#${id}`);

    window.scrollTo({ top, behavior: "smooth" });

    window.setTimeout(() => {
      state.scrollingLock = false;
    }, 700);
  }

  function openMobile() {
    if (!el.mobileNav) return;
    state.mobileOpen = true;
    el.mobileNav.style.display = "flex";
    el.body.style.overflow = "hidden";
  }

  function closeMobile() {
    if (!el.mobileNav) return;
    state.mobileOpen = false;
    el.mobileNav.style.display = "none";
    el.body.style.overflow = "";
  }

  function initAnchors() {
    document.addEventListener("click", (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;

      const href = a.getAttribute("href");
      if (!href || href === "#") return;

      const id = href.slice(1);
      if (!document.getElementById(id)) return;

      e.preventDefault();
      scrollToId(id);

      if (state.mobileOpen) closeMobile();
    });
  }

  function initMobile() {
    if (!el.burger || !el.mobileNav) return;

    el.burger.addEventListener("click", () => {
      state.mobileOpen ? closeMobile() : openMobile();
    });

    $$("a", el.mobileNav).forEach((a) => {
      a.addEventListener("click", () => closeMobile());
    });
  }

  function initScrollSpy() {
    const sections = getSections();

    if (!("IntersectionObserver" in window)) return;
    if (!sections.length) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (state.scrollingLock) return;

        const best = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (best) replaceHash(`#${best.target.id}`);
      },
      {
        root: null,
        rootMargin: `-${headerOffset()}px 0px -40% 0px`,
        threshold: [0.15, 0.5],
      },
    );

    sections.forEach((section) => obs.observe(section));
  }

  function initInitialHash() {
    if (!location.hash) return;

    const id = location.hash.slice(1);
    const target = document.getElementById(id);
    if (!target) return;

    requestAnimationFrame(() => {
      const top =
        target.getBoundingClientRect().top +
        window.pageYOffset -
        headerOffset();
      window.scrollTo({ top, behavior: "auto" });
      setActive(location.hash);
    });
  }

  function initLazyBackgrounds() {
    const bgSections = $$("[data-bg-lazy]");
    if (!bgSections.length) return;

    if (!("IntersectionObserver" in window)) {
      bgSections.forEach((section) => {
        const webp = section.getAttribute("data-bg-webp");
        if (webp) section.style.backgroundImage = `url("${webp}")`;
      });
      return;
    }

    const supportsAvif = (() => {
      const canvas = document.createElement("canvas");
      return (
        !!(canvas.getContext && canvas.getContext("2d")) &&
        "toDataURL" in canvas
      );
    })();

    const pickBg = (section) => {
      const avif = section.getAttribute("data-bg-avif");
      const webp = section.getAttribute("data-bg-webp");
      return avif && supportsAvif ? avif : webp;
    };

    const io = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const url = pickBg(entry.target);
          if (url) entry.target.style.backgroundImage = `url("${url}")`;

          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "300px 0px" },
    );

    bgSections.forEach((section) => io.observe(section));
  }

  function initLightbox() {
    if (!el.lightbox || !el.lightboxImg) return;

    const links = $$(
      "[data-lightbox-link], .gallery a.thumb, .priceGallery a.priceMedia",
    );
    if (!links.length) return;

    let currentIndex = 0;

    const conn =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;
    const saveData = !!(conn && conn.saveData);
    const slow = !!(
      conn &&
      (conn.effectiveType === "2g" || conn.effectiveType === "slow-2g")
    );
    const canPreloadNeighbors = !saveData && !slow;

    function preload(url) {
      if (!url) return;
      const img = new Image();
      img.decoding = "async";
      img.src = url;
    }

    function setPicture(fullWebp, fullAvif) {
      if (el.lightboxSrcAvif) el.lightboxSrcAvif.srcset = fullAvif || "";
      if (el.lightboxSrcWebp) el.lightboxSrcWebp.srcset = fullWebp || "";
      el.lightboxImg.src = fullWebp || "";
      el.lightboxImg.decoding = "async";
      el.lightboxImg.fetchPriority = "low";
    }

    function open(index) {
      if (index < 0 || index >= links.length) return;
      currentIndex = index;

      const link = links[index];
      const img = $("img", link);
      const fullWebp = link.getAttribute("href");
      const fullAvif = link.getAttribute("data-full-avif") || "";
      const caption = link.getAttribute("data-caption") || (img ? img.alt : "");

      setPicture(fullWebp, fullAvif);

      if (el.lightboxCaption) {
        el.lightboxCaption.textContent = caption;
        el.lightboxCaption.style.display = caption ? "block" : "none";
      }

      el.lightbox.classList.add("open");
      el.lightbox.setAttribute("aria-hidden", "false");
      el.body.style.overflow = "hidden";

      if (canPreloadNeighbors) {
        const nextLink = links[(currentIndex + 1) % links.length];
        const prevLink =
          links[(currentIndex - 1 + links.length) % links.length];
        preload(nextLink.getAttribute("href"));
        preload(prevLink.getAttribute("href"));
      }
    }

    function close() {
      el.lightbox.classList.remove("open");
      el.lightbox.setAttribute("aria-hidden", "true");
      el.body.style.overflow = "";

      window.setTimeout(() => {
        el.lightboxImg.src = "";
        if (el.lightboxSrcAvif) el.lightboxSrcAvif.srcset = "";
        if (el.lightboxSrcWebp) el.lightboxSrcWebp.srcset = "";
      }, 200);
    }

    function next() {
      open((currentIndex + 1) % links.length);
    }

    function prev() {
      open((currentIndex - 1 + links.length) % links.length);
    }

    links.forEach((link, index) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        open(index);
      });
    });

    $("[data-lightbox-close]")?.addEventListener("click", close);
    $("[data-lightbox-prev]")?.addEventListener("click", (e) => {
      e.stopPropagation();
      prev();
    });
    $("[data-lightbox-next]")?.addEventListener("click", (e) => {
      e.stopPropagation();
      next();
    });

    el.lightbox.addEventListener("click", (e) => {
      if (e.target === el.lightbox) close();
    });

    document.addEventListener("keydown", (e) => {
      if (!el.lightbox.classList.contains("open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    });

    let touchX = null;

    el.lightboxImg.addEventListener(
      "touchstart",
      (e) => {
        touchX = e.changedTouches[0].clientX;
      },
      { passive: true },
    );

    el.lightboxImg.addEventListener(
      "touchend",
      (e) => {
        if (touchX === null) return;
        const diff = e.changedTouches[0].clientX - touchX;
        if (Math.abs(diff) > 50) diff > 0 ? prev() : next();
        touchX = null;
      },
      { passive: true },
    );
  }

  function initContactForm() {
    const form = document.getElementById("contactForm");
    if (!form) return;

    const statusEl = document.getElementById("contactFormStatus");
    const submitBtn = form.querySelector('button[type="submit"]');

    function setStatus(text, isError = false) {
      if (!statusEl) return;
      statusEl.textContent = text || "";
      statusEl.classList.toggle("isError", !!isError);
      statusEl.classList.toggle("isOk", !isError && !!text);
    }

    function isValidEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    if (typeof ym === "function") {
      const clientField = form.elements.clientID;
      if (clientField) {
        ym(108392582, "getClientID", function (clientID) {
          clientField.value = clientID;
        });
      }
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = form.elements.name?.value?.trim() || "";
      const phone = form.elements.phone?.value?.trim() || "";
      const email = form.elements.email?.value?.trim() || "";
      const website = form.elements.website?.value?.trim() || "";
      const clientID = form.elements.clientID?.value?.trim() || "";
      const lang = (document.documentElement.lang || "ru").toLowerCase();
      const isEn = lang === "en";

      const normalizedEmail = (email || "").trim().toLowerCase();
      const normalizedPhone = (phone || "").replace(/[^\d+]/g, "");
      const leadEventId = "lead_" + Date.now();

      if (!normalizedEmail) {
        alert(isEn ? "Please enter your email." : "Пожалуйста, введи email.");
        form.elements.email?.focus();
        return;
      }

      if (!isValidEmail(normalizedEmail)) {
        alert(
          isEn
            ? "Please enter a valid email."
            : "Пожалуйста, введи корректный email.",
        );
        form.elements.email?.focus();
        return;
      }

      setStatus(
        form.dataset.sending || (isEn ? "Sending..." : "Отправляю..."),
        false,
      );
      if (submitBtn) submitBtn.disabled = true;

      try {
        if (typeof gtag === "function") {
          const userData = {
            email: normalizedEmail,
          };

          if (normalizedPhone.length >= 7) {
            userData.phone_number = normalizedPhone;
          }

          gtag("set", "user_data", userData);
        }

        const response = await fetch("/.netlify/functions/contact", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            name,
            phone,
            email: normalizedEmail,
            website,
            clientID,
            page: location.href,
            lang: document.documentElement.lang || "",
            event_id: leadEventId,
          }),
        });

        const json = await response.json().catch(() => ({}));

        if (!response.ok || !json.ok) {
          const msg = json?.error
            ? `${form.dataset.fail || (isEn ? "Error. Please try again later." : "Ошибка. Попробуй ещё раз позже.")} (${json.error})`
            : form.dataset.fail ||
              (isEn
                ? "Error. Please try again later."
                : "Ошибка. Попробуй ещё раз позже.");
          setStatus(msg, true);
          if (submitBtn) submitBtn.disabled = false;
          return;
        }

        setStatus(
          form.dataset.success ||
            (isEn
              ? "Sent. I will contact you soon."
              : "Отправлено. Я скоро свяжусь с тобой."),
          false,
        );

        if (typeof ym === "function") {
          ym(108392582, "reachGoal", "form_submit");
          ym(108392582, "userParams", {
            booking_status: "inquiry",
            client_type: "new",
            repeat_client: "no",
          });
        }

        form.reset();
        if (submitBtn) submitBtn.disabled = false;

        window.location.href = isEn
          ? `/en/thank-you.html?event_id=${encodeURIComponent(leadEventId)}`
          : `/thank-you.html?event_id=${encodeURIComponent(leadEventId)}`;
      } catch (error) {
        setStatus(
          form.dataset.fail ||
            (isEn
              ? "Error. Please try again later."
              : "Ошибка. Попробуй ещё раз позже."),
          true,
        );
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  function initInstagramConversion() {
    const instaBtn = document.querySelector(
      'a[href*="instagram.com/bazookatats"]',
    );
    if (!instaBtn) return;

    instaBtn.addEventListener("click", () => {
      if (typeof gtag === "function") {
        gtag("event", "conversion", {
          send_to: "AW-17859312323/Zk5aCLHJ3IMcEMP1_cNC",
        });
      }
    });
  }

  function initMetaContactTracking() {
    const contactLinks = document.querySelectorAll(
      'a[href*="wa.me"], a[href*="whatsapp"], a[href*="t.me"], a[href*="telegram"], a[href*="instagram.com"]',
    );

    if (!contactLinks.length) return;

    contactLinks.forEach((link) => {
      link.addEventListener("click", () => {
        if (typeof fbq === "function") {
          fbq("track", "Contact");
        }
      });
    });
  }

  function init() {
    renderWorksGallery();
    initMobile();
    initAnchors();
    initLazyBackgrounds();
    initInitialHash();
    initScrollSpy();
    initContactForm();
    initInstagramConversion();
    initMetaContactTracking();

    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(() => initLightbox(), { timeout: 1200 });
    } else {
      window.setTimeout(() => initLightbox(), 80);
    }

    setActive(state.currentHash);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();