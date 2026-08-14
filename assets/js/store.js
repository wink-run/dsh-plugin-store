/* ==========================================================================
   DSH Store · app
   Vanilla JS SPA: fetch data/plugins.json, render directory, filter, sort,
   search, detail modal with copy-to-clipboard, hash routing, light/dark theme.
   ========================================================================== */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const CATS = {
    all:     { zh: "全部插件",      en: "All" },
    ui:      { zh: "界面与交互",    en: "UI & Interface" },
    agent:   { zh: "智能体与自动化", en: "Agents & Automation" },
    vision:  { zh: "视觉理解",      en: "Vision" },
    tools:   { zh: "工具集",        en: "Tools" },
    search:  { zh: "搜索与数据",    en: "Search & Data" },
    memory:  { zh: "记忆与会话",    en: "Memory & Sessions" },
    integration: { zh: "集成与通知", en: "Integration & Notify" },
    dev:     { zh: "开发与运行时",  en: "Dev & Runtime" },
    skill:   { zh: "技能与提示词",  en: "Skills & Prompts" },
    desktop: { zh: "桌面与启动",    en: "Desktop & Launcher" },
    fun:     { zh: "趣味与主题",    en: "Fun & Themes" },
    platform:{ zh: "发行与平台",    en: "Platforms & Distros" },
    docs:    { zh: "文档与索引",    en: "Docs & Indexes" },
    misc:    { zh: "其他",          en: "Misc" },
  };
  const CAT_ORDER = ["ui","agent","vision","tools","search","memory","integration","dev","skill","desktop","fun","platform","docs","misc"];

  const state = {
    data: [],
    cat: "all",
    sort: "recommended",
    search: "",
    page: 1,
    pageSize: 24,
    theme: "dark",
  };

  let featuredEl, gridEl, emptyEl, searchEl;

  /* ---------------- utils ---------------- */
  const fmtStars = (n) => (n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : String(n));
  const fmtNumber = (n) => n.toLocaleString("en-US");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const timeAgo = (iso) => {
    const then = new Date(iso + "T00:00:00Z").getTime();
    if (Number.isNaN(then)) return iso || "未知";
    const days = Math.floor((Date.now() - then) / 86400000);
    if (days < 1) return "今天";
    if (days < 7) return days + " 天前";
    if (days < 31) return Math.floor(days / 7) + " 周前";
    if (days < 365) return Math.floor(days / 30) + " 个月前";
    return Math.floor(days / 365) + " 年前";
  };

  const starIcon = `<svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><path d="M8 1.2l2 4.1 4.6.7-3.3 3.2.8 4.6L8 11.6l-4.1 2.2.8-4.6L1.4 6l4.6-.7z"/></svg>`;
  const copyIcon = `<svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="7" width="10" height="10" rx="2"/><path d="M13 4.5V4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h.5"/></svg>`;
  const checkIcon = `<svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10.5l4 4 8-9"/></svg>`;
  const extIcon = `<svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5H5.5A1.5 1.5 0 0 0 4 6.5v8A1.5 1.5 0 0 0 5.5 16h8a1.5 1.5 0 0 0 1.5-1.5V11M12 4h4v4M16 4l-7 7"/></svg>`;

  const langColor = (lang) => {
    const colors = { TypeScript: "#3178c6", JavaScript: "#f1e05a", Python: "#3572A5", Rust: "#dea584", Go: "#00ADD8", Shell: "#89e051", HTML: "#e34c26", Swift: "#F05138", Vue: "#41b883", CSS: "#563d7c", "C#": "#178600", Kotlin: "#A97BFF", Astro: "#ff5a03", MDX: "#fcb32c", Batchfile: "#C1F12E", Dockerfile: "#384d54", PowerShell: "#012456" };
    return colors[lang] || "var(--text-3)";
  };

  /* ---------------- icons for categories (simple, consistent) ---------------- */
  const CAT_ICONS = {
    all: '<rect x="4" y="4" width="5" height="5" rx="1"/><rect x="11" y="4" width="5" height="5" rx="1"/><rect x="4" y="11" width="5" height="5" rx="1"/><rect x="11" y="11" width="5" height="5" rx="1"/>',
    ui: '<rect x="4" y="4" width="12" height="12" rx="2"/><path d="M4 8h12"/>',
    agent: '<circle cx="8" cy="10" r="3"/><path d="M4 16c0-2 2-3 4-3s4 1 4 3M15 7v6M15 7l2 2-2 2M15 7l-2 2 2 2"/>',
    vision: '<circle cx="10" cy="10" r="3.2"/><path d="M2 10s2.6-4.5 8-4.5 8 4.5 8 4.5-2.6 4.5-8 4.5S2 10 2 10Z"/>',
    tools: '<path d="M14.5 3.5l2 2-1.5 1.5-2-2 1.5-1.5Z"/><path d="M12.8 5.2L5 13l.9 3 3 .9 7.8-7.8"/><path d="M9 4l1.5-1.5M11.5 6.5l1.5 1.5"/>',
    search: '<circle cx="9" cy="9" r="5"/><path d="m13 13 4 4"/>',
    memory: '<path d="M4 5h12v10H4z"/><path d="M4 10h12M8 5v10M12 5v10"/>',
    integration: '<circle cx="6" cy="6" r="2.4"/><circle cx="6" cy="14" r="2.4"/><circle cx="14" cy="10" r="2.4"/><path d="M8 6h4a2 2 0 0 1 2 2v0M8 14h4a2 2 0 0 0 2-2v0"/>',
    dev: '<path d="M7 5L3 10l4 5M13 5l4 5-4 5"/>',
    skill: '<path d="M12 3l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 8.7l5.4-.8z"/>',
    desktop: '<rect x="4" y="5" width="12" height="8" rx="1.5"/><path d="M7 16h6M10 13v3"/>',
    fun: '<path d="M5 11a7 7 0 0 1 14 0M3 11h3M18 11h3"/><circle cx="9" cy="9" r=".8"/><circle cx="15" cy="9" r=".8"/>',
    platform: '<rect x="3" y="4" width="14" height="10" rx="2"/><path d="M8 18h4M10 14v4M17 12l3 3-3 3"/>',
    docs: '<path d="M5 4h9a2 2 0 0 1 2 2v10H5a2 2 0 0 1-2-2V5a1 1 0 0 1 1-1Z"/><path d="M16 8h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v0M8 7h4M8 11h4"/>',
    misc: '<circle cx="8" cy="8" r="3"/><circle cx="16" cy="9" r="2"/><circle cx="12" cy="15" r="2.5"/>',
  };

  /* ---------------- data loading ---------------- */
  async function loadData() {
    try {
      const res = await fetch("data/plugins.json", { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      state.data = await res.json();
    } catch (err) {
      showError("数据加载失败：" + err.message + "。请确认已用 HTTP 服务打开本页（如 python3 -m http.server）。");
      return;
    }
    renderAll();
  }

  function showError(msg) {
    gridEl.innerHTML = `<div class="empty"><h3>无法加载数据</h3><p>${esc(msg)}</p></div>`;
  }

  /* ---------------- stats + meta ---------------- */
  function renderStats() {
    const total = state.data.length;
    const stars = state.data.reduce((s, r) => s + r.stars, 0);
    const cats = CAT_ORDER.filter((c) => c !== "all" && state.data.some((r) => r.category === c)).length;
    const updated = state.data.reduce((m, r) => (r.updated > m ? r.updated : m), "");
    $("#hero-count").textContent = fmtNumber(total);
    $("#stat-plugins").textContent = fmtNumber(total);
    $("#stat-stars").textContent = fmtStars(stars) + "+";
    $("#stat-cats").textContent = String(cats);
    $("#stat-updated").textContent = updated || "-";
    $("#footer-updated").textContent = "数据抓取于 " + (updated || "-") + " · GitHub topic dsh-plugin";
  }

  /* ---------------- sidebar ---------------- */
  function renderSidebar() {
    const counts = {};
    state.data.forEach((r) => { counts[r.category] = (counts[r.category] || 0) + 1; });
    const list = $("#cat-list");
    const items = [
      { id: "all", zh: "全部插件", en: "All" },
      ...CAT_ORDER.map((c) => ({ id: c, zh: CATS[c].zh, en: CATS[c].en })),
    ].map((c) => {
      const n = c.id === "all" ? state.data.length : (counts[c.id] || 0);
      return `<li><button class="cat-link ${state.cat === c.id ? "active" : ""}" data-cat="${c.id}" type="button">
        <span><svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${CAT_ICONS[c.id] || CAT_ICONS.misc}</svg> ${c.zh}</span>
        <span class="cat-count">${n}</span>
      </button></li>`;
    }).join("");
    list.innerHTML = items;

    $$(".cat-link", list).forEach((btn) => {
      btn.addEventListener("click", () => {
        setCat(btn.dataset.cat);
      });
    });
  }

  /* ---------------- filtering / sorting ---------------- */
  function filtered() {
    let list = state.data;
    if (state.cat !== "all") list = list.filter((r) => r.category === state.cat);
    const q = state.search.trim().toLowerCase();
    if (q) {
      list = list.filter((r) =>
        (r.name + " " + r.owner + " " + r.full_name + " " + (r.description || "") + " " + (r.topics || []).join(" ") + " " + (CATS[r.category] ? CATS[r.category].zh : "")).toLowerCase().includes(q)
      );
    }
    const s = state.sort;
    if (s === "stars") list = list.slice().sort((a, b) => b.stars - a.stars);
    else if (s === "updated") list = list.slice().sort((a, b) => (b.updated || "").localeCompare(a.updated || ""));
    else if (s === "name") list = list.slice().sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
    else list = list.slice().sort((a, b) => (b.stars - a.stars) || (b.featured ? 1 : 0));
    return list;
  }

  /* ---------------- cards ---------------- */
  function cardHTML(r) {
    const cat = CATS[r.category] || CATS.misc;
    return `
      <button class="card" data-id="${esc(r.id)}" type="button" aria-label="查看 ${esc(r.name)} 详情">
        <span class="card-install">${copyIcon} 安装</span>
        <span class="card-top">
          <img class="avatar" src="${esc(r.avatar)}" alt="" width="40" height="40" loading="lazy">
          <span class="card-name-wrap">
            <span class="card-name">${esc(r.name)}</span>
            <span class="card-owner">${esc(r.owner)} / ${esc(r.name)}</span>
          </span>
        </span>
        <span class="card-desc">${esc(r.description || "暂无简介")}</span>
        <span class="card-foot">
          <span class="tag">${esc(cat.zh)}</span>
          <span class="stars" title="${fmtNumber(r.stars)} stars">${starIcon} ${fmtStars(r.stars)}</span>
          ${r.language ? `<span class="lang"><span class="lang-dot" style="background:${langColor(r.language)}"></span>${esc(r.language)}</span>` : ""}
          <span class="spacer"></span>
          <span class="time" title="最近更新 ${esc(r.updated || "")}">${timeAgo(r.updated)}</span>
        </span>
      </button>`;
  }

  function renderGrid() {
    const list = filtered();
    const page = list.slice(0, state.page * state.pageSize);
    const remaining = list.length - page.length;

    $("#result-count").textContent = fmtNumber(list.length);
    const rf = $("#result-filter");
    if (state.cat !== "all") {
      rf.hidden = false;
      rf.textContent = " · " + CATS[state.cat].zh;
    } else rf.hidden = true;

    gridEl.innerHTML = page.map(cardHTML).join("");
    $("#empty").hidden = list.length !== 0;
    $("#load-more-wrap").hidden = remaining <= 0;

    $$(".card", gridEl).forEach((c) => c.addEventListener("click", () => openModal(c.dataset.id)));

    // stagger reveal
    const cards = $$(".card", gridEl);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    cards.forEach((c, i) => {
      c.classList.add("reveal");
      setTimeout(() => c.classList.add("in"), Math.min(i % 12, 8) * 24);
    });
  }

  function renderFeatured() {
    const feats = state.data.filter((r) => r.featured).sort((a, b) => b.stars - a.stars);
    const el = $("#featured");
    if (!feats.length) { el.hidden = true; return; }
    el.hidden = false;
    $("#featured-row").innerHTML = feats.map((r, i) => {
      const cat = CATS[r.category] || CATS.misc;
      return `
        <button class="featured-card" data-id="${esc(r.id)}" type="button" aria-label="查看 ${esc(r.name)} 详情">
          <span class="fc-top">
            <span class="fc-rank">TOP ${i + 1}</span>
            <img class="avatar" src="${esc(r.avatar)}" alt="" width="34" height="34" loading="lazy">
            <h3>${esc(r.name)}</h3>
          </span>
          <span class="fc-desc">${esc(r.description || "")}</span>
          <span class="fc-meta">
            <span class="tag">${esc(cat.zh)}</span>
            <span class="stars">${starIcon} ${fmtStars(r.stars)}</span>
            <span>${esc(r.language || "")}</span>
          </span>
        </button>`;
    }).join("");
    $$(".featured-card", el).forEach((c) => c.addEventListener("click", () => openModal(c.dataset.id)));
  }

  /* ---------------- modal ---------------- */
  function openModal(id) {
    const r = state.data.find((x) => x.id === id);
    if (!r) return;
    const cat = CATS[r.category] || CATS.misc;
    const body = $("#modal-body");
    body.innerHTML = `
      <div class="modal-head">
        <img class="modal-avatar" src="${esc(r.avatar)}" alt="" width="56" height="56">
        <div>
          <h2 id="modal-title">${esc(r.name)}</h2>
          <p class="owner"><a href="https://github.com/${esc(r.owner)}" target="_blank" rel="noopener">@${esc(r.owner)}</a> · ${esc(r.full_name)}</p>
        </div>
        <span class="tag" style="margin-left:auto; margin-top:6px">${esc(cat.zh)}</span>
      </div>
      <p class="modal-desc">${esc(r.description || "暂无简介")}</p>

      <div class="modal-section">
        <p class="modal-label">安装</p>
        <div class="install-box">
          <pre class="install-cmd" id="install-cmd">${esc(r.install)}</pre>
          <button class="copy-btn" id="copy-btn" type="button">${copyIcon} 复制</button>
        </div>
      </div>

      <div class="modal-section">
        <dl class="modal-meta">
          <div class="meta-cell"><dt>Stars</dt><dd>${fmtNumber(r.stars)}</dd></div>
          <div class="meta-cell"><dt>Forks</dt><dd>${fmtNumber(r.forks)}</dd></div>
          <div class="meta-cell"><dt>语言</dt><dd>${esc(r.language || "无")}</dd></div>
          <div class="meta-cell"><dt>许可</dt><dd>${esc(r.license || "未声明")}</dd></div>
          <div class="meta-cell"><dt>创建</dt><dd>${esc(r.created || "-")}</dd></div>
          <div class="meta-cell"><dt>更新</dt><dd>${esc(r.updated || "-")}</dd></div>
          <div class="meta-cell"><dt>分类</dt><dd>${esc(cat.zh)}</dd></div>
          <div class="meta-cell"><dt>源码</dt><dd><a href="${esc(r.url)}" target="_blank" rel="noopener">GitHub</a></dd></div>
        </dl>
      </div>

      ${r.topics && r.topics.length ? `<div class="modal-section"><p class="modal-label">标签</p><div class="topic-row">${r.topics.map((t) => `<span class="topic">${esc(t)}</span>`).join("")}</div></div>` : ""}

      ${r.readme ? `<div class="modal-section"><p class="modal-label">README 摘要</p><pre class="readme-excerpt">${esc(r.readme)}…</pre></div>` : ""}

      <div class="modal-actions">
        <a class="btn btn-primary" href="${esc(r.url)}" target="_blank" rel="noopener">${extIcon} 在 GitHub 打开</a>
        ${r.homepage ? `<a class="btn btn-ghost" href="${esc(r.homepage)}" target="_blank" rel="noopener">${extIcon} 项目主页</a>` : ""}
      </div>
    `;

    const copyBtn = $("#copy-btn", body);
    copyBtn.addEventListener("click", () => copyInstall(r.install, copyBtn));

    $("#modal").hidden = false;
    $("#modal-backdrop").hidden = false;
    document.body.style.overflow = "hidden";
    history.replaceState(null, "", "#p=" + encodeURIComponent(id));
    $("#modal-close").focus();
  }

  function closeModal() {
    $("#modal").hidden = true;
    $("#modal-backdrop").hidden = true;
    document.body.style.overflow = "";
    if (history.state || location.hash.startsWith("#p=")) {
      const current = new URLSearchParams(location.hash.slice(1)).get("p");
      if (current) history.replaceState(null, "", "#all");
    }
  }

  async function copyInstall(text, btn) {
    const done = () => {
      btn.classList.add("copied");
      btn.innerHTML = checkIcon + " 已复制";
      setTimeout(() => { btn.classList.remove("copied"); btn.innerHTML = copyIcon + " 复制"; }, 1600);
      toast("已复制安装命令");
    };
    try {
      await navigator.clipboard.writeText(text);
      done();
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); done(); } catch (e2) { toast("复制失败，请手动选择复制"); }
      ta.remove();
    }
  }

  /* ---------------- toast ---------------- */
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.hidden = false;
    requestAnimationFrame(() => t.classList.add("show"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.classList.remove("show"); setTimeout(() => { t.hidden = true; }, 250); }, 1800);
  }

  /* ---------------- theme ---------------- */
  function initTheme() {
    let saved;
    try { saved = localStorage.getItem("dsh-store-theme"); } catch (e) {}
    const pref = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    state.theme = saved === "light" || saved === "dark" ? saved : pref;
    document.documentElement.dataset.theme = state.theme;
    $("#theme-toggle").addEventListener("click", () => {
      state.theme = state.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = state.theme;
      try { localStorage.setItem("dsh-store-theme", state.theme); } catch (e) {}
    });
  }

  /* ---------------- hash routing ---------------- */
  function readHash() {
    const h = location.hash.slice(1);
    const p = new URLSearchParams(h);
    const cat = p.get("cat");
    const search = p.get("search");
    const sort = p.get("sort");
    const plugin = p.get("p");
    if (cat && CATS[cat]) state.cat = cat;
    if (search !== null) state.search = search;
    if (sort && ["recommended", "stars", "updated", "name"].includes(sort)) state.sort = sort;
    syncSortUI();
    syncSearchUI();
    return plugin;
  }

  function setCat(id) {
    state.cat = CATS[id] ? id : "all";
    state.page = 1;
    history.replaceState(null, "", "#cat=" + state.cat);
    renderSidebar();
    renderGrid();
    if (id === "all" && state.search) { /* keep */ }
    $("#grid").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function syncSortUI() {
    $$('input[name="sort"]').forEach((el) => { el.checked = el.value === state.sort; });
    $("#sort-select").value = state.sort;
  }
  function syncSearchUI() {
    if (searchEl.value !== state.search) searchEl.value = state.search;
  }

  /* ---------------- events ---------------- */
  function bindEvents() {
    searchEl = $("#search");
    searchEl.addEventListener("input", () => {
      state.search = searchEl.value;
      state.page = 1;
      history.replaceState(null, "", state.search ? "#search=" + encodeURIComponent(state.search) : "#cat=" + state.cat);
      renderGrid();
    });

    $("#sort-select").addEventListener("change", (e) => { setSort(e.target.value); });
    $$('input[name="sort"]').forEach((el) => el.addEventListener("change", (e) => { if (e.target.checked) setSort(e.target.value); }));

    $("#load-more").addEventListener("click", () => { state.page += 1; renderGrid(); });
    $("#empty-reset").addEventListener("click", () => { state.search = ""; state.cat = "all"; state.page = 1; syncSearchUI(); renderGrid(); renderSidebar(); });

    $("#modal-close").addEventListener("click", closeModal);
    $("#modal-backdrop").addEventListener("click", closeModal);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !$("#modal").hidden) { closeModal(); return; }
      const tag = (e.target.tagName || "").toLowerCase();
      if (e.key === "/" && tag !== "input" && tag !== "textarea") { e.preventDefault(); searchEl.focus(); }
    });

    window.addEventListener("hashchange", () => {
      if (!$("#modal").hidden) return; // modal owns the hash via replaceState
      readHash();
      renderSidebar();
      renderGrid();
    });

    $$(".nav-links a").forEach((a) => a.addEventListener("click", (e) => {
      const target = a.getAttribute("href");
      if (target === "#featured") {
        e.preventDefault();
        $("#featured").scrollIntoView({ behavior: "smooth" });
        history.replaceState(null, "", "#featured");
      } else if (target === "#all" || target === "#cat=ui") {
        e.preventDefault();
        setCat(target === "#all" ? "all" : "ui");
      }
    }));
  }

  function setSort(v) {
    state.sort = v; state.page = 1;
    history.replaceState(null, "", "#cat=" + state.cat + "&sort=" + v);
    syncSortUI();
    renderGrid();
  }

  /* ---------------- boot ---------------- */
  function renderAll() {
    renderStats();
    renderSidebar();
    renderFeatured();
    renderGrid();
  }

  function boot() {
    gridEl = $("#grid");
    emptyEl = $("#empty");
    initTheme();
    bindEvents();
    const plugin = readHash();
    if (plugin) {
      loadData().then(() => {
        if (state.data.some((r) => r.id === plugin)) openModal(plugin);
      });
    } else {
      loadData();
    }
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
