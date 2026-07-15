(() => {
  const cfg = window.BAZOOKA_SUPABASE || {};
  const DEFAULT_BUCKET = cfg.bucket || "cms-media";
  const cache = new Set();

  function normalizeUrl(url) {
    return String(url || "").trim();
  }

  function storageParts(url) {
    const src = normalizeUrl(url);
    const match = src.match(/^(https?:\/\/[^/]+)\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/i);
    if (!match) return null;
    return { origin: match[1], bucket: match[2], path: match[3] };
  }

  function optimizedUrl(url, options = {}) {
    const src = normalizeUrl(url);
    const parts = storageParts(src);
    if (!parts) return src;

    const width = Math.max(160, Math.min(2400, Number(options.width || 900)));
    const quality = Math.max(35, Math.min(92, Number(options.quality || 74)));
    const resize = options.resize || "cover";
    const params = new URLSearchParams({ width: String(width), quality: String(quality), resize });

    if (options.height) {
      params.set("height", String(Math.max(160, Math.min(2400, Number(options.height)))));
    }

    return `${parts.origin}/storage/v1/render/image/public/${parts.bucket}/${parts.path}?${params.toString()}`;
  }

  function srcset(url, widths = [360, 600, 900, 1200], options = {}) {
    const src = normalizeUrl(url);
    if (!storageParts(src)) return "";
    return widths
      .map((width) => `${optimizedUrl(src, { ...options, width })} ${width}w`)
      .join(", ");
  }

  function addPreconnect() {
    const url = normalizeUrl(cfg.url);
    if (!url) return;
    try {
      const origin = new URL(url).origin;
      if (!document.querySelector(`link[rel="preconnect"][href="${origin}"]`)) {
        const preconnect = document.createElement("link");
        preconnect.rel = "preconnect";
        preconnect.href = origin;
        preconnect.crossOrigin = "anonymous";
        document.head.appendChild(preconnect);
      }
      if (!document.querySelector(`link[rel="dns-prefetch"][href="${origin}"]`)) {
        const dns = document.createElement("link");
        dns.rel = "dns-prefetch";
        dns.href = origin;
        document.head.appendChild(dns);
      }
    } catch (error) {}
  }

  function preload(url, options = {}) {
    const src = normalizeUrl(url);
    if (!src || cache.has(src)) return;
    cache.add(src);
    const img = new Image();
    img.decoding = "async";
    img.fetchPriority = options.priority || "low";
    img.src = src;
  }

  function preloadBatch(urls, options = {}) {
    const list = Array.from(new Set((urls || []).filter(Boolean)));
    const limit = Number(options.limit || 24);
    const delay = Number(options.delay || 90);
    let index = 0;

    const step = () => {
      const chunk = list.slice(index, index + limit);
      chunk.forEach((url) => preload(url, { priority: options.priority || "low" }));
      index += limit;
      if (index < list.length) {
        window.setTimeout(() => {
          if ("requestIdleCallback" in window) window.requestIdleCallback(step, { timeout: 1200 });
          else step();
        }, delay);
      }
    };

    if ("requestIdleCallback" in window) window.requestIdleCallback(step, { timeout: 900 });
    else window.setTimeout(step, delay);
  }

  function markFirstImages(selector, count = 6) {
    document.querySelectorAll(selector).forEach((img, index) => {
      if (index < count) {
        img.loading = "eager";
        img.fetchPriority = "high";
      } else {
        img.loading = "lazy";
        img.fetchPriority = "low";
      }
      img.decoding = "async";
    });
  }

  addPreconnect();

  window.BazookaImages = {
    optimizedUrl,
    srcset,
    preload,
    preloadBatch,
    markFirstImages,
    isSupabaseStorageUrl: (url) => Boolean(storageParts(url)),
  };
})();
