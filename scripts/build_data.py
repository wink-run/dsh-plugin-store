#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Build data/plugins.json for the DSH plugin store.

Sources:
  - GitHub search API for the `dsh-plugin` topic. The topic can exceed the
    API's 1000-results-per-query cap, so the fetch splits the created-date
    range recursively until every bucket fits, then merges and dedupes.
  - The curated awesome-dsh-plugin list for its category taxonomy and
    high-quality one-line descriptions.
  - Per-plugin install commands curated from each README.

Output: data/plugins.json  (flat array of plugin records)
"""
import datetime, json, os, re, sys, time, urllib.error, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# --------------------------------------------------------------------------
# 1. Load raw repos.
#    Local dev: reuse the cached copy when present (fast, offline-friendly).
#    CI (GitHub Actions) / fresh machine: fetch every `dsh-plugin` topic repo
#    from the GitHub search API. GITHUB_TOKEN raises the rate limits and is
#    auto-provided by Actions.
# --------------------------------------------------------------------------
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
REPO_CACHE = os.environ.get("REPO_CACHE", "/tmp/dsh_all_repos.json")
README_DIR = os.environ.get("README_DIR", "/tmp/dsh_readmes")

def _gh_request(url):
    req = urllib.request.Request(url, headers={
        "Accept": "application/vnd.github+json",
        "User-Agent": "dsh-plugin-store-updater",
    })
    if GITHUB_TOKEN:
        req.add_header("Authorization", "Bearer " + GITHUB_TOKEN)
    return req

def _cache_path(p):
    d = os.path.dirname(p)
    if d and not os.path.isdir(d):
        os.makedirs(d, exist_ok=True)
    return p

def _search_repos(query, page=1):
    """One search API call. Throttles to stay under the per-minute search
    rate limit (30/min with a token, 10/min without) and backs off on 429."""
    q = urllib.parse.quote(query)
    url = ("https://api.github.com/search/repositories?q=" + q +
           "&sort=stars&order=desc&per_page=100&page=" + str(page))
    delay = 2.0 if GITHUB_TOKEN else 6.0
    time.sleep(delay)
    backoff = 5
    for attempt in range(6):
        try:
            with urllib.request.urlopen(_gh_request(url), timeout=30) as resp:
                return json.load(resp)
        except urllib.error.HTTPError as e:
            if e.code in (403, 429):
                print(f"  rate limited ({e.code}), backing off {backoff}s")
                time.sleep(backoff)
                backoff = min(60, backoff * 2)
                continue
            body = e.read().decode("utf-8", "replace")[:400]
            sys.exit(f"GitHub search API error {e.code}: {body}")
        except Exception as e:
            sys.exit(f"GitHub search API request failed: {e}")
    sys.exit("GitHub search API: still rate limited after retries")

def _collect_range(start, end, items, seen):
    """Fetch every dsh-plugin repo created within [start..end] (ISO dates).

    GitHub caps search results at 1000 per query (paging past it returns
    422), so when a bucket reports more than 1000 results the date range is
    split in half and each half is collected recursively. Buckets at or
    under the cap are paged normally. Dedupes into items/seen."""
    q = f"topic:dsh-plugin created:{start}..{end}"
    data = _search_repos(q, 1)
    total = data.get("total_count", 0)
    batch = data.get("items", [])
    if total > 1000 and start != end:
        s = datetime.date.fromisoformat(start)
        e = datetime.date.fromisoformat(end)
        mid = s + (e - s) // 2
        print(f"  {total} repos in {start}..{end} -> split at {mid}")
        _collect_range(start, mid.isoformat(), items, seen)
        _collect_range((mid + datetime.timedelta(days=1)).isoformat(), end, items, seen)
        return
    for r in batch:
        fn = r["full_name"]
        if fn not in seen:
            seen.add(fn)
            items.append(r)
    print(f"  {start}..{end}: page 1 +{len(batch)} ({total} total)")
    page = 2
    while len(batch) == 100 and page <= 10:
        data = _search_repos(q, page)
        batch = data.get("items", [])
        for r in batch:
            fn = r["full_name"]
            if fn not in seen:
                seen.add(fn)
                items.append(r)
        print(f"  {start}..{end}: page {page} +{len(batch)}")
        page += 1

def fetch_repos():
    """Return every dsh-plugin topic repo (list of dicts), fetching from the
    GitHub search API when no local cache exists. The created-date range is
    split recursively (see _collect_range) so more than 1000 repos can be
    collected without tripping GitHub's per-query result cap."""
    if os.path.exists(REPO_CACHE):
        print("repos: using local cache", REPO_CACHE)
        return json.load(open(REPO_CACHE))
    items, seen = [], set()
    today = datetime.date.today()
    print(f"repos: fetching topic:dsh-plugin (created 2008-01-01..{today})")
    _collect_range("2008-01-01", today.isoformat(), items, seen)
    if not items:
        sys.exit("GitHub search API returned no repos")
    json.dump(items, open(_cache_path(REPO_CACHE), "w"))
    print(f"repos: fetched {len(items)} (unique) from GitHub search API")
    return items

repos = fetch_repos()

# --------------------------------------------------------------------------
# 2. Category taxonomy + priority-ordered classification rules.
#    id -> {label_zh, label_en, blurb, rules[]}
#    rules are regexes matched against "name full_name description topics".
#    The FIRST category whose rules match (in CAT_ORDER) wins.
# --------------------------------------------------------------------------
CATS = {
    "ui": {
        "label_zh": "界面与交互", "label_en": "UI & Interface",
        "blurb": "Web UI 增强、侧边栏、TUI、渲染卡片与状态面板",
        "rules": [
            r"(?i)\b(tui|tianshu-tui|web-ui|webui|better-sidebar|side-panel|sidebar|turtle-ui)\b",
            r"(?i)\b(genui|visualize|openpencil|focus-chat|turn-navigator|milestone|navbar)\b",
            r"(?i)\b(status-rotator|status-label|task-status|web-archive|drag-and-drop|deeplink|diff-viewer)\b",
            r"(?i)\b(sticky-disclosure|palette|spotlight|annotation|101|mobile-nav|chat-width|widget-dock)\b",
            r"(?i)\b(local-filetree|daily-progress|huadongbianzuqi|fun-weather|reasoning|code-ide|report-html)\b",
            r"(?i)\b(usage-dashboard|api-usage|balance|cost-chip|tps|context-vista|ui-whale)\b",
        ],
    },
    "agent": {
        "label_zh": "智能体与自动化", "label_en": "Agents & Automation",
        "blurb": "多智能体、工作流编排、定时与循环自动化",
        "rules": [
            r"(?i)\b(agent-teams|agentteam|workflow|dsh-work|dsh_workflow|automation|routines|plannotator)\b",
            r"(?i)\b(loop|sentinel|deep-?research|goal-mode|recommend|advisor|specflow|track|mstar-harness)\b",
            r"(?i)\b(postmortem|planner|multi-agent|orchestrat|scheduled|clawrouter|subagent|evolve)\b",
            r"(?i)\b(yet-another-subagent|revive|re-framework|web-review|messaging|compaction-instant)\b",
        ],
    },
    "vision": {
        "label_zh": "视觉理解", "label_en": "Vision",
        "blurb": "图像理解、OCR、UI 还原与计算机视觉工具箱",
        "rules": [
            r"(?i)\b(vision|modlens|deepeye|paddle-ocr|image-vision|eyes-|her-eyes|mac-vision|vision-router)\b",
            r"(?i)\b(ocr|screenshot|computer-use|grounding|pixel-diff|read_image|grassvision|aigc-canvas)\b",
            r"(?i)\b(ernie-image|multi-screen-wireframe|revers|wireframe|openflowframes)\b",
        ],
    },
    "tools": {
        "label_zh": "工具集", "label_en": "Tools",
        "blurb": "确定性工具、数据接入、终端与文件操作",
        "rules": [
            r"(?i)\b(toolkit|dsh-tool-|custom-tool|tool-search|tool-approval|tool-policy|director-toolkit)\b",
            r"(?i)\b(data-agent|docker|tmuxctl|bash-encoding|bash-terminal|voice|calculator|csv|regex|markdown)\b",
            r"(?i)\b(subagent-tools|subagent-cwd|skillport|cowork|code-intel|openmaic|scholar|excel-vera|playwright)\b",
            r"(?i)\b(interpreter|openapi|promotion-toolkit|ramify|convert|sleep|artifact|notebooks|plaindeck)\b",
            r"(?i)\b(miliastra-toolbox|notes|zotero|book2skill|mygo|pack-agent)\b",
        ],
    },
    "search": {
        "label_zh": "搜索与数据", "label_en": "Search & Data",
        "blurb": "联网搜索、浏览器、论文阅读、金融与科研数据",
        "rules": [
            r"(?i)\b(modsearch|search|argo|crawl|scrape|wiki|scholar|paper|arxiv|read_page|reader)\b",
            r"(?i)\b(stock-market|finance|database|sql|stata|browser|llm-wiki|zotero|deep_option)\b",
            r"(?i)\b(jacobian|openbiliclaw|bilibili|content discovery)\b",
        ],
    },
    "memory": {
        "label_zh": "记忆与会话", "label_en": "Memory & Sessions",
        "blurb": "会话管理、记忆系统、消息编辑与导入导出",
        "rules": [
            r"(?i)\b(memory|mnemon|recall|rewind|distill|sidechain|crosstalk|interconnect)\b",
            r"(?i)\b(message-edit|chat-import|conversation|share|undo|safe-delete|prompt-studio|input-history)\b",
            r"(?i)\b(session-(timeline|notification|health|persistence)|record|replay|history|explain|cue-plugin)\b",
        ],
    },
    "integration": {
        "label_zh": "集成与通知", "label_en": "Integration & Notify",
        "blurb": "VS Code、IM、通知与外部服务桥接",
        "rules": [
            r"(?i)\b(open-in-vscode|vscode|vs-code|telegram|wechat|wecom|lark|notification|notify|mcp|acp)\b",
            r"(?i)\b(bridge|bitfun|chatnode|webhook|slack|discord|huggingface|longbridge|openai|oauth)\b",
            r"(?i)\b(codex|qqbot|im-bridge|cc-connect|win-notify|claude-move|interconnect)\b",
        ],
    },
    "dev": {
        "label_zh": "开发与运行时", "label_en": "Dev & Runtime",
        "blurb": "插件开发、安全审计、Git、沙箱与监控",
        "rules": [
            r"(?i)\b(plugin-check|plugin-dev|plugin-manager|plugin-skills|plugin-template|plugin-registry|plugin-graph)\b",
            r"(?i)\b(security|audit|git-identity|gitflow|guardian|context-doctor|harness-ops|ops|doctor)\b",
            r"(?i)\b(sandbox|fabric|trace|telemetry|metrics|health|eval|profiler|flameox|leantoken|internalcot)\b",
            r"(?i)\b(polyglot|llm-fallbacks|fallback|approval|cost-meter|cost-tracker|token-usage|dump|inspect)\b",
            r"(?i)\b(prompt-profile|revdiff|goalfydata|openguardrails|verify|dedup|blame|code-check|bisect)\b",
            r"(?i)\b(anchorlaw|amber-protocol|context-taxonomy|event-auditor|effort-config|eco-router|model-config)\b",
            r"(?i)\b(sdk|ai-sdk|typescript-sdk|provider|graphlint|compaction|cost\b|dash)\b",
        ],
    },
    "skill": {
        "label_zh": "技能与提示词", "label_en": "Skills & Prompts",
        "blurb": "Agent Skill 库、提示词模板与人物设定",
        "rules": [
            r"(?i)\b(colleague-skill|harmony-next)\b",
            r"(?i)\b(skillport|agent-skills|plugin-skills|super-injector|ergonomics)\b",
            r"(?i)\b(prompt-persona|learn-everything|humanize)\b",
        ],
    },
    "desktop": {
        "label_zh": "桌面与启动", "label_en": "Desktop & Launcher",
        "blurb": "桌面客户端、系统托盘与一键启动器",
        "rules": [
            r"(?i)\b(desktop|launcher|deeptide|tray|electron|webview)\b",
            r"(?i)(desktop app|desktop client|system tray|常驻桌面|fnos)",
        ],
    },
    "fun": {
        "label_zh": "趣味与主题", "label_en": "Fun & Themes",
        "blurb": "桌面宠物、小游戏、恶搞与二次元皮肤",
        "rules": [
            r"(?i)\b(whale-girl|deep-whale|whale-maid|blue-whale|pet|mascot|fortune|d399|minigames|gomoku)\b",
            r"(?i)\b(auto-chess|stock-market|emoji|stickers|ads|manners|joke|background|meme|group-photo)\b",
            r"(?i)\b(douyin|short-video|jingle|spur|sound-effects|fun-typewriter|agent-arcade|play)\b",
            r"(?i)\b(qq2006|xiaoyao|skins|skin|deepcel|xiaohei|deepseek-harness-skin|maid)\b",
        ],
    },
    "platform": {
        "label_zh": "发行与平台", "label_en": "Platforms & Distros",
        "blurb": "社区发行版、Agent OS 与兼容运行时",
        "rules": [
            r"(?i)\b(oh-dsh|oh-my-dsh|mobius|sandbase|open-managed-agents|helloagents|iPoll|orbis)\b",
            r"(?i)\b(openbiliclaw|claw|axern|phi|multica-runtime|distribution|distro|dash)\b",
            r"(?i)(agent (os|runtime)|cma-compatible|drop-in compatible|one-command start|self-evolving agent)",
        ],
    },
    "docs": {
        "label_zh": "文档与索引", "label_en": "Docs & Indexes",
        "blurb": "官方手册、精选列表与生态索引",
        "rules": [
            r"(?i)\b(awesome-|handbook|radar|curated|directory|index|catalog|dsh-handbook)\b",
            r"(?i)\b(hello-dsh|find-plugins|find-plugin|marketplace|from-scratch|plugin-dev|tutorial)\b",
        ],
    },
}

# category order = priority order for rule matching (first match wins)
CAT_ORDER = ["desktop", "platform", "docs", "fun", "skill", "ui", "vision",
             "search", "tools", "memory", "agent", "integration", "dev"]
CAT_IDS = {c["label_en"]: cid for cid, c in CATS.items()}

# Map the awesome-list section names to our category ids.
AWESOME_CATMAP = {
    "UI Enhancements": "ui",
    "Sessions & Messages": "memory",
    "Tools & Capabilities": "tools",
    "Workflow & Automation": "agent",
    "Notifications & Integrations": "integration",
    "Development & Runtime": "dev",
    "Just for Fun": "fun",
}

# --------------------------------------------------------------------------
# 3. Curated mapping from the awesome-dsh-plugin list (category -> repo names)
# --------------------------------------------------------------------------
AWESOME = {
    "UI Enhancements": [
        "huiliyi37/dsh-tianshu-tui", "openma-ai/deepseek-harness-tui", "omdsh-dev/dsh-at-file",
        "alingalingling/ui-status-label", "ZSeven-W/dsh-openpencil", "Nagi-ovo/dsh-visualize",
        "ccq1/dsh-side-panel", "dingyi222666/dsh-focus-chat", "omdsh-dev/dsh-genui",
        "omdsh-dev/dsh-annotation", "vlln/dsh-navbar", "vlln/dsh-task-status",
        "renat3u/dsh-web-archive", "0xsline/dsh-spotlight", "bill9109/dsh-101",
        "bill9109/dsh-drag-and-drop", "qyw233/dsh-deeplink", "lehhair/dsh-diff-viewer",
        "omdsh-dev/ex-setting", "omdsh-dev/web-components", "vibeinging/dsh-turn-navigator",
        "SnowCrescenter-tech/dsh-milestone", "Ghost011118/dsh-balance-meter",
        "Sev7een/ds-api-usage", "ccch1mneyyy/dsh-TUI", "omdsh-dev/DSH-better-sidebar",
        "Han-1413141/dsh-sticky-disclosure",
    ],
    "Sessions & Messages": [
        "Anionex/dsh-turn-rewind", "Jesse-njx/dsh-crosstalk", "LoserFox/distill",
        "hellodigua/dsh-share", "Moeblack/dsh-message-edit", "omdsh-dev/dsh-mnemon",
        "nowledge-co/nowledge-mem-deepseek-harness", "Jesse-njx/dsh-memory",
        "Buyi-wsgzg/dsh-sidechain", "bill9109/dsh-conversation-share", "yuezengwu/dsh-explain",
        "Moeblack/dsh-prompt-studio", "Nwflower/dsh-chat-import", "Chinesezjc/dsh-interconnect",
    ],
    "Tools & Capabilities": [
        "MAXeaglet/dsh-bash-terminal", "Anionex/dsh-vision-toolkit", "omdsh-dev/dsh-custom-tool",
        "Anionex/dsh-computer-use", "omdsh-dev/dsh-data-agent", "omdsh-dev/dsh-toolkit",
        "omdsh-dev/dsh-tool-csv", "omdsh-dev/dsh-tool-calculator", "omdsh-dev/dsh-tool-diff",
        "omdsh-dev/dsh-tool-encoding", "omdsh-dev/dsh-tool-json", "omdsh-dev/dsh-tool-markdown",
        "omdsh-dev/dsh-tool-regex", "omdsh-dev/dsh-tool-schema", "omdsh-dev/dsh-tool-stat",
        "omdsh-dev/dsh-tool-time", "omdsh-dev/dsh-kb-sieve", "HuanLinOTO/dsh-plugin-mineru",
        "Jesse-njx/dsh-cowork", "Jesse-njx/dsh-skillport", "vibeinging/dsh-tool-search",
        "THU-MAIC/dsh-openmaic", "lzszq/dsh-scholar", "jihongboo/dsh-apple-mode",
        "ZK-Andy/dsh-continual-evolve", "zp-home/dsh-recommend", "liustack/modlens",
        "awesome-dsh-plugin/dsh-find-plugin", "lonelymoon87/dsh-code-intel",
        "lynx-gt/dsh-subagent-tools", "lynx-gt/dsh-subagent-cwd", "Jesse-njx/dsh-voice",
        "Jesse-njx/dsh-docker", "hccccc01333/dsh-excel-vera-plugin",
    ],
    "Workflow & Automation": [
        "icetomoyo/dsh_workflow", "NanmiCoder/dsh-agent-teams", "titanwings/dsh-automation",
        "Jesse-njx/dsh-routines", "titanwings/dsh-plannotator", "vlln/dsh-loop",
        "fuhefei/dsh-sentinel", "omdsh-dev/dsh-deep-research", "omdsh-dev/dsh-inspect",
        "fakechris/dsh-track", "btspoony/dsh-advisor", "lonelymoon87/dsh-specflow",
    ],
    "Notifications & Integrations": [
        "omdsh-dev/dsh-open-in-vscode", "omdsh-dev/dsh-notification",
        "bobleer/dsh-acp-for-bitfun", "openma-ai/deepseek-harness-acp", "LoserFox/telegram",
        "Jesse-njx/dsh-chatnode-wechat", "dingyi222666/dsh-session-notification",
        "bill9109/dsh-web-ui-notify", "bill9109/dsh-webbridge", "BiBoyang/dsh-im-bridge",
    ],
    "Development & Runtime": [
        "omdsh-dev/fabric", "LoserFox/dsh-git-identity", "Zhenyu98/dsh-context-doctor",
        "omdsh-dev/dsh-plugin-check", "omdsh-dev/dsh-security-audit",
        "omdsh-dev/dsh-session-health", "william-jin-cmu/dsh-evolve", "vibeinging/dsh-trace",
        "omdsh-dev/sandbox-micro", "omdsh-dev/sandbox-mxc", "omdsh-dev/sandbox-nono",
        "vibeinging/dsh-agent-budget", "btspoony/dsh-llm-fallbacks", "Jesse-njx/dsh-polyglot",
        "ilharp/dsh-tool-approval", "omdsh-dev/plugin-template", "omdsh-dev/Qwen-MM-Plugins",
        "Small-tailqwq/dsh-tps", "Areium/dsh-fail-logger", "BiBoyang/dsh-eval-harness",
        "hust-open-atom-club/oh-dsh", "BrambleXu/dsh-annotate", "BrambleXu/dsh-prompt-profile",
        "BrambleXu/dsh-revdiff", "lonelymoon87/dsh-gitflow", "lonelymoon87/dsh-guardian",
        "Jesse-njx/dsh-plugin-manager", "Jesse-njx/dsh-tmuxctl",
    ],
    "Just for Fun": [
        "Nagi-ovo/dsh-ads", "omdsh-dev/dsh-gomoku", "AnacondaKC/dsh-stock-market",
        "hellodigua/dsh-emoji", "lhh010/dsh-minigames", "william-jin-cmu/dsh-stickers",
        "vlln/whale-girl", "Moeblack/deepseek-manners", "HuanLinOTO/dsh-plugin-d399",
        "omdsh-dev/dsh-auto-chess", "AnacondaKC/dsh-douyin",
    ],
}

# Curated descriptions from the awesome list (repo -> one-liner), used when the
# GitHub description is missing or thin. A handful of high-value ones only.
CURATED_DESC = {
    "liustack/modlens": "The first vision plugin for DeepSeek Harness: paste an image, get structured JSON evidence (OCR, layout, semantics).",
    "liustack/modsearch": "The web plugin for DeepSeek Harness: ask the web or X, get structured JSON evidence (search, fetch, citations).",
    "Nagi-ovo/dsh-visualize": "In-conversation generative UI: the model renders interactive HTML cards into the chat stream, with streaming preview and sandboxed rendering.",
    "omdsh-dev/dsh-genui": "Interactive UI components rendered inline in replies: layout, charts, forms, quizzes, mermaid, 3D scenes, and an action event loop back to the model.",
    "omdsh-dev/DSH-better-sidebar": "Full sidebar workbench with file rendering and editing, terminal, Git, and subagents; third-party plugins can register new tabs.",
    "ccch1mneyyy/dsh-TUI": "Claude Code-style full-screen terminal UI: pixel-whale header, live status line, streaming thought expansion, double-Esc rollback.",
    "NanmiCoder/dsh-agent-teams": "AgentTeams multi-agent teams: one natural-language command drives a whole team, with a live activity panel in the Web GUI.",
    "icetomoyo/dsh_workflow": "UltraCode-style multi-agent orchestration: a generatable, savable, governable, observable, resumable workflow layer.",
    "Anionex/dsh-vision-toolkit": "Vision tasks for text-only models: intent-aware image Q&A, long-screenshot OCR, UI reproduction, grounding, and pixel diff.",
    "vlln/whale-girl": "Desktop pet (QQ-pet style): floats in the corner, draggable, feedable, playable. Ships as an official repository-plugin.",
    "Nagi-ovo/dsh-ads": "Parody ads in 2005-Chinese-web style: sidebar banners, in-chat feeds, corner popups. All fictional.",
    "omdsh-dev/dsh-at-file": "Codex-style @file mentions: search workspace files in the composer and attach their contents to prompts.",
    "omdsh-dev/dsh-open-in-vscode": "Open DeepSeek Harness workspace directories in VS Code directly from the web GUI.",
    "omdsh-dev/dsh-notification": "Desktop notifications for turn completions, with per-outcome controls and keyword rules.",
    "omdsh-dev/dsh-custom-tool": "Create and manage sandboxed JavaScript tools with a Monaco editor and model-driven tool lifecycle.",
    "omdsh-dev/dsh-plugin-check": "Plugin health checks: manifest protocol, patch format, and build traps. Zero-dependency and read-only.",
    "Lum1104/dsh-browser": "Chrome sidebar extension that lets DSH operate your browser directly, no vision capabilities required.",
    "Small-tailqwq/dsh-deep-whale": "Whale-girl skin series for the DSH Web UI (deep-sea maid atelier), CC BY-NC-SA 4.0.",
}

# --------------------------------------------------------------------------
# 4. Install commands (curated per repo, from READMEs)
# --------------------------------------------------------------------------
INSTALL = {
    "liustack/modlens": "npx -y @deepseek-ai/dsh plugin --profile web add @liustack/modlens@latest",
    "liustack/modsearch": "npx -y @deepseek-ai/dsh plugin --profile web add @liustack/modsearch@latest",
    "Nagi-ovo/dsh-ads": "dsh plugin --profile web add github:Nagi-ovo/dsh-ads",
    "Nagi-ovo/dsh-visualize": "dsh plugin --profile web add github:Nagi-ovo/dsh-visualize",
    "Nagi-ovo/dsh-find-plugins": "dsh plugin --profile web add github:Nagi-ovo/dsh-find-plugins",
    "NanmiCoder/dsh-agent-teams": "npx -p @deepseek-ai/dsh dsh plugin --profile web add github:NanmiCoder/dsh-agent-teams",
    "omdsh-dev/DSH-better-sidebar": "curl -fsSL https://raw.githubusercontent.com/omdsh-dev/DSH-better-sidebar/main/scripts/install.sh | bash",
    "ccch1mneyyy/dsh-TUI": "sh install.sh",
    "icetomoyo/dsh_workflow": "dsh plugin --profile web add \"github:dsh-external/dsh_workflow#main\"",
    "omdsh-dev/dsh-genui": "dsh plugin --profile web add github:omdsh-dev/dsh-genui",
    "omdsh-dev/dsh-at-file": "npx -y --package @deepseek-ai/dsh dsh plugin --profile web add dsh-at-file",
    "omdsh-dev/dsh-notification": "npx -y --package @deepseek-ai/dsh dsh plugin --profile web add dsh-notification",
    "omdsh-dev/dsh-open-in-vscode": "npx -y --package @deepseek-ai/dsh dsh plugin --profile web add dsh-open-in-vscode",
    "omdsh-dev/dsh-custom-tool": "npx -y --package @deepseek-ai/dsh dsh plugin --profile web add dsh-custom-tool",
    "omdsh-dev/dsh-toolkit": "npx -y --package @deepseek-ai/dsh dsh plugin --profile web add dsh-toolkit",
    "omdsh-dev/dsh-security-audit": "npx -y --package @deepseek-ai/dsh dsh plugin --profile web add dsh-security-audit",
    "omdsh-dev/dsh-plugin-check": "npx -y --package @deepseek-ai/dsh dsh plugin --profile web add dsh-plugin-check",
    "vlln/whale-girl": "dsh plugin --profile web add \"github:vlln/whale-girl#main\"",
    "vlln/plugin-registry": "npx -y --package @deepseek-ai/dsh dsh plugin --profile web add plugin-registry",
    "Lum1104/dsh-browser": "git clone https://github.com/Lum1104/dsh-browser && cd dsh-browser && ./scripts/install.sh",
    "omdsh-dev/DSH-better-sidebar#alt": "npx -y --package @deepseek-ai/dsh dsh plugin --profile web add dsh-better-sidebar",
}

def generic_install(repo):
    name = repo["name"]
    if name.startswith("dsh-") and len(name) > 5:
        return f"npx -y --package @deepseek-ai/dsh dsh plugin --profile web add {name}"
    return f"dsh plugin --profile web add github:{repo['full_name']}"

# --------------------------------------------------------------------------
# 5. Classification
# --------------------------------------------------------------------------
import re as _re

def classify(repo, curated_cat):
    if curated_cat:
        return curated_cat
    name = repo["name"].lower()
    hay = " ".join([
        name,
        repo["full_name"].lower(),
        (repo.get("description") or "").lower(),
        " ".join(t.lower() for t in repo.get("topics", [])),
    ])
    # Skill detection is name-based: descriptions mention "skill" for many
    # non-skill plugins (e.g. modlens ships a skill), so only trust the name.
    if _re.search(r"(?i)(^|[^a-z0-9])(skill|skills)([^a-z0-9]|$)|colleague|harmony|mentor|tutor|persona|super-injector|promentor|pack-agent|stream-rules|reasoning-translator", name):
        return "skill"
    for cid in CAT_ORDER:
        for rx in CATS[cid]["rules"]:
            if _re.search(rx, hay):
                return cid
    return "misc"

# --------------------------------------------------------------------------
# 6. Assemble records
# --------------------------------------------------------------------------
# Explicit curated overrides for well-known top repos (owner/repo -> category id)
CURATED_OVERRIDES = {
    "zhu1090093659/dsh-web-ui": "ui",
    "Small-tailqwq/dsh-deep-whale": "fun",
    "Small-tailqwq/dsh-tps": "ui",
    "lhh010/dsh-ui-whale": "fun",
    "lhh010/dsh-minigames": "fun",
    "lhh010/dsh-paste-input": "ui",
    "lhh010/dsh-ui-progress": "ui",
    "Nagi-ovo/dsh-visualize": "ui",
    "Nagi-ovo/dsh-ads": "fun",
    "Nagi-ovo/dsh-find-plugins": "docs",
    "Lum1104/dsh-browser": "search",
    "liustack/modlens": "vision",
    "liustack/modsearch": "search",
    "Anionex/dsh-vision-toolkit": "vision",
    "Anionex/agent-vision-toolkit": "vision",
    "Anionex/dsh-computer-use": "vision",
    "morluto/rea": "dev",
    "morluto/jacobian": "search",
    "morluto/flameox": "dev",
    "morluto/leantoken": "dev",
    "morluto/internalcot": "dev",
    "morluto/smokinggun": "dev",
    "SepineTam/mcp-for-stata": "search",
    "zhaoolee/notes": "tools",
    "openma-ai/open-managed-agents": "platform",
    "sandbaseai/sandbase-harness": "platform",
    "hellowind777/helloagents": "platform",
    "Devin-AXIS/iPolloWork": "platform",
    "whiteguo233/OpenBiliClaw": "search",
    "whiteguo233/dsh-openbiliclaw": "platform",
    "nutshellai-tech/mobius": "platform",
    "paean-ai/deeptide": "desktop",
    "titanwings/colleague-skill": "skill",
    "AdamPlatin123/awesome-dsh-plugins": "docs",
    "0xsline/awesome-deepseek-harness": "docs",
    "awesome-dsh-plugin/awesome-dsh-plugin": "docs",
    "Alex-Yanggg/awesome-DSH-plugin": "docs",
    "bruc3van/awesome-dsh-plugin": "docs",
    "Electricitysheep/dsh-handbook": "docs",
    "huiliyi37/dsh-tianshu-tui": "ui",
    "huiliyi37/dsh-tianshu-build": "ui",
    "ccch1mneyyy/dsh-TUI": "ui",
    "omdsh-dev/DSH-better-sidebar": "ui",
    "omdsh-dev/dsh-at-file": "ui",
    "omdsh-dev/dsh-genui": "ui",
    "omdsh-dev/dsh-open-in-vscode": "integration",
    "omdsh-dev/dsh-notification": "integration",
    "omdsh-dev/dsh-custom-tool": "tools",
    "omdsh-dev/dsh-toolkit": "tools",
    "omdsh-dev/dsh-plugin-check": "dev",
    "omdsh-dev/dsh-security-audit": "dev",
    "omdsh-dev/dsh-session-health": "dev",
    "omdsh-dev/fabric": "dev",
    "omdsh-dev/dsh-plugin-dev": "docs",
    "omdsh-dev/dsh-plugin-skills": "skill",
    "omdsh-dev/dsh-book2skill": "tools",
    "omdsh-dev/dsh-lark": "integration",
    "omdsh-dev/dsh-gomoku": "fun",
    "omdsh-dev/dsh-auto-chess": "fun",
    "omdsh-dev/dsh-deep-research": "agent",
    "omdsh-dev/dsh-openapi": "tools",
    "icetomoyo/dsh_workflow": "agent",
    "NanmiCoder/dsh-agent-teams": "agent",
    "vlln/whale-girl": "fun",
    "vlln/plugin-registry": "dev",
    "vlln/dsh-loop": "agent",
    "vlln/dsh-navbar": "ui",
    "vlln/dsh-task-status": "ui",
    "pulseaiclub/phi": "platform",
    "cofy-x/axern": "platform",
    "humblebanana/open-record-replay": "dev",
    "Lyn-77/ProMentor": "skill",
    "pingfanfan/hello-dsh": "docs",
    "xiaohai-78/Top": "docs",
    "HeiGeAi/deepseek-harness-skin": "fun",
    "LaplaceYoung/dsh-qq2006": "fun",
    "147228/dsh-xiaoyao-skins": "fun",
    "Small-tailqwq/dsh-deepcel": "fun",
    "opensetk/dsh-xiaohei": "fun",
    "HuanLinOTO/dsh-plugin-spur": "fun",
    "HuanLinOTO/dsh-plugin-d399": "fun",
    "JasonJin2006/dsh-sound-effects-plugin": "fun",
    "omdsh-dev/dsh-fun-typewriter": "fun",
    "fff122/dsh-agent-arcade": "fun",
    "william-jin-cmu/dsh-companion": "desktop",
    "william-jin-cmu/dsh-evolve": "agent",
    "william-jin-cmu/dsh-artifact": "tools",
    "techysy/deepseek-harness-fnos": "desktop",
    "NEXTINDIE/DeepSeek-Harness-for-VS-Code": "integration",
    "songqikong/dash": "platform",
    "GiantGKL/dsh-cost": "dev",
    "YYTbit/dsh-plugin-cost-tracker": "dev",
    "vibeinging/dsh-agent-budget": "dev",
    "HuanLinOTO/dsh-plugin-sleep": "tools",
    "jiesou/dsh-stream-rules": "skill",
    "yjm110517/content-to-editable-ppt-skill": "skill",
    "pinkllo/dsh-reasoning-translator": "skill",
    "sakikoTGW/pack-agent": "skill",
    "GooodWei/context-vista": "ui",
    "Mongfayi/dsh-local-filetree": "ui",
    "MorGogh/widget-dock": "ui",
    "chen-001/dsh-chat-width": "ui",
    "omdsh-dev/dsh-fun-weather": "ui",
    "omdsh-dev/dsh-ernie-image": "vision",
    "Opr4Mp3r/deepseek-harness-plugin-from-scratch": "docs",
    "morlay/session-persistence-rdb": "memory",
    "omdsh-dev/dsh-revive": "memory",
    "unnnnoooo/dsh-cue-plugin": "memory",
    "KitDoesIt/dsh-compaction-instant": "memory",
    "Fisfzy/zotero-wave-rag": "search",
    "krislavten/ai-sdk-provider-dsh": "dev",
    "openma-ai/deepseek-harness-typescript-sdk": "dev",
    "Bandersnatch0x/amber-protocol": "dev",
    "AngelosZou/graphlint": "dev",
    "Alyosha28/deep_option": "search",
    "Mappedinfo/PlainDeck": "tools",
    "1475505/dsh-plugin-miliastra-toolbox": "tools",
    "whiteguo233/dsh-cc-connect": "integration",
    "oitsukiii/deepseek-harness-lan": "dev",
    "lhh010/dsh-bash-encoding": "tools",
}

# AWESOME list also feeds curated categories; vision-ish repos grouped under
# "Tools & Capabilities" are re-mapped to vision below.
VISION_HINT = re.compile(r"(vision|ocr|computer-use|screenshot|image)", re.I)

def cat_of_catname(name):
    return AWESOME_CATMAP.get(name)

# build curated category lookup from AWESOME
curated_cat = {}
for catname, names in AWESOME.items():
    cid = cat_of_catname(catname)
    for n in names:
        if cid == "tools" and VISION_HINT.search(n):
            cid_use = "vision"
        else:
            cid_use = cid
        curated_cat[n] = cid_use

def curated_for(fn):
    if fn in CURATED_OVERRIDES:
        return CURATED_OVERRIDES[fn]
    return curated_cat.get(fn)

records = []
seen = set()
for r in repos:
    fn = r["full_name"]
    if fn in seen:
        continue
    seen.add(fn)
    owner, _, name = fn.partition("/")
    desc = CURATED_DESC.get(fn) or (r.get("description") or "").strip()
    desc = " ".join(desc.split())
    if len(desc) > 260:
        desc = desc[:257].rstrip() + "..."
    # skip the platform core itself (tagged dsh-plugin but is the harness)
    if fn == "deepseek-ai/deepseek-harness":
        continue
    cat = classify(r, curated_for(fn))
    inst = INSTALL.get(fn) or generic_install(r)
    rec = {
        "id": fn,
        "name": name,
        "owner": owner,
        "full_name": fn,
        "description": desc,
        "category": cat,
        "stars": r.get("stargazers_count", 0),
        "forks": r.get("forks_count", 0),
        "language": r.get("language"),
        "topics": (r.get("topics") or [])[:6],
        "install": inst,
        "created": r.get("created_at", "")[:10],
        "updated": r.get("updated_at", "")[:10],
        "url": r.get("html_url", f"https://github.com/{fn}"),
        "homepage": r.get("homepage"),
        "license": (r.get("license") or {}).get("spdx_id") if r.get("license") else None,
        "avatar": r.get("owner", {}).get("avatar_url", ""),
    }
    records.append(rec)

records.sort(key=lambda x: (-x["stars"], x["name"].lower()))

# --------------------------------------------------------------------------
# 7. README excerpts (optional enrichment for the detail modal) + featured flag
# --------------------------------------------------------------------------
def fetch_readmes(sorted_repos, top_n=60):
    """Fetch README.md for the top-starred repos via raw.githubusercontent.com
    (no API rate limit). Files already cached are skipped, so local dev is
    incremental and CI on a fresh runner pulls everything it needs."""
    os.makedirs(README_DIR, exist_ok=True)
    have = set(os.listdir(README_DIR))
    new = 0
    for r in sorted_repos[:top_n]:
        fname = r["full_name"].replace("/", "__") + ".md"
        if fname in have:
            continue
        owner, _, repo = r["full_name"].partition("/")
        ok = False
        for branch in {r.get("default_branch", "main"), "main", "master"}:
            url = f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/README.md"
            try:
                with urllib.request.urlopen(urllib.request.Request(
                        url, headers={"User-Agent": "dsh-plugin-store-updater"}),
                        timeout=20) as resp:
                    text = resp.read().decode("utf-8", "replace")
                open(os.path.join(README_DIR, fname), "w", encoding="utf-8").write(text)
                new += 1
                ok = True
                break
            except Exception:
                continue
        if not ok:
            print(f"  no README: {r['full_name']}")
        time.sleep(0.15)
    print(f"readmes: {new} new of {top_n} targeted, {len(os.listdir(README_DIR))} cached")

# ensure READMEs exist (pulls the top-starred repos on a fresh machine)
fetch_readmes(sorted(repos, key=lambda x: -(x.get("stargazers_count") or 0)))

def clean_md(text):
    import re as _re
    t = text
    # drop code fences content except short single lines
    t = _re.sub(r"```.*?```", " ", t, flags=_re.S)
    # drop images and links (keep link text)
    t = _re.sub(r"!\[[^\]]*\]\([^)]*\)", " ", t)
    t = _re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", t)
    t = _re.sub(r"<[^>]+>", " ", t)
    t = _re.sub(r"[#>*`|_~\-]+", " ", t)
    t = _re.sub(r"\s+", " ", t)
    return t.strip()

for rec in records:
    p = os.path.join(README_DIR, rec["full_name"].replace("/", "__") + ".md")
    if os.path.exists(p):
        raw = open(p, encoding="utf-8", errors="replace").read()
        cleaned = clean_md(raw)
        # take a window starting after any badges/title noise
        start = cleaned.find("DeepSeek")
        if start == -1 or start > 400:
            start = 0
        excerpt = cleaned[start:start + 420]
        if len(excerpt) < 120:
            excerpt = cleaned[:420]
        rec["readme"] = excerpt.rstrip()

# featured = top 9 by stars among "real plugins" (skip docs/index/desktop-only)
FEATURED_N = 9
eligible = [r for r in records if r["category"] not in ("docs", "platform")]
eligible.sort(key=lambda x: -x["stars"])
featured = {r["id"] for r in eligible[:FEATURED_N]}
for r in records:
    r["featured"] = r["id"] in featured

out_path = os.path.join(ROOT, "data", "plugins.json")
generated_at = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")
json.dump(records, open(out_path, "w"), ensure_ascii=False, separators=(",", ":"))
meta_path = os.path.join(ROOT, "data", "meta.json")
json.dump({"generated_at": generated_at}, open(meta_path, "w"), ensure_ascii=False)
print("wrote", out_path)
print("generated_at:", generated_at)
print("plugins:", len(records))
from collections import Counter
cc = Counter(x["category"] for x in records)
for cid in CAT_ORDER + ["misc"]:
    if cid in cc:
        print(f"  {cid:12s} {cc[cid]:4d}  {CATS.get(cid,{}).get('label_zh','其他')}")
tot = sum(x["stars"] for x in records)
print("total stars:", tot)

# --------------------------------------------------------------------------
# 8. Trend history (data/stats_history.json) for the homepage charts.
#    Every point is a REAL fetch snapshot. Past snapshots are reconstructed
#    from the git history of data/plugins.json (each commit that touched it
#    is one fetch); every run then appends the current snapshot. No
#    approximate/derived data is ever written.
# --------------------------------------------------------------------------
HIST_PATH = os.path.join(ROOT, "data", "stats_history.json")

def _git_snapshot_history():
    import subprocess
    hist = []
    try:
        out = subprocess.run(
            ["git", "log", "--format=%H|%aI", "--", "data/plugins.json"],
            capture_output=True, text=True, cwd=ROOT,
        ).stdout
        for line in out.strip().splitlines():
            if "|" not in line:
                continue
            sha, author_iso = line.split("|", 1)
            blob = subprocess.run(
                ["git", "show", sha + ":data/plugins.json"],
                capture_output=True, text=True, cwd=ROOT,
            ).stdout
            if not blob:
                continue
            try:
                data = json.loads(blob)
            except Exception:
                continue
            if isinstance(data, list):
                recs, gen = data, None
            else:
                recs, gen = data.get("records", []), data.get("generated_at")
            ts = gen or author_iso
            try:
                t = datetime.datetime.fromisoformat(ts)
                if t.tzinfo is None:
                    t = t.replace(tzinfo=datetime.timezone.utc)
                tkey = t.astimezone(datetime.timezone.utc).isoformat(timespec="seconds")
            except Exception:
                tkey = ts
            hist.append({"time": tkey, "plugins": len(recs),
                         "stars": sum(r.get("stars", 0) for r in recs)})
    except Exception as e:
        print("stats history: git snapshot unavailable:", e)
    return hist

def _dedupe_minute(points):
    by_min = {}
    for p in points:
        by_min[p["time"][:16]] = p  # keep the latest within the same minute
    return sorted(by_min.values(), key=lambda p: p["time"])

hist = _dedupe_minute(_git_snapshot_history())
if hist:
    # Drop anomalous snapshots: one early Action run (03d679d) used a buggy
    # build that pulled in non-plugin high-star repos, inflating the stars
    # total ~3x. Keep the real snapshots by filtering on a robust median.
    import statistics
    med = statistics.median(p["stars"] for p in hist)
    hist = [p for p in hist if p["stars"] <= max(med * 2, 2000)]
now = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")
hist.append({"time": now, "plugins": len(records), "stars": tot})
hist = _dedupe_minute(hist)
json.dump(hist, open(HIST_PATH, "w"), ensure_ascii=False)
print(f"stats history: wrote stats_history.json ({len(hist)} real fetch snapshots, {hist[0]['time']}..{hist[-1]['time']})")
