import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import process from 'node:process';

// ============================================================================
// Constants
// ============================================================================

// 注释原有 Gemini 配置（不再使用）
// const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
// 新增：网易伏羲配置（核心替换）
const NETEASE_FUXI_API_BASE = 'https://aigc-api.fuxi.netease.com/v1';
const NETEASE_FUXI_MODEL = 'gemini-3-flash-preview';

// 保留原有 OpenAI 配置（兜底用）
const OPENAI_DEFAULT_API_BASE = 'https://api.openai.com/v1';
const OPENAI_DEFAULT_MODEL = 'gpt-4o-mini';
const FEED_FETCH_TIMEOUT_MS = 15_000;
const FEED_CONCURRENCY = 10;
const GEMINI_BATCH_SIZE = 10;
const MAX_CONCURRENT_GEMINI = 2;

// 90 RSS feeds from Hacker News Popularity Contest 2025 (curated by Karpathy)
const RSS_FEEDS: Array<{ name: string; xmlUrl: string; htmlUrl: string }> = [
  // { name: "simonwillison.net", xmlUrl: "https://simonwillison.net/atom/everything/", htmlUrl: "https://simonwillison.net" },
  { name: "jeffgeerling.com", xmlUrl: "https://www.jeffgeerling.com/blog.xml", htmlUrl: "https://jeffgeerling.com" },
  { name: "seangoedecke.com", xmlUrl: "https://www.seangoedecke.com/rss.xml", htmlUrl: "https://seangoedecke.com" },
  // { name: "krebsonsecurity.com", xmlUrl: "https://krebsonsecurity.com/feed/", htmlUrl: "https://krebsonsecurity.com" },
  { name: "daringfireball.net", xmlUrl: "https://daringfireball.net/feeds/main", htmlUrl: "https://daringfireball.net" },
  { name: "ericmigi.com", xmlUrl: "https://ericmigi.com/rss.xml", htmlUrl: "https://ericmigi.com" },
  // { name: "antirez.com", xmlUrl: "http://antirez.com/rss", htmlUrl: "http://antirez.com" },
  { name: "idiallo.com", xmlUrl: "https://idiallo.com/feed.rss", htmlUrl: "https://idiallo.com" },
  { name: "maurycyz.com", xmlUrl: "https://maurycyz.com/index.xml", htmlUrl: "https://maurycyz.com" },
  { name: "pluralistic.net", xmlUrl: "https://pluralistic.net/feed/", htmlUrl: "https://pluralistic.net" },
  { name: "shkspr.mobi", xmlUrl: "https://shkspr.mobi/blog/feed/", htmlUrl: "https://shkspr.mobi" },
  { name: "lcamtuf.substack.com", xmlUrl: "https://lcamtuf.substack.com/feed", htmlUrl: "https://lcamtuf.substack.com" },
  { name: "mitchellh.com", xmlUrl: "https://mitchellh.com/feed.xml", htmlUrl: "https://mitchellh.com" },
  { name: "dynomight.net", xmlUrl: "https://dynomight.net/feed.xml", htmlUrl: "https://dynomight.net" },
  { name: "utcc.utoronto.ca/~cks", xmlUrl: "https://utcc.utoronto.ca/~cks/space/blog/?atom", htmlUrl: "https://utcc.utoronto.ca/~cks" },
  { name: "xeiaso.net", xmlUrl: "https://xeiaso.net/blog.rss", htmlUrl: "https://xeiaso.net" },
  { name: "devblogs.microsoft.com/oldnewthing", xmlUrl: "https://devblogs.microsoft.com/oldnewthing/feed", htmlUrl: "https://devblogs.microsoft.com/oldnewthing" },
  // { name: "righto.com", xmlUrl: "https://www.righto.com/feeds/posts/default", htmlUrl: "https://righto.com" },
  { name: "lucumr.pocoo.org", xmlUrl: "https://lucumr.pocoo.org/feed.atom", htmlUrl: "https://lucumr.pocoo.org" },
  { name: "skyfall.dev", xmlUrl: "https://skyfall.dev/rss.xml", htmlUrl: "https://skyfall.dev" },
  { name: "garymarcus.substack.com", xmlUrl: "https://garymarcus.substack.com/feed", htmlUrl: "https://garymarcus.substack.com" },
  { name: "rachelbythebay.com", xmlUrl: "https://rachelbythebay.com/w/atom.xml", htmlUrl: "https://rachelbythebay.com" },
  { name: "overreacted.io", xmlUrl: "https://overreacted.io/rss.xml", htmlUrl: "https://overreacted.io" },
  { name: "timsh.org", xmlUrl: "https://timsh.org/rss/", htmlUrl: "https://timsh.org" },
  // { name: "johndcook.com", xmlUrl: "https://www.johndcook.com/blog/feed/", htmlUrl: "https://johndcook.com" },
  { name: "gilesthomas.com", xmlUrl: "https://gilesthomas.com/feed/rss.xml", htmlUrl: "https://gilesthomas.com" },
  { name: "matklad.github.io", xmlUrl: "https://matklad.github.io/feed.xml", htmlUrl: "https://matklad.github.io" },
  { name: "derekthompson.org", xmlUrl: "https://www.theatlantic.com/feed/author/derek-thompson/", htmlUrl: "https://derekthompson.org" },
  { name: "evanhahn.com", xmlUrl: "https://evanhahn.com/feed.xml", htmlUrl: "https://evanhahn.com" },
  { name: "terriblesoftware.org", xmlUrl: "https://terriblesoftware.org/feed/", htmlUrl: "https://terriblesoftware.org" },
  { name: "rakhim.exotext.com", xmlUrl: "https://rakhim.exotext.com/rss.xml", htmlUrl: "https://rakhim.exotext.com" },
  // { name: "joanwestenberg.com", xmlUrl: "https://joanwestenberg.com/rss", htmlUrl: "https://joanwestenberg.com" },
  { name: "xania.org", xmlUrl: "https://xania.org/feed", htmlUrl: "https://xania.org" },
  { name: "micahflee.com", xmlUrl: "https://micahflee.com/feed/", htmlUrl: "https://micahflee.com" },
  { name: "nesbitt.io", xmlUrl: "https://nesbitt.io/feed.xml", htmlUrl: "https://nesbitt.io" },
  // { name: "construction-physics.com", xmlUrl: "https://www.construction-physics.com/feed", htmlUrl: "https://construction-physics.com" },
  // { name: "tedium.co", xmlUrl: "https://feed.tedium.co/", htmlUrl: "https://tedium.co" },
  { name: "susam.net", xmlUrl: "https://susam.net/feed.xml", htmlUrl: "https://susam.net" },
  { name: "entropicthoughts.com", xmlUrl: "https://entropicthoughts.com/feed.xml", htmlUrl: "https://entropicthoughts.com" },
  { name: "buttondown.com/hillelwayne", xmlUrl: "https://buttondown.com/hillelwayne/rss", htmlUrl: "https://buttondown.com/hillelwayne" },
  { name: "dwarkesh.com", xmlUrl: "https://www.dwarkeshpatel.com/feed", htmlUrl: "https://dwarkesh.com" },
  { name: "borretti.me", xmlUrl: "https://borretti.me/feed.xml", htmlUrl: "https://borretti.me" },
  { name: "wheresyoured.at", xmlUrl: "https://www.wheresyoured.at/rss/", htmlUrl: "https://wheresyoured.at" },
  { name: "jayd.ml", xmlUrl: "https://jayd.ml/feed.xml", htmlUrl: "https://jayd.ml" },
  { name: "minimaxir.com", xmlUrl: "https://minimaxir.com/index.xml", htmlUrl: "https://minimaxir.com" },
  { name: "geohot.github.io", xmlUrl: "https://geohot.github.io/blog/feed.xml", htmlUrl: "https://geohot.github.io" },
  { name: "paulgraham.com", xmlUrl: "http://www.aaronsw.com/2002/feeds/pgessays.rss", htmlUrl: "https://paulgraham.com" },
  { name: "filfre.net", xmlUrl: "https://www.filfre.net/feed/", htmlUrl: "https://filfre.net" },
  { name: "blog.jim-nielsen.com", xmlUrl: "https://blog.jim-nielsen.com/feed.xml", htmlUrl: "https://blog.jim-nielsen.com" },
  { name: "dfarq.homeip.net", xmlUrl: "https://dfarq.homeip.net/feed/", htmlUrl: "https://dfarq.homeip.net" },
  { name: "jyn.dev", xmlUrl: "https://jyn.dev/atom.xml", htmlUrl: "https://jyn.dev" },
  { name: "geoffreylitt.com", xmlUrl: "https://www.geoffreylitt.com/feed.xml", htmlUrl: "https://geoffreylitt.com" },
  // { name: "downtowndougbrown.com", xmlUrl: "https://www.downtowndougbrown.com/feed/", htmlUrl: "https://downtowndougbrown.com" },
  { name: "brutecat.com", xmlUrl: "https://brutecat.com/rss.xml", htmlUrl: "https://brutecat.com" },
  { name: "eli.thegreenplace.net", xmlUrl: "https://eli.thegreenplace.net/feeds/all.atom.xml", htmlUrl: "https://eli.thegreenplace.net" },
  { name: "abortretry.fail", xmlUrl: "https://www.abortretry.fail/feed", htmlUrl: "https://abortretry.fail" },
  { name: "fabiensanglard.net", xmlUrl: "https://fabiensanglard.net/rss.xml", htmlUrl: "https://fabiensanglard.net" },
  // { name: "oldvcr.blogspot.com", xmlUrl: "https://oldvcr.blogspot.com/feeds/posts/default", htmlUrl: "https://oldvcr.blogspot.com" },
  { name: "bogdanthegeek.github.io", xmlUrl: "https://bogdanthegeek.github.io/blog/index.xml", htmlUrl: "https://bogdanthegeek.github.io" },
  { name: "hugotunius.se", xmlUrl: "https://hugotunius.se/feed.xml", htmlUrl: "https://hugotunius.se" },
  { name: "gwern.net", xmlUrl: "https://gwern.substack.com/feed", htmlUrl: "https://gwern.net" },
  { name: "berthub.eu", xmlUrl: "https://berthub.eu/articles/index.xml", htmlUrl: "https://berthub.eu" },
  // { name: "chadnauseam.com", xmlUrl: "https://chadnauseam.com/rss.xml", htmlUrl: "https://chadnauseam.com" },
  // { name: "simone.org", xmlUrl: "https://simone.org/feed/", htmlUrl: "https://simone.org" },
  { name: "it-notes.dragas.net", xmlUrl: "https://it-notes.dragas.net/feed/", htmlUrl: "https://it-notes.dragas.net" },
  { name: "beej.us", xmlUrl: "https://beej.us/blog/rss.xml", htmlUrl: "https://beej.us" },
  // { name: "hey.paris", xmlUrl: "https://hey.paris/index.xml", htmlUrl: "https://hey.paris" },
  { name: "danielwirtz.com", xmlUrl: "https://danielwirtz.com/rss.xml", htmlUrl: "https://danielwirtz.com" },
  { name: "matduggan.com", xmlUrl: "https://matduggan.com/rss/", htmlUrl: "https://matduggan.com" },
  { name: "refactoringenglish.com", xmlUrl: "https://refactoringenglish.com/index.xml", htmlUrl: "https://refactoringenglish.com" },
  { name: "worksonmymachine.substack.com", xmlUrl: "https://worksonmymachine.substack.com/feed", htmlUrl: "https://worksonmymachine.substack.com" },
  // { name: "philiplaine.com", xmlUrl: "https://philiplaine.com/index.xml", htmlUrl: "https://philiplaine.com" },
  { name: "steveblank.com", xmlUrl: "https://steveblank.com/feed/", htmlUrl: "https://steveblank.com" },
  { name: "bernsteinbear.com", xmlUrl: "https://bernsteinbear.com/feed.xml", htmlUrl: "https://bernsteinbear.com" },
  { name: "danieldelaney.net", xmlUrl: "https://danieldelaney.net/feed", htmlUrl: "https://danieldelaney.net" },
  // { name: "troyhunt.com", xmlUrl: "https://www.troyhunt.com/rss/", htmlUrl: "https://troyhunt.com" },
  // { name: "herman.bearblog.dev", xmlUrl: "https://herman.bearblog.dev/feed/", htmlUrl: "https://herman.bearblog.dev" },
  // { name: "tomrenner.com", xmlUrl: "https://tomrenner.com/index.xml", htmlUrl: "https://tomrenner.com" },
  { name: "blog.pixelmelt.dev", xmlUrl: "https://blog.pixelmelt.dev/rss/", htmlUrl: "https://blog.pixelmelt.dev" },
  { name: "martinalderson.com", xmlUrl: "https://martinalderson.com/feed.xml", htmlUrl: "https://martinalderson.com" },
  { name: "danielchasehooper.com", xmlUrl: "https://danielchasehooper.com/feed.xml", htmlUrl: "https://danielchasehooper.com" },
  { name: "chiark.greenend.org.uk/~sgtatham", xmlUrl: "https://www.chiark.greenend.org.uk/~sgtatham/quasiblog/feed.xml", htmlUrl: "https://chiark.greenend.org.uk/~sgtatham" },
  // { name: "grantslatton.com", xmlUrl: "https://grantslatton.com/rss.xml", htmlUrl: "https://grantslatton.com" },
  // { name: "experimental-history.com", xmlUrl: "https://www.experimental-history.com/feed", htmlUrl: "https://experimental-history.com" },
  { name: "anildash.com", xmlUrl: "https://anildash.com/feed.xml", htmlUrl: "https://anildash.com" },
  { name: "aresluna.org", xmlUrl: "https://aresluna.org/main.rss", htmlUrl: "https://aresluna.org" },
  { name: "michael.stapelberg.ch", xmlUrl: "https://michael.stapelberg.ch/feed.xml", htmlUrl: "https://michael.stapelberg.ch" },
  { name: "miguelgrinberg.com", xmlUrl: "https://blog.miguelgrinberg.com/feed", htmlUrl: "https://miguelgrinberg.com" },
  { name: "keygen.sh", xmlUrl: "https://keygen.sh/blog/feed.xml", htmlUrl: "https://keygen.sh" },
  // { name: "mjg59.dreamwidth.org", xmlUrl: "https://mjg59.dreamwidth.org/data/rss", htmlUrl: "https://mjg59.dreamwidth.org" },
  { name: "computer.rip", xmlUrl: "https://computer.rip/rss.xml", htmlUrl: "https://computer.rip" },
  { name: "tedunangst.com", xmlUrl: "https://www.tedunangst.com/flak/rss", htmlUrl: "https://tedunangst.com" },
];

// X/Twitter feeds via RSSHub proxy
const RSSHUB_BASE_URL = (process.env.RSSHUB_BASE_URL || 'https://rsshub.app').replace(/\/+$/, '');
const X_ACCOUNTS = process.env.X_ACCOUNTS || '';

function buildXFeeds(): Array<{ name: string; xmlUrl: string; htmlUrl: string }> {
  if (!X_ACCOUNTS.trim()) return [];
  return X_ACCOUNTS.split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(account => ({
      name: `𝕏 @${account}`,
      xmlUrl: `${RSSHUB_BASE_URL}/twitter/user/${account}`,
      htmlUrl: `https://x.com/${account}`,
    }));
}

// ============================================================================
// Types
// ============================================================================

// 替换原有分类为新的AI分类体系
type CategoryId = 'chat-tts' | 'image-video' | 'music-generate' | 'ai-coding' | 'ai-cowork' | 'other-ai';

// 更新分类元数据
const CATEGORY_META: Record<CategoryId, { emoji: string; label: string }> = {
  'chat-tts':       { emoji: '🗣️', label: '聊天TTS模型' },
  'image-video':    { emoji: '🎨', label: '图像视频生成模型' },
  'music-generate': { emoji: '🎵', label: '音乐生成工具产品和模型' },
  'ai-coding':      { emoji: '💻', label: 'AIcoding(SDD)' },
  'ai-cowork':      { emoji: '📊', label: 'AIcowork(龙虾)' },
  'other-ai':       { emoji: '🔬', label: '其他AI技术' },
};

interface Article {
  title: string;
  link: string;
  pubDate: Date;
  description: string;
  sourceName: string;
  sourceUrl: string;
}

// 更新评分结构，适配新的5维度打分（1-5分）
interface ScoredArticle extends Article {
  score: number; // 总分（可由5个维度加权计算）
  scoreBreakdown: {
    practicality: number;    // 技术实用性
    deployability: number;  // 可落地性
    technicalValue: number; // 技术含金量
    timeliness: number;     // 时效性
    nonTechRedundancy: number; // 非技术冗余度
  };
  category: CategoryId;
  keywords: string[];
  titleZh: string;
  summary: string;
  reason: string;
}

// 更新Gemini评分结果类型
interface GeminiScoringResult {
  results: Array<{
    index: number;
    practicality: number;    // 技术实用性
    deployability: number;  // 可落地性
    technicalValue: number; // 技术含金量
    timeliness: number;     // 时效性
    nonTechRedundancy: number; // 非技术冗余度
    category: string;
    keywords: string[];
  }>;
}

interface GeminiSummaryResult {
  results: Array<{
    index: number;
    titleZh: string;
    summary: string;
    reason: string;
  }>;
}

interface AIClient {
  call(prompt: string): Promise<string>;
}

// ============================================================================
// RSS/Atom Parsing (using Bun's built-in HTMLRewriter or manual XML parsing)
// ============================================================================

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)))
    .trim();
}

function extractCDATA(text: string): string {
  const cdataMatch = text.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  return cdataMatch ? cdataMatch[1] : text;
}

function getTagContent(xml: string, tagName: string): string {
  // Handle namespaced and non-namespaced tags
  const patterns = [
    new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, 'i'),
    new RegExp(`<${tagName}[^>]*/>`, 'i'), // self-closing
  ];
  
  for (const pattern of patterns) {
    const match = xml.match(pattern);
    if (match?.[1]) {
      return extractCDATA(match[1]).trim();
    }
  }
  return '';
}

function getAttrValue(xml: string, tagName: string, attrName: string): string {
  const pattern = new RegExp(`<${tagName}[^>]*\\s${attrName}=["']([^"']*)["'][^>]*/?>`, 'i');
  const match = xml.match(pattern);
  return match?.[1] || '';
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  
  // Try common RSS date formats
  // RFC 822: "Mon, 01 Jan 2024 00:00:00 GMT"
  const rfc822 = dateStr.match(/(\d{1,2})\s+(\w{3})\s+(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (rfc822) {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  
  return null;
}

function parseRSSItems(xml: string): Array<{ title: string; link: string; pubDate: string; description: string }> {
  const items: Array<{ title: string; link: string; pubDate: string; description: string }> = [];
  
  // Detect format: Atom vs RSS
  const isAtom = xml.includes('<feed') && xml.includes('xmlns="http://www.w3.org/2005/Atom"') || xml.includes('<feed ');
  
  if (isAtom) {
    // Atom format: <entry>
    const entryPattern = /<entry[\s>]([\s\S]*?)<\/entry>/gi;
    let entryMatch;
    while ((entryMatch = entryPattern.exec(xml)) !== null) {
      const entryXml = entryMatch[1];
      const title = stripHtml(getTagContent(entryXml, 'title'));
      
      // Atom link: <link href="..." rel="alternate"/>
      let link = getAttrValue(entryXml, 'link[^>]*rel="alternate"', 'href');
      if (!link) {
        link = getAttrValue(entryXml, 'link', 'href');
      }
      
      const pubDate = getTagContent(entryXml, 'published') 
        || getTagContent(entryXml, 'updated');
      
      const description = stripHtml(
        getTagContent(entryXml, 'summary') 
        || getTagContent(entryXml, 'content')
      );
      
      if (title || link) {
        items.push({ title, link, pubDate, description: description.slice(0, 500) });
      }
    }
  } else {
    // RSS format: <item>
    const itemPattern = /<item[\s>]([\s\S]*?)<\/item>/gi;
    let itemMatch;
    while ((itemMatch = itemPattern.exec(xml)) !== null) {
      const itemXml = itemMatch[1];
      const title = stripHtml(getTagContent(itemXml, 'title'));
      const link = getTagContent(itemXml, 'link') || getTagContent(itemXml, 'guid');
      const pubDate = getTagContent(itemXml, 'pubDate') 
        || getTagContent(itemXml, 'dc:date')
        || getTagContent(itemXml, 'date');
      const description = stripHtml(
        getTagContent(itemXml, 'description') 
        || getTagContent(itemXml, 'content:encoded')
      );
      
      if (title || link) {
        items.push({ title, link, pubDate, description: description.slice(0, 500) });
      }
    }
  }
  
  return items;
}

// ============================================================================
// Feed Fetching
// ============================================================================

async function fetchFeed(feed: { name: string; xmlUrl: string; htmlUrl: string }): Promise<Article[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FEED_FETCH_TIMEOUT_MS);
    
    const response = await fetch(feed.xmlUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'AI-Daily-Digest/1.0 (RSS Reader)',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      },
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const xml = await response.text();
    const items = parseRSSItems(xml);
    
    return items.map(item => ({
      title: item.title,
      link: item.link,
      pubDate: parseDate(item.pubDate) || new Date(0),
      description: item.description,
      sourceName: feed.name,
      sourceUrl: feed.htmlUrl,
    }));
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    // Only log non-abort errors to reduce noise
    if (!msg.includes('abort')) {
      console.warn(`[digest] ✗ ${feed.name}: ${msg}`);
    } else {
      console.warn(`[digest] ✗ ${feed.name}: timeout`);
    }
    return [];
  }
}

async function fetchAllFeeds(feeds: typeof RSS_FEEDS): Promise<Article[]> {
  const allArticles: Article[] = [];
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < feeds.length; i += FEED_CONCURRENCY) {
    const batch = feeds.slice(i, i + FEED_CONCURRENCY);
    const results = await Promise.allSettled(batch.map(fetchFeed));
    
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.length > 0) {
        allArticles.push(...result.value);
        successCount++;
      } else {
        failCount++;
      }
    }
    
    const progress = Math.min(i + FEED_CONCURRENCY, feeds.length);
    console.log(`[digest] Progress: ${progress}/${feeds.length} feeds processed (${successCount} ok, ${failCount} failed)`);
  }
  
  console.log(`[digest] Fetched ${allArticles.length} articles from ${successCount} feeds (${failCount} failed)`);
  return allArticles;
}

// ============================================================================
// AI Providers (直接用网易伏羲替换 Gemini)
// ============================================================================

// 删除原有 callGemini 函数（整段移除）

// 保留 callOpenAICompatible 函数（完全复用，因为网易伏羲兼容该逻辑）
async function callOpenAICompatible(
  prompt: string,
  apiKey: string,
  apiBase: string,
  model: string
): Promise<string> {
  // 函数内容完全不变（网易伏羲兼容 OpenAI 协议）
  const normalizedBase = apiBase.replace(/\/+$/, '');
  const response = await fetch(`${normalizedBase}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`, // 网易伏羲通常用 Bearer + API Key
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      top_p: 0.8,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`OpenAI-compatible API error (${response.status}): ${errorText}`);
  }

  const data = await response.json() as {
    choices?: Array<{
      message?: {
        content?: string | Array<{ type?: string; text?: string }>;
      };
    }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter(item => item.type === 'text' && typeof item.text === 'string')
      .map(item => item.text)
      .join('\n');
  }
  return '';
}

// 保留 inferOpenAIModel 函数（不变）
function inferOpenAIModel(apiBase: string): string {
  const base = apiBase.toLowerCase();
  if (base.includes('deepseek')) return 'deepseek-chat';
  return OPENAI_DEFAULT_MODEL;
}

// 修改 createAIClient：用网易伏羲替换 Gemini
function createAIClient(config: {
  neteaseApiKey?: string;
  openaiApiKey?: string;
  openaiApiBase?: string;
  openaiModel?: string;
}): AIClient {
  const state = {
    // 核心：网易伏羲配置（替代原本的 Gemini）
    neteaseApiKey: config.neteaseApiKey?.trim() || '',
    neteaseApiBase: NETEASE_FUXI_API_BASE,
    neteaseModel: NETEASE_FUXI_MODEL,
    // 保留 OpenAI 兜底（可选）
    openaiApiKey: config.openaiApiKey?.trim() || '',
    openaiApiBase: (config.openaiApiBase?.trim() || OPENAI_DEFAULT_API_BASE).replace(/\/+$/, ''),
    openaiModel: config.openaiModel?.trim() || inferOpenAIModel(config.openaiApiBase || ''),
    fallbackLogged: false,
  };

  return {
    async call(prompt: string): Promise<string> {
      // 优先调用网易伏羲（替代原本的 Gemini 优先级）
      if (state.neteaseApiKey) {
        try {
          return await callOpenAICompatible(
            prompt,
            state.neteaseApiKey,
            state.neteaseApiBase,
            state.neteaseModel
          );
        } catch (error) {
          console.warn(`[digest] 网易伏羲调用失败: ${error instanceof Error ? error.message : String(error)}`);
          // 降级到 OpenAI（可选）
          if (state.openaiApiKey) {
            return callOpenAICompatible(prompt, state.openaiApiKey, state.openaiApiBase, state.openaiModel);
          }
          throw error;
        }
      }

      // 原有 OpenAI 兜底逻辑（不变）
      if (state.openaiApiKey) {
        return callOpenAICompatible(prompt, state.openaiApiKey, state.openaiApiBase, state.openaiModel);
      }

      throw new Error('未配置AI密钥！请设置 NETEASE_API_KEY（网易伏羲）或 OPENAI_API_KEY');
    },
  };
}

function parseJsonResponse<T>(text: string): T {
  let jsonText = text.trim();
  // Strip markdown code blocks if present
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  return JSON.parse(jsonText) as T;
}

// ============================================================================
// AI Scoring
// ============================================================================

// 更新评分提示词，适配新的分类和打分标准
function buildScoringPrompt(articles: Array<{ index: number; title: string; description: string; sourceName: string }>): string {
  const articlesList = articles.map(a =>
    `Index ${a.index}: [${a.sourceName}] ${a.title}\n${a.description.slice(0, 300)}`
  ).join('\n\n---\n\n');

  return `你是一个AI技术内容策展人，正在为一份面向AI开发者的每日精选摘要筛选文章。

请对以下文章进行五个维度的评分（1-5 整数，5 分最高），并为每篇文章分配一个分类标签和提取 2-4 个关键词。

## 评分维度（每个维度1-5分，5分最高）

### 1. 技术实用性 (practicality)
- 5分：提供可直接使用的工具/模型/代码/方案，对开发有重大实际帮助
- 4分：提供可直接使用的工具/模型/代码/方案，对开发有较大实际帮助
- 3分：提供可直接使用的工具/模型/代码/方案，对开发有一定实际帮助
- 2分：提供的内容有潜在实用价值，但需二次开发才能使用
- 1分：无直接可用内容，仅理论探讨，注意，如果文章内容与AI无关，则直接打1分

### 2. 可落地性 (deployability)
- 5分：可快速接入、部署、调用、复现，文档完善，无技术门槛
- 4分：可接入、部署、调用、复现，文档较完善，技术门槛低
- 3分：可接入、部署、调用、复现，文档一般，有一定技术门槛
- 2分：理论上可落地，但缺乏文档/示例，技术门槛较高
- 1分：难以落地，仅停留在理论层面，注意，如果文章内容与AI无关，则直接打1分

### 3. 技术含金量 (technicalValue)
- 5分：包含核心原理、详细实现细节、性能对比、踩坑点等深度内容
- 4分：包含原理、实现细节、性能数据等较深度内容
- 3分：包含基本原理和实现思路，有一定技术深度
- 2分：仅介绍表面功能，无核心原理/细节
- 1分：纯科普/介绍，无技术细节，注意，如果文章内容与AI无关，则直接打1分

### 4. 时效性 (timeliness)
- 5分：近7天内新发布/新更新的技术，行业热点
- 4分：近30天内新发布/新更新的技术，有一定热度
- 3分：近90天内发布/更新的技术，仍有参考价值
- 2分：超过90天的技术，但仍有一定时效性
- 1分：过时技术，无时效价值，注意，如果文章内容与AI无关，则直接打1分

### 5. 非技术冗余度 (nonTechRedundancy)
- 5分：无任何商业资讯、八卦、无关赛道内容，纯技术干货
- 4分：极少商业资讯/八卦，90%以上为纯技术干货
- 3分：少量商业资讯/八卦，80%以上为纯技术干货
- 2分：较多商业资讯/八卦，50%-80%为技术内容
- 1分：大量商业资讯/八卦，技术内容占比低于50%，注意，如果文章内容与AI无关，则直接打1分

## 分类标签（必须从以下选一个）
- chat-tts: 聊天TTS模型（包含大语言模型（LLM）、对话Agent、聊天机器人、语音合成（TTS）、语音识别（ASR）、口语生成、语音交互、多轮对话、音色迁移、语音助手等相关技术与应用）
- image-video: 图像视频生成模型（包含文生图、图生图、图像超分、图像修复、文生视频、视频生成、AIGC视觉、扩散模型、图像编辑、目标检测、图像理解、姿态/深度/分割等视觉类技术）
- music-generate: 音乐生成工具产品和模型（包含AI音乐生成、歌声合成、旋律/编曲/配乐生成、音频生成、音乐大模型、音乐创作辅助工具、音乐类AI产品等相关内容）
- ai-coding: AICoding(SDD)（包含代码生成、代码补全、代码理解、代码审查、自动编程、低代码 / 无代码 AI 辅助、AI 编程助手、代码解释、测试用例生成、编程类大模型、代码专用 LLM、面向开发者的 AI 模型、Claude、GPT 系列、SDD 等用于编程 / 开发场景的 AI 模型）
- ai-cowork: AIcowork(龙虾)（包含 AI 协同办公、文档智能处理、会议总结、知识库问答、办公自动化（RPA+AI）、企业协作工具、工作流 AI 优化、知识管理、办公效率类 AI 工具、OpenClaw（龙虾）相关等）
- other-ai: 其他AI技术（不属于上述5个类别的AI技术内容，包括但不限于AI基础算法（无具体应用场景）、AI伦理/政策、AI教育、通用AI理论、非上述领域的AI工具/模型等）

## 关键词提取
提取 2-4 个最能代表文章主题的关键词（用英文，简短，如 "LLM", "TTS", "Stable Diffusion", "AI Coding"）

## 待评分文章

${articlesList}

请严格按 JSON 格式返回，不要包含 markdown 代码块或其他文字：
{
  "results": [
    {
      "index": 0,
      "practicality": 5,
      "deployability": 4,
      "technicalValue": 5,
      "timeliness": 4,
      "nonTechRedundancy": 5,
      "category": "chat-tts",
      "keywords": ["LLM", "TTS", "语音交互"]
    }
  ]
}`;
}

async function scoreArticlesWithAI(
  articles: Article[],
  aiClient: AIClient
): Promise<Map<number, { 
  score: number; // ✓ 添加总分
  practicality: number;
  deployability: number;
  technicalValue: number;
  timeliness: number;
  nonTechRedundancy: number;
  category: CategoryId;
  keywords: string[];
}>> {
const allScores = new Map<number, { 
  score: number;  // ✅ 添加
  practicality: number;
  deployability: number;
  technicalValue: number;
  timeliness: number;
  nonTechRedundancy: number;
  category: CategoryId;
  keywords: string[];
}>();
  
  const indexed = articles.map((article, index) => ({
    index,
    title: article.title,
    description: article.description,
    sourceName: article.sourceName,
  }));
  
  const batches: typeof indexed[] = [];
  for (let i = 0; i < indexed.length; i += GEMINI_BATCH_SIZE) {
    batches.push(indexed.slice(i, i + GEMINI_BATCH_SIZE));
  }
  
  console.log(`[digest] AI scoring: ${articles.length} articles in ${batches.length} batches`);
  
  // 更新有效分类集合
  const validCategories = new Set<string>(['chat-tts', 'image-video', 'music-generate', 'ai-coding', 'ai-cowork', 'other-ai']);
  
  for (let i = 0; i < batches.length; i += MAX_CONCURRENT_GEMINI) {
    const batchGroup = batches.slice(i, i + MAX_CONCURRENT_GEMINI);
    const promises = batchGroup.map(async (batch) => {
      try {
        const prompt = buildScoringPrompt(batch);
        const responseText = await aiClient.call(prompt);
        const parsed = parseJsonResponse<GeminiScoringResult>(responseText);
        
        if (parsed.results && Array.isArray(parsed.results)) {
          for (const result of parsed.results) {
            // 修正分数范围为1-5
            const clamp = (v: number) => Math.min(5, Math.max(1, Math.round(v)));
            const cat = (validCategories.has(result.category) ? result.category : 'other-ai') as CategoryId;
            // ✓ 计算总分（5个维度等权重或加权）
            const totalScore = 
              clamp(result.practicality) * 1.0 +
              clamp(result.deployability) * 1.0 +
              clamp(result.technicalValue) * 1.0 +
              clamp(result.timeliness) * 1.0 +
              clamp(result.nonTechRedundancy) * 1.0;
            
            allScores.set(result.index, {
              score: totalScore, // ✓ 存储总分
              practicality: clamp(result.practicality),
              deployability: clamp(result.deployability),
              technicalValue: clamp(result.technicalValue),
              timeliness: clamp(result.timeliness),
              nonTechRedundancy: clamp(result.nonTechRedundancy),
              category: cat,
              keywords: Array.isArray(result.keywords) ? result.keywords.slice(0, 4) : [],
            });
          }
        }
      } catch (error) {
        console.warn(`[digest] Scoring batch failed: ${error instanceof Error ? error.message : String(error)}`);
        for (const item of batch) {
          // 默认分数改为3分（1-5分中间值）
          allScores.set(item.index, { 
            score: 15,  // ✅ 添加默认总分
            practicality: 3,
            deployability: 3,
            technicalValue: 3,
            timeliness: 3,
            nonTechRedundancy: 3,
            category: 'other-ai',
            keywords: [] 
          });
        }
      }
    });
    
    await Promise.all(promises);
    console.log(`[digest] Scoring progress: ${Math.min(i + MAX_CONCURRENT_GEMINI, batches.length)}/${batches.length} batches`);
  }
  
  return allScores;
}

// ============================================================================
// AI Summarization
// ============================================================================

function buildSummaryPrompt(
  articles: Array<{ index: number; title: string; description: string; sourceName: string; link: string }>,
  lang: 'zh' | 'en'
): string {
  const articlesList = articles.map(a =>
    `Index ${a.index}: [${a.sourceName}] ${a.title}\nURL: ${a.link}\n${a.description.slice(0, 800)}`
  ).join('\n\n---\n\n');

  const langInstruction = lang === 'zh'
    ? '请用中文撰写摘要和推荐理由。如果原文是英文，请翻译为中文。标题翻译也用中文。'
    : 'Write summaries, reasons, and title translations in English.';

  return `你是一个技术内容摘要专家。请为以下文章完成三件事：

1. **中文标题** (titleZh): 将英文标题翻译成自然的中文。如果原标题已经是中文则保持不变。
2. **摘要** (summary): 4-6 句话的结构化摘要，让读者不点进原文也能了解核心内容。包含：
   - 文章讨论的核心问题或主题（1 句）
   - 关键论点、技术方案或发现（2-3 句）
   - 结论或作者的核心观点（1 句）
3. **推荐理由** (reason): 1 句话说明"为什么值得读"，区别于摘要（摘要说"是什么"，推荐理由说"为什么"）。

${langInstruction}

摘要要求：
- 直接说重点，不要用"本文讨论了..."、"这篇文章介绍了..."这种开头
- 包含具体的技术名词、数据、方案名称或观点
- 保留关键数字和指标（如性能提升百分比、用户数、版本号等）
- 如果文章涉及对比或选型，要点出比较对象和结论
- 目标：读者花 30 秒读完摘要，就能决定是否值得花 10 分钟读原文

## 待摘要文章

${articlesList}

请严格按 JSON 格式返回：
{
  "results": [
    {
      "index": 0,
      "titleZh": "中文翻译的标题",
      "summary": "摘要内容...",
      "reason": "推荐理由..."
    }
  ]
}`;
}

async function summarizeArticles(
  articles: Array<Article & { index: number }>,
  aiClient: AIClient,
  lang: 'zh' | 'en'
): Promise<Map<number, { titleZh: string; summary: string; reason: string }>> {
  const summaries = new Map<number, { titleZh: string; summary: string; reason: string }>();
  
  const indexed = articles.map(a => ({
    index: a.index,
    title: a.title,
    description: a.description,
    sourceName: a.sourceName,
    link: a.link,
  }));
  
  const batches: typeof indexed[] = [];
  for (let i = 0; i < indexed.length; i += GEMINI_BATCH_SIZE) {
    batches.push(indexed.slice(i, i + GEMINI_BATCH_SIZE));
  }
  
  console.log(`[digest] Generating summaries for ${articles.length} articles in ${batches.length} batches`);
  
  for (let i = 0; i < batches.length; i += MAX_CONCURRENT_GEMINI) {
    const batchGroup = batches.slice(i, i + MAX_CONCURRENT_GEMINI);
    const promises = batchGroup.map(async (batch) => {
      try {
        const prompt = buildSummaryPrompt(batch, lang);
        const responseText = await aiClient.call(prompt);
        const parsed = parseJsonResponse<GeminiSummaryResult>(responseText);
        
        if (parsed.results && Array.isArray(parsed.results)) {
          for (const result of parsed.results) {
            summaries.set(result.index, {
              titleZh: result.titleZh || '',
              summary: result.summary || '',
              reason: result.reason || '',
            });
          }
        }
      } catch (error) {
        console.warn(`[digest] Summary batch failed: ${error instanceof Error ? error.message : String(error)}`);
        for (const item of batch) {
          summaries.set(item.index, { titleZh: item.title, summary: item.title, reason: '' });
        }
      }
    });
    
    await Promise.all(promises);
    console.log(`[digest] Summary progress: ${Math.min(i + MAX_CONCURRENT_GEMINI, batches.length)}/${batches.length} batches`);
  }
  
  return summaries;
}

// ============================================================================
// AI Highlights (Today's Trends)
// ============================================================================

async function generateHighlights(
  articles: ScoredArticle[],
  aiClient: AIClient,
  lang: 'zh' | 'en'
): Promise<string> {
  const articleList = articles.slice(0, 10).map((a, i) =>
    `${i + 1}. [${a.category}] ${a.titleZh || a.title} — ${a.summary.slice(0, 100)}`
  ).join('\n');

  const langNote = lang === 'zh' ? '用中文回答。' : 'Write in English.';

  const prompt = `根据以下今日精选技术文章列表，写一段 3-5 句话的"今日看点"总结。
要求：
- 提炼出今天技术圈的 2-3 个主要趋势或话题
- 不要逐篇列举，要做宏观归纳
- 风格简洁有力，像新闻导语
${langNote}

文章列表：
${articleList}

直接返回纯文本总结，不要 JSON，不要 markdown 格式。`;

  try {
    const text = await aiClient.call(prompt);
    return text.trim();
  } catch (error) {
    console.warn(`[digest] Highlights generation failed: ${error instanceof Error ? error.message : String(error)}`);
    return '';
  }
}

// ============================================================================
// Visualization Helpers
// ============================================================================

function humanizeTime(pubDate: Date): string {
  const diffMs = Date.now() - pubDate.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 60) return `${diffMins} 分钟前`;
  if (diffHours < 24) return `${diffHours} 小时前`;
  if (diffDays < 7) return `${diffDays} 天前`;
  return pubDate.toISOString().slice(0, 10);
}

function generateKeywordBarChart(articles: ScoredArticle[]): string {
  const kwCount = new Map<string, number>();
  for (const a of articles) {
    for (const kw of a.keywords) {
      const normalized = kw.toLowerCase();
      kwCount.set(normalized, (kwCount.get(normalized) || 0) + 1);
    }
  }

  const sorted = Array.from(kwCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  if (sorted.length === 0) return '';

  const labels = sorted.map(([k]) => `"${k}"`).join(', ');
  const values = sorted.map(([, v]) => v).join(', ');
  const maxVal = sorted[0][1];

  let chart = '```mermaid\n';
  chart += `xychart-beta horizontal\n`;
  chart += `    title "高频关键词"\n`;
  chart += `    x-axis [${labels}]\n`;
  chart += `    y-axis "出现次数" 0 --> ${maxVal + 2}\n`;
  chart += `    bar [${values}]\n`;
  chart += '```\n';

  return chart;
}

function generateCategoryPieChart(articles: ScoredArticle[]): string {
  const catCount = new Map<CategoryId, number>();
  for (const a of articles) {
    catCount.set(a.category, (catCount.get(a.category) || 0) + 1);
  }

  if (catCount.size === 0) return '';

  const sorted = Array.from(catCount.entries()).sort((a, b) => b[1] - a[1]);

  let chart = '```mermaid\n';
  chart += `pie showData\n`;
  chart += `    title "文章分类分布"\n`;
  for (const [cat, count] of sorted) {
    const meta = CATEGORY_META[cat];
    chart += `    "${meta.emoji} ${meta.label}" : ${count}\n`;
  }
  chart += '```\n';

  return chart;
}

function generateAsciiBarChart(articles: ScoredArticle[]): string {
  const kwCount = new Map<string, number>();
  for (const a of articles) {
    for (const kw of a.keywords) {
      const normalized = kw.toLowerCase();
      kwCount.set(normalized, (kwCount.get(normalized) || 0) + 1);
    }
  }

  const sorted = Array.from(kwCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (sorted.length === 0) return '';

  const maxVal = sorted[0][1];
  const maxBarWidth = 20;
  const maxLabelLen = Math.max(...sorted.map(([k]) => k.length));

  let chart = '```\n';
  for (const [label, value] of sorted) {
    const barLen = Math.max(1, Math.round((value / maxVal) * maxBarWidth));
    const bar = '█'.repeat(barLen) + '░'.repeat(maxBarWidth - barLen);
    chart += `${label.padEnd(maxLabelLen)} │ ${bar} ${value}\n`;
  }
  chart += '```\n';

  return chart;
}

function generateTagCloud(articles: ScoredArticle[]): string {
  const kwCount = new Map<string, number>();
  for (const a of articles) {
    for (const kw of a.keywords) {
      const normalized = kw.toLowerCase();
      kwCount.set(normalized, (kwCount.get(normalized) || 0) + 1);
    }
  }

  const sorted = Array.from(kwCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  if (sorted.length === 0) return '';

  return sorted
    .map(([word, count], i) => i < 3 ? `**${word}**(${count})` : `${word}(${count})`)
    .join(' · ');
}

// ============================================================================
// Report Generation
// ============================================================================

function generateDigestReport(articles: ScoredArticle[], highlights: string, stats: {
  totalFeeds: number;
  successFeeds: number;
  totalArticles: number;
  filteredArticles: number;
  hours: number;
  lang: string;
}): string {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  
  let report = `# 📰 AI 博客每日精选 — ${dateStr}\n\n`;
  report += `> 来自 ${stats.totalFeeds} 个技术博客和社交媒体源，AI 精选 Top ${articles.length}\n\n`;

  // ── Today's Highlights ──
  if (highlights) {
    report += `## 📝 今日看点\n\n`;
    report += `${highlights}\n\n`;
    report += `---\n\n`;
  }

  // ── Top 3 Deep Showcase ──
  if (articles.length >= 3) {
    report += `## 🏆 今日必读\n\n`;
    for (let i = 0; i < Math.min(5, articles.length); i++) {
      const a = articles[i];
      const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][i];
      const catMeta = CATEGORY_META[a.category];
      
      report += `${medal} **${a.titleZh || a.title}**\n\n`;
      report += `[${a.title}](${a.link}) — ${a.sourceName} · ${humanizeTime(a.pubDate)} · ${catMeta.emoji} ${catMeta.label}\n\n`;
      report += `> ${a.summary}\n\n`;
      if (a.reason) {
        report += `💡 **为什么值得读**: ${a.reason}\n\n`;
      }
      if (a.keywords.length > 0) {
        report += `🏷️ ${a.keywords.join(', ')}\n\n`;
      }
    }
    report += `---\n\n`;
  }

  // ── Visual Statistics ──
  report += `## 📊 数据概览\n\n`;

  report += `| 扫描源 | 抓取文章 | 时间范围 | 精选 |\n`;
  report += `|:---:|:---:|:---:|:---:|\n`;
  report += `| ${stats.successFeeds}/${stats.totalFeeds} | ${stats.totalArticles} 篇 → ${stats.filteredArticles} 篇 | ${stats.hours}h | **${articles.length} 篇** |\n\n`;

  const pieChart = generateCategoryPieChart(articles);
  if (pieChart) {
    report += `### 分类分布\n\n${pieChart}\n`;
  }

  const barChart = generateKeywordBarChart(articles);
  if (barChart) {
    report += `### 高频关键词\n\n${barChart}\n`;
  }

  const asciiChart = generateAsciiBarChart(articles);
  if (asciiChart) {
    report += `<details>\n<summary>📈 纯文本关键词图（终端友好）</summary>\n\n${asciiChart}\n</details>\n\n`;
  }

  const tagCloud = generateTagCloud(articles);
  if (tagCloud) {
    report += `### 🏷️ 话题标签\n\n${tagCloud}\n\n`;
  }

  report += `---\n\n`;

  // ── Category-Grouped Articles ──
  report += `====================\n\n`;  // 分割区域
  const categoryGroups = new Map<CategoryId, ScoredArticle[]>();
  for (const a of articles) {
    const list = categoryGroups.get(a.category) || [];
    list.push(a);
    categoryGroups.set(a.category, list);
  }

  const sortedCategories = Array.from(categoryGroups.entries())
    .sort((a, b) => b[1].length - a[1].length);

  let globalIndex = 0;
  for (const [catId, catArticles] of sortedCategories) {
    const catMeta = CATEGORY_META[catId];
    report += `## ${catMeta.emoji} ${catMeta.label}\n\n`;

    for (const a of catArticles) {
      globalIndex++;
      const scoreTotal = a.score;

      report += `### ${globalIndex}. ${a.titleZh || a.title}\n\n`;
      report += `[${a.title}](${a.link}) — **${a.sourceName}** · ${humanizeTime(a.pubDate)} · ⭐ ${scoreTotal}/25\n\n`;
      report += `> ${a.summary}\n\n`;
      if (a.keywords.length > 0) {
        report += `🏷️ ${a.keywords.join(', ')}\n\n`;
      }
      report += `📌 ${catMeta.label}\n\n`;
      report += `---\n\n`;
    }
  }

  // ── Footer ──
  report += `====================\n\n`;  // 分割区域
  report += `*生成于 ${dateStr} ${now.toISOString().split('T')[1]?.slice(0, 5) || ''} | 扫描 ${stats.successFeeds} 源 → 获取 ${stats.totalArticles} 篇 → 精选 ${articles.length} 篇*\n`;
  report += `*基于 [Hacker News Popularity Contest 2025](https://refactoringenglish.com/tools/hn-popularity/) RSS 源列表，由 [Andrej Karpathy](https://x.com/karpathy) 推荐*\n`;
  report += `*由「懂点儿AI」制作，欢迎关注同名微信公众号获取更多 AI 实用技巧 💡*\n`;

  return report;
}

// ============================================================================
// CLI
// ============================================================================

function printUsage(): never {
  console.log(`AI Daily Digest - AI-powered RSS digest from 90 top tech blogs

Usage:
  bun scripts/digest.ts [options]

Options:
  --hours <n>     Time range in hours (default: 48)
  --top-n <n>     Number of top articles to include (default: 15)
  --lang <lang>   Summary language: zh or en (default: zh)
  --output <path> Output file path (default: ./digest-YYYYMMDD.md)
  --help          Show this help

Environment:
  GEMINI_API_KEY   Optional but recommended. Get one at https://aistudio.google.com/apikey
  OPENAI_API_KEY   Optional fallback key for OpenAI-compatible APIs
  OPENAI_API_BASE  Optional fallback base URL (default: https://api.openai.com/v1)
  OPENAI_MODEL     Optional fallback model (default: deepseek-chat for DeepSeek base, else gpt-4o-mini)
  RSSHUB_BASE_URL  RSSHub instance URL for X/Twitter feeds (default: https://rsshub.app)
  X_ACCOUNTS       Comma-separated X/Twitter accounts to follow (e.g. karpathy,sama,ylecun)

Examples:
  bun scripts/digest.ts --hours 24 --top-n 10 --lang zh
  bun scripts/digest.ts --hours 72 --top-n 20 --lang en --output ./my-digest.md
`);
  process.exit(0);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) printUsage();
  
  let hours = 48;
  let topN = 15;
  let lang: 'zh' | 'en' = 'zh';
  let outputPath = '';
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '--hours' && args[i + 1]) {
      hours = parseInt(args[++i]!, 10);
    } else if (arg === '--top-n' && args[i + 1]) {
      topN = parseInt(args[++i]!, 10);
    } else if (arg === '--lang' && args[i + 1]) {
      lang = args[++i] as 'zh' | 'en';
    } else if (arg === '--output' && args[i + 1]) {
      outputPath = args[++i]!;
    }
  }
  
  const neteaseApiKey = process.env.NETEASE_FUXI_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const openaiApiBase = process.env.OPENAI_API_BASE;
  const openaiModel = process.env.OPENAI_MODEL;

  // 关键：更新校验逻辑，检查 neteaseApiKey
  if (!neteaseApiKey && !openaiApiKey) {
    console.error('[digest] Error: Missing API key. Set NETEASE_FUXI_API_KEY and/or OPENAI_API_KEY.');
    console.error('[digest] 网易伏羲密钥获取：https://fuxi.netease.com/（替换为实际地址）');
    process.exit(1);
  }

  const aiClient = createAIClient({
    neteaseApiKey,
    openaiApiKey,
    openaiApiBase,
    openaiModel,
  });
  
  if (!outputPath) {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    outputPath = `./digest-${dateStr}.md`;
  }
  
  console.log(`[digest] === AI Daily Digest ===`);
  console.log(`[digest] Time range: ${hours} hours`);
  console.log(`[digest] Top N: ${topN}`);
  console.log(`[digest] Language: ${lang}`);
  console.log(`[digest] Output: ${outputPath}`);
  console.log(`[digest] AI provider: ${neteaseApiKey ? 'neteasefuxi (primary)' : 'OpenAI-compatible (primary)'}`);
  if (openaiApiKey) {
    const resolvedBase = (openaiApiBase?.trim() || OPENAI_DEFAULT_API_BASE).replace(/\/+$/, '');
    const resolvedModel = openaiModel?.trim() || inferOpenAIModel(resolvedBase);
    console.log(`[digest] Fallback: ${resolvedBase} (model=${resolvedModel})`);
  }
  console.log('');

  const xFeeds = buildXFeeds();
  const allFeeds = [...RSS_FEEDS, ...xFeeds];
  if (xFeeds.length > 0) {
    console.log(`[digest] X/Twitter accounts: ${xFeeds.map(f => f.name).join(', ')} (via ${RSSHUB_BASE_URL})`);
  }

  console.log(`[digest] Step 1/5: Fetching ${allFeeds.length} feeds (${RSS_FEEDS.length} RSS + ${xFeeds.length} X)...`);
  const allArticles = await fetchAllFeeds(allFeeds);
  
  if (allArticles.length === 0) {
    console.error('[digest] Error: No articles fetched from any feed. Check network connection.');
    process.exit(1);
  }
  
  console.log(`[digest] Step 2/5: Filtering by time range (${hours} hours)...`);
  const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
  const recentArticles = allArticles.filter(a => a.pubDate.getTime() > cutoffTime.getTime());
  
  console.log(`[digest] Found ${recentArticles.length} articles within last ${hours} hours`);
  
  if (recentArticles.length === 0) {
    console.error(`[digest] Error: No articles found within the last ${hours} hours.`);
    console.error(`[digest] Try increasing --hours (e.g., --hours 168 for one week)`);
    process.exit(1);
  }
  
  console.log(`[digest] Step 3/5: AI scoring ${recentArticles.length} articles...`);
  const scores = await scoreArticlesWithAI(recentArticles, aiClient);
  
  // 适配新的5维度评分+新分类体系
  const scoredArticles = recentArticles.map((article, index) => {
    // 1. 修正默认值：旧字段→新5维度，分类 other → other-ai
    const score = scores.get(index) || { 
      practicality: 3,    // 新维度：技术实用性（默认3分）
      deployability: 3,   // 新维度：可落地性（默认3分）
      technicalValue: 3,  // 新维度：技术含金量（默认3分）
      timeliness: 3,      // 保留但归属新维度（默认3分）
      nonTechRedundancy: 3,// 新维度：非技术冗余度（默认3分）
      category: 'other-ai' as CategoryId, // 新分类默认值
      keywords: [] 
    };
  
    // 2. 修正总分计算：5维度加权求和（权重可根据需求调整）
    const totalScore = 
      score.practicality * 1.0 +    // 技术实用性
      score.deployability * 1.0 +   // 可落地性
      score.technicalValue * 1.0 +  // 技术含金量
      score.timeliness * 1.0 +      // 时效性
      score.nonTechRedundancy * 1.0;// 非技术冗余度
  
    return {
      ...article,
      totalScore: Math.round(totalScore), // 四舍五入为整数，方便排序
      breakdown: score,
    };
  });
  
  scoredArticles.sort((a, b) => b.totalScore - a.totalScore);
  const topArticles = scoredArticles.slice(0, topN);
  
  console.log(`[digest] Top ${topN} articles selected (score range: ${topArticles[topArticles.length - 1]?.totalScore || 0} - ${topArticles[0]?.totalScore || 0})`);
  
  console.log(`[digest] Step 4/5: Generating AI summaries...`);
  const indexedTopArticles = topArticles.map((a, i) => ({ ...a, index: i }));
  const summaries = await summarizeArticles(indexedTopArticles, aiClient, lang);
  
  // 3. 修正 finalArticles 的 scoreBreakdown 结构，对齐新接口
  const finalArticles: ScoredArticle[] = topArticles.map((a, i) => {
  const sm = summaries.get(i) || { titleZh: a.title, summary: a.description.slice(0, 200), reason: '' };
  return {
    title: a.title,
    link: a.link,
    pubDate: a.pubDate,
    description: a.description,
    sourceName: a.sourceName,
    sourceUrl: a.sourceUrl,
    score: a.totalScore, // ✓ 从已计算的totalScore来
    scoreBreakdown: {
      practicality: a.breakdown.practicality,
      deployability: a.breakdown.deployability,
      technicalValue: a.breakdown.technicalValue,
      timeliness: a.breakdown.timeliness,
      nonTechRedundancy: a.breakdown.nonTechRedundancy,
    },
    category: a.breakdown.category,
    keywords: a.breakdown.keywords,
    titleZh: sm.titleZh,
    summary: sm.summary,
    reason: sm.reason,
  };
});
  
  console.log(`[digest] Step 5/5: Generating today's highlights...`);
  const highlights = await generateHighlights(finalArticles, aiClient, lang);
  
  const successfulSources = new Set(allArticles.map(a => a.sourceName));
  
  const report = generateDigestReport(finalArticles, highlights, {
    totalFeeds: allFeeds.length,
    successFeeds: successfulSources.size,
    totalArticles: allArticles.length,
    filteredArticles: recentArticles.length,
    hours,
    lang,
  });
  
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, report);
  
  console.log('');
  console.log(`[digest] ✅ Done!`);
  console.log(`[digest] 📁 Report: ${outputPath}`);
  console.log(`[digest] 📊 Stats: ${successfulSources.size} sources → ${allArticles.length} articles → ${recentArticles.length} recent → ${finalArticles.length} selected`);
  
  if (finalArticles.length > 0) {
    console.log('');
    console.log(`[digest] 🏆 Top 3 Preview:`);
    for (let i = 0; i < Math.min(3, finalArticles.length); i++) {
      const a = finalArticles[i];
      console.log(`  ${i + 1}. ${a.titleZh || a.title}`);
      console.log(`     ${a.summary.slice(0, 80)}...`);
    }
  }
}

await main().catch((err) => {
  console.error(`[digest] Fatal error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
