/* kkasprowicz.com — język, motyw, nawigacja, zakładki, odsłanianie sekcji */
(function () {
  const root = document.documentElement;
  const hasIO = "IntersectionObserver" in window;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* tryb prywatny */ } },
  };

  // Menu mobilne: kopia linków z głównej nawigacji
  const mnav = document.querySelector(".mnav");
  if (mnav) document.querySelectorAll(".nav a").forEach((a) => mnav.appendChild(a.cloneNode(true)));

  // Język: PL domyślnie, EN z przełącznika lub z przeglądarki
  const langBtn = document.getElementById("langBtn");
  const meta = document.querySelector('meta[name="description"]');
  const title = document.querySelector("title");
  const live = document.getElementById("live");
  const og = document.querySelector('meta[property="og:description"]');
  const pl = { meta: meta.dataset.pl, title: title.dataset.pl, og: og.dataset.pl };
  const hrefs = [...document.querySelectorAll("[data-href-en]")].map((a) => [a, a.getAttribute("href")]);
  function setLang(l, announce) {
    root.lang = l;
    root.dataset.lang = l;
    langBtn.setAttribute("aria-label", l === "pl" ? "EN – przełącz na angielski" : "PL – switch to Polish");
    document.querySelectorAll("[data-aria-" + l + "]").forEach((el) => el.setAttribute("aria-label", el.getAttribute("data-aria-" + l)));
    meta.content = l === "pl" ? pl.meta : meta.dataset.en;
    og.content = l === "pl" ? pl.og : og.dataset.en;
    document.title = l === "pl" ? pl.title : title.dataset.en;
    hrefs.forEach(([a, href]) => a.setAttribute("href", l === "pl" ? href : a.dataset.hrefEn));
    if (announce) live.textContent = l === "pl" ? "Język: polski" : "Language: English";
  }
  // język ustawił już skrypt w <head>; zapisujemy tylko świadomy wybór
  setLang(root.dataset.lang === "en" ? "en" : "pl");
  langBtn.addEventListener("click", () => {
    const l = root.dataset.lang === "pl" ? "en" : "pl";
    setLang(l, true);
    store.set("kk-lang", l);
  });

  // Motyw dzienny/nocny, domyślnie systemowy; klasa is-light steruje jasnym hero i kolorami sieci
  const themeBtn = document.getElementById("themeBtn");
  const isDark = () => root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  const themeLabels = { pl: ["Przełącz na tryb nocny", "Przełącz na tryb dzienny"], en: ["Switch to night mode", "Switch to day mode"] };
  function syncTheme() {
    const dark = isDark();
    root.classList.toggle("is-light", !dark);
    const pair = themeLabels.pl, en = themeLabels.en;
    themeBtn.dataset.ariaPl = pair[dark ? 1 : 0];
    themeBtn.dataset.ariaEn = en[dark ? 1 : 0];
    const label = root.dataset.lang === "en" ? themeBtn.dataset.ariaEn : themeBtn.dataset.ariaPl;
    themeBtn.setAttribute("aria-label", label);
    themeBtn.title = label;
    document.querySelector('meta[name="theme-color"]').content = dark ? "#050807" : "#fafaf9";
    document.dispatchEvent(new Event("kk-theme"));
  }
  syncTheme();
  matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", syncTheme);
  themeBtn.addEventListener("click", () => {
    root.dataset.theme = isDark() ? "light" : "dark";
    store.set("kk-theme", root.dataset.theme);
    syncTheme();
  });
  langBtn.addEventListener("click", syncTheme);

  // Zakładki (wzorzec ARIA tabs: strzałki, Home, End)
  document.querySelectorAll("[role=tablist]").forEach((list) => {
    const tabs = [...list.querySelectorAll("[role=tab]")];
    const select = (tab, focus) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute("aria-selected", on);
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
      });
      if (focus) tab.focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => select(t));
      t.addEventListener("keydown", (e) => {
        const k = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
        if (k === undefined) return;
        e.preventDefault();
        select(tabs[(k + tabs.length) % tabs.length], true);
      });
    });
  });

  // Pasek górny: tło po przewinięciu
  const top = document.getElementById("top");
  // na telefonie pasek sekcji chowa się przy przewijaniu w dół i wraca przy przewijaniu w górę
  let lastY = scrollY;
  const onScroll = () => {
    top.classList.toggle("scrolled", scrollY > 24);
    if (Math.abs(scrollY - lastY) > 8) { top.classList.toggle("compact", scrollY > lastY && scrollY > 240); lastY = scrollY; }
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (!hasIO) return;

  // Aktywna sekcja w obu menu
  const links = [...document.querySelectorAll(".nav a, .mnav a")];
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((l) => {
        if (l.getAttribute("href") === "#" + e.target.id) l.setAttribute("aria-current", "true");
        else l.removeAttribute("aria-current");
      });
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  new Set(links.map((a) => a.getAttribute("href").slice(1)).concat("hero")).forEach((id) => { const s = document.getElementById(id); if (s) spy.observe(s); });

  // Odsłanianie elementów przy przewijaniu
  // przy animacjach sprzężonych z przewijaniem (CSS animation-timeline) stare odsłanianie jest zbędne
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || CSS.supports("animation-timeline: view()")) return;
  const reveal = document.querySelectorAll(".sec .wrap > *, .card, .proj, .pubs li");
  reveal.forEach((el) => el.classList.add("rv"));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { rootMargin: "0px 0px -8% 0px" });
  reveal.forEach((el) => io.observe(el));
})();
