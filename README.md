# DSH 插件商店 · DeepSeek Harness Plugin Store

一个类似 [mcp.so](https://mcp.so) 的 DeepSeek Harness 社区插件目录主页。
抓取 GitHub [`dsh-plugin`](https://github.com/topics/dsh-plugin) 话题下的全部公开仓库，整理成可浏览、可搜索、可一键复制安装命令的静态商店页面。

## 快速开始

```bash
# 方案一：Python 静态服务器
python3 -m http.server 8080

# 方案二：Node 静态服务器（本项目自带，自动监听，无需参数）
node server.js
```

打开 <http://localhost:8080> 即可浏览。

## Docker Compose 部署（nginx + SSL）

生产推荐用 Docker 部署：nginx 直接托管静态站点、终结 TLS，并把所有 HTTP 流量转发到 HTTPS（支持反向代理到后端服务）。

```bash
# 1. 配置域名（可选，默认 localhost）
cp .env.example .env && 编辑 DOMAIN=你的域名

# 2. 准备证书
#    开发/本地测试：生成自签名证书
./scripts/gen-certs.sh localhost          # 或 ./scripts/gen-certs.sh store.example.com
#    生产：用 Let's Encrypt 或已有证书，把 fullchain.pem + privkey.pem 放到 ./certs/

# 3. 构建并启动
docker compose up -d --build
# 若构建后端（buildx）在受限目录环境报 "operation not permitted"，
# 可改用传统构建器：DOCKER_BUILDKIT=0 docker compose build && docker compose up -d

# 4. 验证
curl -k https://localhost/                    # 应返回商店首页
curl -I http://localhost/                     # 301 跳转到 https
docker compose ps                             # 容器健康检查状态
```

### 架构

```
浏览器 ── 80  ──▶ nginx (HTTP → 301 HTTPS)
      ── 443 ─▶ nginx (TLS 终结 + 静态站点 + 可选反向代理)
                   │ 静态: /usr/share/nginx/html (index.html, assets/, data/)
                   └─ 可选: location /api/ → 后端容器 (反向代理)
```

### SSL 配置说明

| 配置项 | 环境变量 | 默认值 |
| --- | --- | --- |
| 域名（server_name / 证书 CN） | `DOMAIN` | `localhost` |
| 证书链路径（容器内） | `SSL_CERT` | `/etc/nginx/certs/fullchain.pem` |
| 私钥路径（容器内） | `SSL_KEY` | `/etc/nginx/certs/privkey.pem` |

- 证书目录 `./certs` 以只读卷挂载进容器，**已被 .gitignore / .dockerignore 排除**，不会进入镜像或提交到仓库。
- nginx 配置是模板（`nginx/templates/default.conf.template`），容器启动时按环境变量自动替换 `DOMAIN` / `SSL_CERT` / `SSL_KEY`，nginx 自身的 `$host` / `$uri` 等运行时变量不受影响。
- TLS 1.2 / 1.3，安全响应头（X-Content-Type-Options、X-Frame-Options、Referrer-Policy）默认开启；HSTS 需确认域名后自行放开注释。
- 缓存策略：字体一年不可变缓存、CSS/JS 一小时、`data/plugins.json` 始终 no-store（数据每次抓取后立即生效）。

### nginx 反向代理（转发）

模板里预留了 `location /api/` 反向代理块（HTTP 与 HTTPS 两处，均已注释）。启用步骤：

1. 编辑 `nginx/templates/default.conf.template`，取消 `location /api/` 注释，把 `http://backend:8080/` 改成你的后端服务名；
2. 在 `docker-compose.yml` 里添加后端服务（或把 nginx 加入外部网络），与 store 处于同一 Docker 网络；
3. `docker compose up -d --build` 重建。

之后 `https://<DOMAIN>/api/...` 就会转发到后端容器。

### 常用命令

```bash
docker compose logs -f store     # 查看日志
docker compose restart store     # 重启
docker compose down              # 停止并移除容器（保留 certs/ 数据）
docker exec dsh-store nginx -t   # 容器内校验 nginx 配置
```

## 功能

- **分类浏览**：13 个类别（界面与交互、智能体与自动化、视觉理解、工具集、搜索与数据、记忆与会话、集成与通知、开发与运行时、技能与提示词、桌面与启动、趣味与主题、发行与平台、文档与索引）+ 其他
- **搜索**：按名称 / 作者 / 描述 / 标签 / 分类实时过滤，支持 `/` 快捷键聚焦搜索框
- **排序**：推荐（Stars）、最多 Stars、最近更新、名称 A-Z
- **精选**：按 Stars 排序的顶部插件条
- **Wink 生态**：首页 Banner 右侧展示 Token Bank 与 Wink Pings 的 logo 与一句话介绍（使用真实品牌素材）
- **详情弹窗**：完整简介、真实安装命令（一键复制）、Stars / Forks / 语言 / 许可 / 更新时间、标签、README 摘要
- **深浅色主题**：默认跟随系统，可手动切换并记忆
- **URL 路由**：`#cat=vision`、`#search=ocr`、`#p=liustack/modlens` 可分享 / 可返回

## 数据与更新

| 文件 | 说明 |
| --- | --- |
| `data/plugins.json` | 插件目录（865 个仓库的整理结果） |
| `scripts/build_data.py` | 数据构建脚本：分类、安装命令、README 摘要、精选标记 |
| `assets/css/` `assets/js/` | 页面样式与应用脚本 |
| `assets/fonts/` | 自托管字体（Space Grotesk + JetBrains Mono） |
| `assets/img/` | 品牌素材：Token Bank logo（SVG）、Wink 品牌图（PNG） |

重新抓取并重建数据：

```bash
python3 scripts/build_data.py   # 需要先准备原始仓库 JSON（见脚本顶部注释）
```

默认统计（当前快照）：

- 插件总数：865
- 社区 Stars：39,681+（不含 deepseek-harness 核心仓库本身）
- 数据更新：抓取当日（GitHub Search API，`topic:dsh-plugin`）

## 安全提示

本商店只做索引与发现，不托管也不审查插件代码。
安装第三方插件会运行其源码，请先阅读仓库、检查许可证，并在隔离环境中试用。
本页抓取的描述与命令来自各仓库 README，可能与最新版本有出入。

## 技术栈

无构建步骤、无运行时依赖的纯静态站点：原生 HTML + CSS（设计令牌 / 深浅主题 / 响应式）+ 原生 JS（fetch 数据、hash 路由、IntersectionObserver 入场动画）。字体自托管，数据单文件 JSON。

## 收录自己的插件

给仓库打上 [`dsh-plugin`](https://github.com/topics/dsh-plugin) 话题，下次抓取时自动出现；也可以提交到社区精选列表 [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)。
