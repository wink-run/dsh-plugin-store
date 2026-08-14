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

## 功能

- **分类浏览**：13 个类别（界面与交互、智能体与自动化、视觉理解、工具集、搜索与数据、记忆与会话、集成与通知、开发与运行时、技能与提示词、桌面与启动、趣味与主题、发行与平台、文档与索引）+ 其他
- **搜索**：按名称 / 作者 / 描述 / 标签 / 分类实时过滤，支持 `/` 快捷键聚焦搜索框
- **排序**：推荐（Stars）、最多 Stars、最近更新、名称 A-Z
- **精选**：按 Stars 排序的顶部插件条
- **详情弹窗**：完整简介、真实安装命令（一键复制）、Stars / Forks / 语言 / 许可 / 更新时间、标签、README 摘要
- **深浅色主题**：默认跟随系统，可手动切换并记忆
- **URL 路由**：`#cat=vision`、`#search=ocr`、`#p=liustack/modlens` 可分享 / 可返回

## 数据与更新

| 文件 | 说明 |
| --- | --- |
| `data/plugins.json` | 插件目录（865 个仓库的整理结果） |
| `scripts/build_data.py` | 数据构建脚本：分类、安装命令、README 摘要、精选标记 |
| `assets/` | 自托管字体（Space Grotesk + JetBrains Mono）、CSS、JS |

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
