# AI Daily Digest

每天自动从 **90+ 顶级技术博客** 和自定义 X/Twitter 账号抓取最新内容，通过 **网易伏羲 AI（兼容 OpenAI 协议）** 智能评分、分类和摘要，生成结构化的中文每日 AI 技术精选日报。

## 它能做什么

- **多源聚合** — 订阅 90 个来自 [Hacker News Popularity Contest 2025](https://hnblogs.substack.com/)（Andrej Karpathy 策划）的技术博客 RSS，支持自定义添加 X/Twitter 技术账号
- **AI 智能评分** — 使用网易伏羲 AI（兜底支持 OpenAI）从**技术实用性、可落地性、技术含金量、时效性、非技术冗余度** 5个核心维度（各 1-5 分）对每篇文章量化打分
- **自动分类** — 将文章归入 chat-tts、image-video、music-generate、ai-coding、ai-cowork、other-ai 六大 AI 技术领域
- **中文摘要** — 为每篇文章生成自然流畅的中文标题、4-6 句结构化摘要和 1 句话推荐理由
- **高可用设计** — 内置超时控制、失败降级、并发限制机制，AI 调用失败自动切换兜底方案
- **灵活扩展** — 可自定义 RSS 源、评分权重、分类体系、输出格式
- **全自动化** — 支持定时运行，零人工干预

## 工作流程

```
RSS Feeds (90个AI技术博客)  ──┐
                             ├──→ 并发抓取 → AI 多维度评分 → AI 分类 → 生成摘要 → 输出结构化精选内容
X/Twitter (自定义账号)      ──┘
```

**详细流程：**

1. **抓取** — 并发获取 90+ RSS 源和自定义 X/Twitter 动态（通过 RSSHub 代理），内置 15 秒超时控制
2. **过滤** — 解析文章元数据，过滤无效内容
3. **评分** — 网易伏羲 AI 分批评估（10 篇/批），5 维度打分（1-5 分）+ 自动分类 + 关键词提取（2-4 个）
4. **摘要** — 为文章生成中文标题、4-6 句结构化摘要和 1 句话推荐理由
5. **输出** — 生成结构化的精选内容（支持自定义输出格式）

## 核心能力说明

### 多维度 AI 评分体系
AI 从5个核心维度对每篇文章进行1-5分量化评估（5分最高）：
- **技术实用性**：内容的实际开发价值和可直接使用程度
- **可落地性**：技术方案的部署/接入难度和文档完善度
- **技术含金量**：内容的技术深度和细节丰富度
- **时效性**：技术内容的新鲜度和行业热度
- **非技术冗余度**：纯技术干货占比（过滤商业/八卦内容）

### 智能分类体系
自动将文章归类到6大AI技术领域：
- 🗣️ chat-tts：聊天/TTS模型（LLM、语音合成、语音交互等）
- 🎨 image-video：图像视频生成模型（文生图/视频、扩散模型等）
- 🎵 music-generate：音乐生成工具/模型
- 💻 ai-coding：AI编程辅助（代码生成、编程大模型等）
- 📊 ai-cowork：AI协同办公（文档处理、办公自动化等）
- 🔬 other-ai：其他AI技术（基础算法、伦理、教育等）

### 结构化摘要能力
为每篇文章生成：
- **中文标题**：英文标题自动翻译为自然流畅的中文
- **结构化摘要**：4-6句话核心内容摘要（30秒快速了解文章价值）
- **推荐理由**：1句话说明文章的核心价值和阅读理由
- **关键词提取**：2-4个核心技术关键词

## 技术栈

| 组件 | 技术 |
|------|------|
| 运行时 | [Bun](https://bun.sh/) / Node.js |
| 语言 | TypeScript |
| 核心 AI 能力 | 网易伏羲 API（gemini-3-flash-preview） |
| AI 兜底方案 | OpenAI API（gpt-4o-mini，兼容协议） |
| X/Twitter 代理 | [RSSHub](https://docs.rsshub.app/) |
| 并发控制 | 可配置的批量处理和并发限制 |
| 错误处理 | 超时控制、失败降级、默认值兜底 |

## 快速开始

### 环境准备
需配置以下环境变量（优先使用网易伏羲）：

| 变量名 | 说明 | 必填 |
|--------|------|------|
| `NETEASE_API_KEY` | 网易伏羲 API 密钥 | ✅ |
| `OPENAI_API_KEY` | OpenAI API 密钥（兜底备用） | ❌ |
| `OPENAI_API_BASE` | OpenAI 兼容 API 地址 | ❌ |
| `RSSHUB_BASE_URL` | RSSHub 地址（用于X/Twitter RSS） | ❌ |
| `X_ACCOUNTS` | X/Twitter 账号列表（逗号分隔） | ❌ |

### 本地运行

```bash
# 安装依赖（推荐使用 Bun）
bun install

# 或使用 npm
npm install

# 设置网易伏羲 API 密钥
export NETEASE_API_KEY="your-netease-fuxi-api-key"

# 运行主程序
bun run index.ts

# 或使用 Node.js
node index.ts
```

### 核心配置项（可自定义）

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `FEED_FETCH_TIMEOUT_MS` | Feed 抓取超时时间 | 15000 (15秒) |
| `FEED_CONCURRENCY` | Feed 抓取并发数 | 10 |
| `GEMINI_BATCH_SIZE` | AI 调用批量大小 | 10 |
| `MAX_CONCURRENT_GEMINI` | 最大并发 AI 调用数 | 2 |
| `NETEASE_FUXI_MODEL` | 网易伏羲使用模型 | gemini-3-flash-preview |
| `OPENAI_DEFAULT_MODEL` | OpenAI 默认模型 | gpt-4o-mini |

## 自定义扩展

### 修改 RSS 源
编辑代码中的 `RSS_FEEDS` 数组，添加/移除/修改博客源：
```typescript
const RSS_FEEDS = [
  { 
    name: "自定义博客名称", 
    xmlUrl: "https://your-blog.com/rss.xml", 
    htmlUrl: "https://your-blog.com" 
  },
  // 更多源...
];
```

### 自定义 X/Twitter 账号
设置环境变量指定要抓取的 X/Twitter 账号：
```bash
export X_ACCOUNTS="account1,account2,account3"
```

### 调整评分维度权重
修改 `scoreArticlesWithAI` 函数中的总分计算逻辑：
```typescript
// 示例：提升技术实用性权重
const totalScore = 
  clamp(result.practicality) * 1.5 +  // 1.5倍权重
  clamp(result.deployability) * 1.0 +
  clamp(result.technicalValue) * 1.2 +
  clamp(result.timeliness) * 1.0 +
  clamp(result.nonTechRedundancy) * 0.8;
```

### 扩展分类体系
修改 `CategoryId` 类型和 `CATEGORY_META` 配置，新增/调整分类：
```typescript
// 新增分类示例
type CategoryId = 'chat-tts' | 'image-video' | 'music-generate' | 'ai-coding' | 'ai-cowork' | 'other-ai' | 'new-category';

const CATEGORY_META = {
  'new-category': { emoji: '🆕', label: '新分类名称' },
  // 其他分类配置...
};
```

### 自定义输出格式
扩展结果处理逻辑，支持生成 Markdown、HTML、JSON 等格式：
```typescript
// 示例：生成 Markdown 格式输出
function generateMarkdownSummary(scoredArticles: ScoredArticle[]) {
  let md = "# AI 每日精选\n\n";
  scoredArticles.forEach(article => {
    md += `## ${article.titleZh}\n`;
    md += `> 来源: [${article.sourceName}](${article.sourceUrl})\n`;
    md += `> 分类: ${CATEGORY_META[article.category].emoji} ${CATEGORY_META[article.category].label}\n`;
    md += `> 评分: ${article.score.toFixed(1)}/25\n`;
    md += `> 关键词: ${article.keywords.join(', ')}\n\n`;
    md += `${article.summary}\n\n`;
    md += `**推荐理由**: ${article.reason}\n\n`;
    md += `[阅读原文](${article.link})\n\n---\n\n`;
  });
  return md;
}
```

## 容错与性能优化

### 错误处理机制
- Feed 抓取超时自动中止（15秒），失败仅记录警告不中断整体流程
- AI 调用失败自动降级到备用 API（OpenAI）
- 评分/摘要生成失败时使用合理默认值兜底
- 分数自动修正到 1-5 分范围（防止 AI 返回异常值）

### 性能优化策略
- 分批次并发处理 Feed 抓取（默认10个并发）
- 分批次调用 AI API（默认每批10篇，2个并发批次）
- 限制摘要长度和描述长度，减少 AI 处理负载
- 复用 HTTP 连接和 AI 客户端实例

## License

MIT
