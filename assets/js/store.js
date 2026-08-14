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

  /* ---------------- i18n ---------------- */
  const GITHUB_TOPIC_LINK = '<a href="https://github.com/topics/dsh-plugin" target="_blank" rel="noopener">GitHub <code>dsh-plugin</code></a>';
  const AWESOME_LINK = '<a href="https://github.com/awesome-dsh-plugin/awesome-dsh-plugin" target="_blank" rel="noopener">awesome-dsh-plugin</a>';
  const I18N = {
    zh: {
      "title": "DSH 插件商店 · DeepSeek Harness Plugin Store",
      "metaDesc": "从 GitHub 社区抓取的 DeepSeek Harness (DSH) 插件目录：按类别浏览、搜索，一键复制安装命令。",
      "brand.tag": "插件商店",
      "nav.all": "全部插件",
      "nav.cat": "分类浏览",
      "nav.featured": "精选",
      "nav.about": "关于",
      "skip.link": "跳到插件列表",
      "lang.toggle.aria": "切换到英文",
      "theme.toggle.aria": "切换深浅色主题",
      "github.aria": "GitHub dsh-plugin 主题",
      "hero.accent": "插件商店",
      "hero.sub1": "从 GitHub 社区抓取的",
      "hero.sub2": "个 DSH 插件：按类别浏览、搜索、一键复制安装命令。",
      "search.placeholder": "搜索插件，例如 vision、TUI、memory、workflow…",
      "search.aria": "搜索插件",
      "stat.plugins": "插件总数",
      "stat.stars": "社区 Stars",
      "stat.cats": "分类",
      "stat.updated": "数据更新",
      "trend.label": "数据趋势",
      "trend.aria": "插件总数与社区 Stars 走势图",
      "trend.plugins": "插件总数",
      "trend.stars": "社区 Stars",
      "sidebar.cats": "分类",
      "sidebar.sort": "排序",
      "sort.aria": "排序方式",
      "sort.recommended": "推荐",
      "sort.stars": "最多 Stars",
      "sort.updated": "最近更新",
      "sort.name": "名称 A-Z",
      "sidebar.note": `数据来自 ${GITHUB_TOPIC_LINK} 话题，由本页脚本抓取整理。安装插件即运行第三方代码，请先审阅源码。`,
      "featured.title": "精选插件",
      "featured.note": "按社区 Stars 排序",
      "result.unit": "个插件",
      "empty.title": "没有找到匹配的插件",
      "empty.desc": "换个关键词试试，或清空筛选条件浏览全部插件。",
      "empty.reset": "清空筛选",
      "load.more": "加载更多",
      "wink.title": "更多 Wink 工具",
      "wink.tokenbank.desc": "deepseek-harness 好管家：管理模型、skill 等，还可纳管 Claude / Cursor / Codex，闲置算力换积分",
      "wink.pings.desc": "第一手 AI 领域资讯，自定义频道精准推送个性化价值信息",
      "wink.desktop.name": "DeepSeek-Harness 桌面版",
      "wink.desktop.desc": "免部署，一键开启 deepseek-harness",
      "about.title": "关于这个商店",
      "about.source.title": "数据来源",
      "about.source.body": `目录来自 <a href="https://github.com/topics/dsh-plugin" target="_blank" rel="noopener">GitHub 话题 <code>dsh-plugin</code></a>：每小时用 GitHub Search API 抓取全部打上该话题的公开仓库，并整理出类别、简介与安装命令。`,
      "about.install.title": "安装方式",
      "about.install.body": "每个插件的详情页都带一条可直接执行的命令（<code>dsh plugin --profile web add …</code> 或 npm 包），复制到终端即可。没有 DeepSeek Harness？先 <code>npm install -g @deepseek-ai/dsh</code>。",
      "about.security.title": "安全提示",
      "about.security.body": "本商店只做索引与发现，不托管也不审查插件代码。安装第三方插件会运行其源码，请先阅读仓库、检查许可证，并在隔离环境中试用。",
      "about.eco.title": "加入生态",
      "about.eco.body": `你的插件也想被收录？给仓库打上 <code>dsh-plugin</code> 话题即可，下次抓取自动出现。也可以提交到社区精选列表 ${AWESOME_LINK}。`,
      "footer.note": "一个社区项目，与 DeepSeek 官方无隶属关系。数据抓取自 GitHub，内容版权归各仓库作者所有。",
      "footer.updated1": "数据抓取于",
      "footer.updated2": " · GitHub topic dsh-plugin",
      "noscript": "此页面需要启用 JavaScript 才能加载插件目录。数据文件见 <code>data/plugins.json</code>。",
      "modal.install": "安装",
      "modal.copy": "复制",
      "modal.copied": "已复制",
      "modal.lang": "语言",
      "modal.license": "许可",
      "modal.created": "创建",
      "modal.updated": "更新",
      "modal.category": "分类",
      "modal.source": "源码",
      "modal.tags": "标签",
      "modal.readme": "README 摘要",
      "modal.openGitHub": "在 GitHub 打开",
      "modal.homepage": "项目主页",
      "card.view": "查看 {name} 详情",
      "card.install": "安装",
      "card.noDesc": "暂无简介",
      "card.updatedTitle": "最近更新 {date}",
      "meta.none": "无",
      "meta.unspecified": "未声明",
      "toast.copied": "已复制安装命令",
      "toast.copyFailed": "复制失败，请手动选择复制",
      "ago.unknown": "未知",
      "ago.today": "今天",
      "ago.days": "{n} 天前",
      "ago.weeks": "{n} 周前",
      "ago.months": "{n} 个月前",
      "ago.years": "{n} 年前",
    },
    en: {
      "title": "DeepSeek Harness Plugin Store",
      "metaDesc": "A directory of DeepSeek Harness (DSH) plugins fetched from the GitHub community: browse by category, search, and install with one command.",
      "brand.tag": "Plugin Store",
      "nav.all": "All",
      "nav.cat": "Browse",
      "nav.featured": "Featured",
      "nav.about": "About",
      "skip.link": "Skip to plugin list",
      "lang.toggle.aria": "Switch to Chinese",
      "theme.toggle.aria": "Toggle light / dark theme",
      "github.aria": "GitHub dsh-plugin topic",
      "hero.accent": "Plugin Store",
      "hero.sub1": "Browse and search",
      "hero.sub2": "DSH plugins fetched from the GitHub community — organized by category, install with one command.",
      "search.placeholder": "Search plugins, e.g. vision, TUI, memory, workflow…",
      "search.aria": "Search plugins",
      "stat.plugins": "Plugins",
      "stat.stars": "Community Stars",
      "stat.cats": "Categories",
      "stat.updated": "Updated",
      "trend.label": "Trends",
      "trend.aria": "Plugin count and community stars over time",
      "trend.plugins": "Plugins",
      "trend.stars": "Community Stars",
      "sidebar.cats": "Categories",
      "sidebar.sort": "Sort",
      "sort.aria": "Sort by",
      "sort.recommended": "Recommended",
      "sort.stars": "Most stars",
      "sort.updated": "Recently updated",
      "sort.name": "Name A-Z",
      "sidebar.note": `Listings come from the ${GITHUB_TOPIC_LINK} topic, fetched by this page's script. Installing a plugin runs third-party code — review the source first.`,
      "featured.title": "Featured",
      "featured.note": "sorted by community stars",
      "result.unit": "plugins",
      "empty.title": "No matching plugins",
      "empty.desc": "Try another keyword, or clear the filters to browse all plugins.",
      "empty.reset": "Clear filters",
      "load.more": "Load more",
      "wink.title": "More Wink Tools",
      "wink.tokenbank.desc": "A butler for deepseek-harness: manage models, skills and more, onboard Claude / Cursor / Codex, and earn credits with idle compute",
      "wink.pings.desc": "First-hand AI news with custom channels that push personalized, high-value information",
      "wink.desktop.name": "DeepSeek-Harness Desktop",
      "wink.desktop.desc": "No setup — launch deepseek-harness in one click",
      "about.title": "About this store",
      "about.source.title": "Data source",
      "about.source.body": `Listings come from the <a href="https://github.com/topics/dsh-plugin" target="_blank" rel="noopener">GitHub topic <code>dsh-plugin</code></a>: every hour we fetch every public repo tagged with the topic through the GitHub Search API, then organize categories, summaries and install commands.`,
      "about.install.title": "Installation",
      "about.install.body": "Every plugin detail page has a ready-to-run command (<code>dsh plugin --profile web add …</code> or an npm package) — copy and paste it into your terminal. No DeepSeek Harness yet? Start with <code>npm install -g @deepseek-ai/dsh</code>.",
      "about.security.title": "Security note",
      "about.security.body": "This store only indexes and discovers plugins; it does not host or review their code. Installing a third-party plugin runs its source, so read the repo, check the license and try it in an isolated environment first.",
      "about.eco.title": "Join the ecosystem",
      "about.eco.body": `Want your plugin listed too? Tag your repo with the <code>dsh-plugin</code> topic and it will appear on the next fetch. You can also submit it to the community picks list ${AWESOME_LINK}.`,
      "footer.note": "A community project, not affiliated with DeepSeek. Data is fetched from GitHub; all content belongs to its original authors.",
      "footer.updated1": "Data fetched",
      "footer.updated2": " · GitHub topic dsh-plugin",
      "noscript": "This page needs JavaScript to load the plugin directory. Data lives in <code>data/plugins.json</code>.",
      "modal.install": "Install",
      "modal.copy": "Copy",
      "modal.copied": "Copied",
      "modal.lang": "Language",
      "modal.license": "License",
      "modal.created": "Created",
      "modal.updated": "Updated",
      "modal.category": "Category",
      "modal.source": "Source",
      "modal.tags": "Tags",
      "modal.readme": "README summary",
      "modal.openGitHub": "Open on GitHub",
      "modal.homepage": "Homepage",
      "card.view": "View {name} details",
      "card.install": "Install",
      "card.noDesc": "No description",
      "card.updatedTitle": "Updated {date}",
      "meta.none": "None",
      "meta.unspecified": "Unspecified",
      "toast.copied": "Install command copied",
      "toast.copyFailed": "Copy failed — select and copy manually",
      "ago.unknown": "Unknown",
      "ago.today": "today",
      "ago.days": "{n}d ago",
      "ago.weeks": "{n}w ago",
      "ago.months": "{n}mo ago",
      "ago.years": "{n}y ago",
    },
  };

  const t = (k) => (I18N[state.lang] && I18N[state.lang][k]) || I18N.zh[k] || k;
  const catName = (id) => { const c = CATS[id] || CATS.misc; return state.lang === "zh" ? c.zh : c.en; };
  const tFmt = (k, vars) => { let s = t(k); Object.keys(vars || {}).forEach((kk) => { s = s.replace("{" + kk + "}", vars[kk]); }); return s; };

  function initLang() {
    const nav = (navigator.language || navigator.languages?.[0] || "zh").toLowerCase();
    const browserLang = nav.startsWith("zh") ? "zh" : "en";
    let saved, manual;
    try {
      saved = localStorage.getItem("dsh-store-lang");
      manual = localStorage.getItem("dsh-store-lang-manual");
    } catch (e) {}
    // Browser language wins unless the user explicitly toggled the language.
    state.lang = manual === "1" && (saved === "zh" || saved === "en") ? saved : browserLang;
    applyLang();
    $("#lang-toggle").addEventListener("click", () => {
      state.lang = state.lang === "zh" ? "en" : "zh";
      try {
        localStorage.setItem("dsh-store-lang", state.lang);
        localStorage.setItem("dsh-store-lang-manual", "1");
      } catch (e) {}
      applyLang();
    });
  }

  function applyLang() {
    const d = I18N[state.lang];
    document.documentElement.lang = state.lang === "zh" ? "zh-CN" : "en";
    document.title = d.title || document.title;
    const md = document.querySelector('meta[name="description"]');
    if (md && d.metaDesc) md.setAttribute("content", d.metaDesc);
    $$("[data-i18n]").forEach((el) => { el.textContent = d[el.dataset.i18n] || ""; });
    $$("[data-i18n-html]").forEach((el) => { el.innerHTML = d[el.dataset.i18nHtml] || ""; });
    $$("[data-i18n-ph]").forEach((el) => { el.setAttribute("placeholder", d[el.dataset.i18nPh] || ""); });
    $$("[data-i18n-aria]").forEach((el) => { el.setAttribute("aria-label", d[el.dataset.i18nAria] || ""); });
    const langBtn = $("#lang-toggle");
    if (langBtn) { langBtn.textContent = state.lang === "zh" ? "EN" : "中"; }
    renderStats();
    renderSidebar();
    renderFeatured();
    renderGrid();
    renderTrend();
  }

  const state = {
    data: [],
    cat: "all",
    sort: "recommended",
    search: "",
    page: 1,
    pageSize: 24,
    theme: "dark",
    lang: "zh",
  };

  let featuredEl, gridEl, emptyEl, searchEl;

  /* ---------------- utils ---------------- */
  const fmtStars = (n) => (n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : String(n));
  const fmtNumber = (n) => n.toLocaleString("en-US");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const timeAgo = (iso) => {
    const then = new Date(iso + "T00:00:00Z").getTime();
    if (Number.isNaN(then)) return iso || t("ago.unknown");
    const days = Math.floor((Date.now() - then) / 86400000);
    if (days < 1) return t("ago.today");
    if (days < 7) return tFmt("ago.days", { n: days });
    if (days < 31) return tFmt("ago.weeks", { n: Math.floor(days / 7) });
    if (days < 365) return tFmt("ago.months", { n: Math.floor(days / 30) });
    return tFmt("ago.years", { n: Math.floor(days / 365) });
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
    $("#footer-updated").textContent = updated || "-";
  }

  /* ---------------- trend chart ---------------- */
  let trendData = [];
  let trendTimer = 0;

  async function loadTrend() {
    const el = $("#trend-chart");
    if (!el) return;
    try {
      const res = await fetch("data/stats_history.json", { cache: "no-store" });
      if (!res.ok) return;
      trendData = await res.json();
    } catch (e) { return; }
    if (!Array.isArray(trendData) || trendData.length < 2) return;
    renderTrend();
  }

  function trendColors() {
    const css = getComputedStyle(document.documentElement);
    const v = (n) => css.getPropertyValue(n).trim() || "";
    return {
      accent: v("--accent") || "#4d6bfe",
      line2: v("--text-1") || "#eef1f6",
      grid: v("--text-3") || "#6c7482",
      tipBg: v("--bg-3") || "#181b24",
      tipText: v("--text-1") || "#eef1f6",
      tipSub: v("--text-2") || "#a2a9b6",
    };
  }

  function fmtAxis(v, max) {
    if (max >= 100000) return (v / 1000).toFixed(0) + "k";
    if (max >= 10000) return (v / 1000).toFixed(1).replace(/\.0$/, "") + "k";
    return fmtNumber(Math.round(v));
  }

  function renderTrend() {
    const wrap = $("#trend-chart");
    if (!wrap || trendData.length < 2) return;
    const c = trendColors();
    const W = Math.max(320, wrap.clientWidth || 800);
    const H = 260;
    const pad = { l: 44, r: 44, t: 12, b: 30 };
    const iw = W - pad.l - pad.r;
    const ih = H - pad.t - pad.b;
    const pts = trendData;
    const n = pts.length;
    const maxP = Math.max(...pts.map((p) => p.plugins));
    const maxS = Math.max(...pts.map((p) => p.stars));
    const X = (i) => pad.l + (i / (n - 1)) * iw;
    const YP = (v) => pad.t + ih - (v / maxP) * ih;
    const YS = (v) => pad.t + ih - (v / maxS) * ih;
    const lineP = pts.map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${YP(p.plugins).toFixed(1)}`).join(" ");
    const lineS = pts.map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${YS(p.stars).toFixed(1)}`).join(" ");
    const areaP = `M${pad.l},${pad.t + ih} L${pad.l},${YP(pts[0].plugins).toFixed(1)} ` +
      pts.slice(1).map((p, i) => `L${X(i + 1).toFixed(1)},${YP(p.plugins).toFixed(1)}`).join(" ") +
      ` L${pad.l + iw},${pad.t + ih} Z`;

    let grid = "";
    for (let k = 0; k <= 4; k++) {
      const y = pad.t + ih - (k / 4) * ih;
      grid += `<line x1="${pad.l}" y1="${y.toFixed(1)}" x2="${pad.l + iw}" y2="${y.toFixed(1)}" stroke="${c.grid}" stroke-opacity="0.35" stroke-width="1"/>`;
      grid += `<text x="${pad.l - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="10.5" fill="${c.axis}">${fmtAxis((maxP * k) / 4, maxP)}</text>`;
      grid += `<text x="${pad.l + iw + 8}" y="${(y + 4).toFixed(1)}" text-anchor="start" font-size="10.5" fill="${c.axis}">${fmtAxis((maxS * k) / 4, maxS)}</text>`;
    }

    const sameYear = pts[0].date.slice(0, 4) === pts[n - 1].date.slice(0, 4);
    const fmtX = (d) => (sameYear ? d.slice(5) : d.slice(0, 7));
    let xLabels = "";
    [0, Math.floor((n - 1) / 2), n - 1].forEach((i) => {
      xLabels += `<text x="${X(i).toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="10.5" fill="${c.grid}">${fmtX(pts[i].date)}</text>`;
    });

    wrap.innerHTML =
      `<svg viewBox="0 0 ${W} ${H}" role="presentation" aria-hidden="true">
        <defs>
          <linearGradient id="tgArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${c.accent}" stop-opacity="0.22"/>
            <stop offset="100%" stop-color="${c.accent}" stop-opacity="0.02"/>
          </linearGradient>
        </defs>
        ${grid}
        <line x1="${pad.l}" y1="${pad.t + ih}" x2="${pad.l + iw}" y2="${pad.t + ih}" stroke="${c.grid}" stroke-opacity="0.6" stroke-width="1"/>
        ${xLabels}
        <path d="${areaP}" fill="url(#tgArea)"/>
        <path d="${lineS}" fill="none" stroke="${c.line2}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" stroke-opacity="0.85"/>
        <path d="${lineP}" fill="none" stroke="${c.accent}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
        <line id="trend-cursor" x1="0" y1="${pad.t}" x2="0" y2="${pad.t + ih}" stroke="${c.grid}" stroke-opacity="0" stroke-width="1"/>
        <circle id="trend-dotP" r="3.5" fill="${c.accent}" stroke="${c.tipBg}" stroke-width="1.5" opacity="0"/>
        <circle id="trend-dotS" r="3.5" fill="${c.line2}" stroke="${c.tipBg}" stroke-width="1.5" opacity="0"/>
      </svg>
      <div class="trend-tip" id="trend-tip" hidden></div>`;

    const svg = wrap.querySelector("svg");
    const tip = $("#trend-tip", wrap);
    const cursor = $("#trend-cursor", wrap);
    const dotP = $("#trend-dotP", wrap);
    const dotS = $("#trend-dotS", wrap);
    const move = (ev) => {
      const rect = svg.getBoundingClientRect();
      const scale = rect.width / W;
      const mx = (ev.clientX - rect.left) / scale;
      const ratio = Math.max(0, Math.min(1, (mx - pad.l) / iw));
      const i = Math.round(ratio * (n - 1));
      const cx = X(i);
      cursor.setAttribute("x1", cx); cursor.setAttribute("x2", cx);
      cursor.setAttribute("stroke-opacity", 0.5);
      dotP.setAttribute("cx", cx); dotP.setAttribute("cy", YP(pts[i].plugins).toFixed(1)); dotP.setAttribute("opacity", 1);
      dotS.setAttribute("cx", cx); dotS.setAttribute("cy", YS(pts[i].stars).toFixed(1)); dotS.setAttribute("opacity", 1);
      tip.hidden = false;
      tip.style.left = Math.min(Math.max(cx - 70, 0), rect.width - 150) + "px";
      tip.style.top = "10px";
      tip.innerHTML =
        `<div class="tip-date">${pts[i].date}</div>` +
        `<div class="tip-row"><i class="tip-dot tip-plugins"></i>${t("trend.plugins")} ${fmtNumber(pts[i].plugins)}</div>` +
        `<div class="tip-row"><i class="tip-dot tip-stars"></i>Stars ${fmtNumber(pts[i].stars)}</div>`;
    };
    svg.addEventListener("mousemove", move);
    svg.addEventListener("mouseleave", () => {
      cursor.setAttribute("stroke-opacity", 0);
      dotP.setAttribute("opacity", 0);
      dotS.setAttribute("opacity", 0);
      tip.hidden = true;
    });
  }

  /* ---------------- sidebar ---------------- */
  function renderSidebar() {
    const counts = {};
    state.data.forEach((r) => { counts[r.category] = (counts[r.category] || 0) + 1; });
    const list = $("#cat-list");
    const items = [
      { id: "all" },
      ...CAT_ORDER.map((c) => ({ id: c })),
    ].map((c) => {
      const n = c.id === "all" ? state.data.length : (counts[c.id] || 0);
      return `<li><button class="cat-link ${state.cat === c.id ? "active" : ""}" data-cat="${c.id}" type="button">
        <span><svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${CAT_ICONS[c.id] || CAT_ICONS.misc}</svg> ${catName(c.id)}</span>
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
        (r.name + " " + r.owner + " " + r.full_name + " " + (r.description || "") + " " + (r.topics || []).join(" ") + " " + catName(r.category) + " " + CATS[r.category].zh + " " + CATS[r.category].en).toLowerCase().includes(q)
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
      <button class="card" data-id="${esc(r.id)}" type="button" aria-label="${tFmt("card.view", { name: esc(r.name) })}">
        <span class="card-install">${copyIcon} ${t("card.install")}</span>
        <span class="card-top">
          <img class="avatar" src="${esc(r.avatar)}" alt="" width="40" height="40" loading="lazy">
          <span class="card-name-wrap">
            <span class="card-name">${esc(r.name)}</span>
            <span class="card-owner">${esc(r.owner)} / ${esc(r.name)}</span>
          </span>
        </span>
        <span class="card-desc">${esc(r.description || t("card.noDesc"))}</span>
        <span class="card-foot">
          <span class="tag">${esc(catName(r.category))}</span>
          <span class="stars" title="${fmtNumber(r.stars)} stars">${starIcon} ${fmtStars(r.stars)}</span>
          ${r.language ? `<span class="lang"><span class="lang-dot" style="background:${langColor(r.language)}"></span>${esc(r.language)}</span>` : ""}
          <span class="spacer"></span>
          <span class="time" title="${tFmt("card.updatedTitle", { date: esc(r.updated || "") })}">${timeAgo(r.updated)}</span>
        </span>
      </button>`;
  }

  function renderGrid() {
    syncFeatured();
    const list = filtered();
    const page = list.slice(0, state.page * state.pageSize);
    const remaining = list.length - page.length;

    $("#result-count").textContent = fmtNumber(list.length);
    const rf = $("#result-filter");
    if (state.cat !== "all") {
      rf.hidden = false;
      rf.textContent = " · " + catName(state.cat);
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

  function syncFeatured() {
    const el = $("#featured");
    if (!el) return;
    if (state.search.trim()) { el.hidden = true; return; } // hide while searching
    const has = state.data.some((r) => r.featured);
    el.hidden = !has;
  }

  function renderFeatured() {
    const feats = state.data.filter((r) => r.featured).sort((a, b) => b.stars - a.stars);
    const el = $("#featured");
    if (!feats.length) { el.hidden = true; return; }
    el.hidden = false;
    $("#featured-row").innerHTML = feats.map((r, i) => {
      const cat = CATS[r.category] || CATS.misc;
      return `
        <button class="featured-card" data-id="${esc(r.id)}" type="button" aria-label="${tFmt("card.view", { name: esc(r.name) })}">
          <span class="fc-top">
            <span class="fc-rank">TOP ${i + 1}</span>
            <img class="avatar" src="${esc(r.avatar)}" alt="" width="34" height="34" loading="lazy">
            <h3>${esc(r.name)}</h3>
          </span>
          <span class="fc-desc">${esc(r.description || "")}</span>
          <span class="fc-meta">
            <span class="tag">${esc(catName(r.category))}</span>
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
        <span class="tag" style="margin-left:auto; margin-top:6px">${esc(catName(r.category))}</span>
      </div>
      <p class="modal-desc">${esc(r.description || t("card.noDesc"))}</p>

      <div class="modal-section">
        <p class="modal-label">${t("modal.install")}</p>
        <div class="install-box">
          <pre class="install-cmd" id="install-cmd">${esc(r.install)}</pre>
          <button class="copy-btn" id="copy-btn" type="button">${copyIcon} ${t("modal.copy")}</button>
        </div>
      </div>

      <div class="modal-section">
        <dl class="modal-meta">
          <div class="meta-cell"><dt>Stars</dt><dd>${fmtNumber(r.stars)}</dd></div>
          <div class="meta-cell"><dt>Forks</dt><dd>${fmtNumber(r.forks)}</dd></div>
          <div class="meta-cell"><dt>${t("modal.lang")}</dt><dd>${esc(r.language || t("meta.none"))}</dd></div>
          <div class="meta-cell"><dt>${t("modal.license")}</dt><dd>${esc(r.license || t("meta.unspecified"))}</dd></div>
          <div class="meta-cell"><dt>${t("modal.created")}</dt><dd>${esc(r.created || "-")}</dd></div>
          <div class="meta-cell"><dt>${t("modal.updated")}</dt><dd>${esc(r.updated || "-")}</dd></div>
          <div class="meta-cell"><dt>${t("modal.category")}</dt><dd>${esc(catName(r.category))}</dd></div>
          <div class="meta-cell"><dt>${t("modal.source")}</dt><dd><a href="${esc(r.url)}" target="_blank" rel="noopener">GitHub</a></dd></div>
        </dl>
      </div>

      ${r.topics && r.topics.length ? `<div class="modal-section"><p class="modal-label">${t("modal.tags")}</p><div class="topic-row">${r.topics.map((x) => `<span class="topic">${esc(x)}</span>`).join("")}</div></div>` : ""}

      ${r.readme ? `<div class="modal-section"><p class="modal-label">${t("modal.readme")}</p><pre class="readme-excerpt">${esc(r.readme)}…</pre></div>` : ""}

      <div class="modal-actions">
        <a class="btn btn-primary" href="${esc(r.url)}" target="_blank" rel="noopener">${extIcon} ${t("modal.openGitHub")}</a>
        ${r.homepage ? `<a class="btn btn-ghost" href="${esc(r.homepage)}" target="_blank" rel="noopener">${extIcon} ${t("modal.homepage")}</a>` : ""}
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
      btn.innerHTML = checkIcon + " " + t("modal.copied");
      setTimeout(() => { btn.classList.remove("copied"); btn.innerHTML = copyIcon + " " + t("modal.copy"); }, 1600);
      toast(t("toast.copied"));
    };
    try {
      await navigator.clipboard.writeText(text);
      done();
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); done(); } catch (e2) { toast(t("toast.copyFailed")); }
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
      renderTrend();
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
    initLang();
    bindEvents();
    window.addEventListener("resize", () => {
      clearTimeout(trendTimer);
      trendTimer = setTimeout(renderTrend, 160);
    });
    loadTrend();
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
