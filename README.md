# AI Daily Digest

每天自动从 **90+ 顶级技术博客** 和 **25+ X/Twitter 账号** 抓取最新内容，通过 **Gemini AI** 智能评分、分类和摘要，生成结构化的中文每日技术精选日报，并自动推送到微信。

## 它能做什么

- **多源聚合** — 订阅 90 个来自 [Hacker News Popularity Contest 2025](https://hnblogs.substack.com/)（Andrej Karpathy 策划）的技术博客 RSS，加上 25+ 个 X/Twitter 技术大V账号
- **AI 智能评分** — 使用 Gemini AI 从相关性、质量、时效性三个维度（各 1-10 分）对每篇文章打分
- **自动分类** — 将文章归入 AI/ML、安全、工程、工具/开源、观点/讨论、其他 六大分类
- **中文摘要** — 为每篇英文文章生成中文标题、4-6 句摘要和推荐理由
- **趋势洞察** — AI 生成当日宏观技术趋势总结
- **可视化统计** — 包含分类分布饼图、关键词频率图表
- **微信推送** — 通过 Server酱 自动将精选内容推送到微信
- **全自动化** — GitHub Actions 定时运行，零人工干预

## 工作流程

```
RSS Feeds (90个博客)  ──┐
                        ├──→ 抓取文章 → 时间过滤 → AI 评分 → 选取 Top N → AI 摘要 → 生成日报 → 推送
X/Twitter (25+账号)  ──┘
```

**详细流程：**

1. **抓取** — 并发获取 90+ RSS 源和 X/Twitter 动态（通过 RSSHub 代理）
2. **过滤** — 筛选最近 24 小时内发布的文章
3. **评分** — Gemini AI 分批评估（10 篇/批），三维度打分 + 自动分类 + 关键词提取
4. **精选** — 按总分排序，选取 Top 15
5. **摘要** — 为精选文章生成中文标题、摘要和推荐理由，并生成当日趋势分析
6. **输出** — 渲染为结构化 Markdown 日报，保存到 `digests/` 目录
7. **推送** — 自动提交到 GitHub 并推送摘要到微信

## 日报示例

每份日报包含：

- **今日看点** — 3-5 句宏观趋势总结
- **今日必读 Top 5** — 最高分文章详细展示
- **数据概览** — 来源数、文章数统计表 + 可视化图表
- **分类文章列表** — 按六大分类展示所有精选文章，每篇含评分、摘要、推荐理由和关键词

> 查看历史日报：[`digests/`](./digests/) 目录

## 技术栈

| 组件 | 技术 |
|------|------|
| 运行时 | [Bun](https://bun.sh/) |
| 语言 | TypeScript |
| AI 评分 | Google Gemini 2.0 Flash |
| AI 备选 | DeepSeek（OpenAI 兼容接口） |
| X/Twitter 代理 | [RSSHub](https://docs.rsshub.app/)（Docker） |
| 自动化 | GitHub Actions |
| 微信推送 | [Server酱](https://sct.ftqq.com/) |

## 快速开始

### 本地运行

```bash
# 安装 Bun（如未安装）
curl -fsSL https://bun.sh/install | bash

# 运行
GEMINI_API_KEY=your-key bun scripts/digest.ts \
  --hours 24 \
  --top-n 15 \
  --lang zh \
  --output digest.md
```

### 命令行参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--hours <n>` | 抓取最近 N 小时的文章 | `48` |
| `--top-n <n>` | 精选文章数量 | `15` |
| `--lang <lang>` | 摘要语言（`zh` / `en`） | `zh` |
| `--output <path>` | 输出文件路径 | `./digest-YYYYMMDD.md` |

### GitHub Actions 自动部署

Fork 本仓库后，在 **Settings → Secrets and variables → Actions** 中配置：

**Secrets（必需）：**

| Secret | 说明 |
|--------|------|
| `GEMINI_API_KEY` | Gemini API Key（[免费获取](https://aistudio.google.com/apikey)） |

**Secrets（可选）：**

| Secret | 说明 |
|--------|------|
| `DEEPSEEK_API_KEY` | DeepSeek API Key，作为 Gemini 的备用方案 |
| `X_AUTH_TOKEN` | X/Twitter 认证 Token，用于抓取 X 动态 |
| `X_CT0` | X/Twitter CSRF Token |
| `SERVERCHAN_KEY` | Server酱 Key，用于微信推送 |

**Variables（可选）：**

| Variable | 说明 |
|----------|------|
| `X_ACCOUNTS` | 要关注的 X 账号列表（逗号分隔） |

配置完成后，GitHub Actions 会在每天**北京时间 7:39** 自动运行，也可在 Actions 页面手动触发。

## 日报存放

所有日报保存在 `digests/` 目录下，文件名格式 `digest-YYYYMMDD.md`。

## 自定义

### 修改 RSS 源

编辑 `scripts/digest.ts` 中的 `RSS_FEEDS` 数组，添加或移除 RSS 源。

### 修改 X 账号

在 GitHub Actions Variables 中修改 `X_ACCOUNTS`，或在本地运行时设置环境变量：

```bash
X_ACCOUNTS=account1,account2,account3
```

### 修改运行时间

编辑 `.github/workflows/daily-digest.yml` 中的 cron 表达式。

## License

MIT
