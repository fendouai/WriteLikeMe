/**
 * Browser-side service adapter.
 *
 * The desktop app exposes real RSS / Search / LLM calls through the Electron
 * main process (`electron/services.cjs`). When the same React app runs inside a
 * plain browser (e.g. `npm run dev` at localhost:5173) that bridge is absent,
 * and until now every "real" button silently fell back to local placeholder
 * rules — which is why the news pool showed fake example.com URLs.
 *
 * This module gives the browser the same capabilities via direct `fetch`:
 *  - RSS aggregation goes through a CORS proxy (best-effort, falls back to the
 *    local rules on any failure).
 *  - Search / LLM calls read API keys from localStorage (RuntimeConfig) and
 *    call the provider endpoints directly.
 *
 * `createBrowserService()` returns an object shaped exactly like
 * `window.writeLikeMeDesktop`, so App.tsx can treat desktop and browser
 * uniformly.
 */
import { refreshNewsAggregation, type NewsAggregation, type SourceInput } from './agentEngine';
import {
  loadRuntimeConfig,
  type LlmProviderKey,
  type RuntimeConfig,
  type SearchProviderKey,
} from './storage';

const corsProxy = 'https://api.allorigins.win/raw?url=';

const rssSources: { id: string; name: string; type: 'hotlist' | 'rss'; url: string }[] = [
  { id: 'hn', name: 'Hacker News', type: 'hotlist', url: 'https://hnrss.org/frontpage' },
  { id: 'github-trending', name: 'GitHub Trending', type: 'rss', url: 'https://mshibanami.github.io/GitHubTrendingRSS/daily/all.xml' },
  { id: 'product-hunt', name: 'Product Hunt', type: 'rss', url: 'https://www.producthunt.com/feed' },
  { id: 'lobsters', name: 'Lobsters', type: 'hotlist', url: 'https://lobste.rs/rss' },
  { id: 'techcrunch-ai', name: 'TechCrunch AI', type: 'rss', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
  { id: 'the-verge-ai', name: 'The Verge AI', type: 'rss', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml' },
  { id: 'ruanyifeng', name: '阮一峰周刊', type: 'rss', url: 'https://feeds.feedburner.com/ruanyifeng' },
];

const llmProviders: Record<LlmProviderKey, { name: string; url: string; model: string; type: 'openai' | 'anthropic' | 'gemini' }> = {
  openai: { name: 'OpenAI', url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini', type: 'openai' },
  anthropic: { name: 'Anthropic', url: 'https://api.anthropic.com/v1/messages', model: 'claude-3-5-haiku-latest', type: 'anthropic' },
  gemini: { name: 'Google Gemini', url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', model: 'gemini-1.5-flash', type: 'gemini' },
  deepseek: { name: 'DeepSeek', url: 'https://api.deepseek.com/chat/completions', model: 'deepseek-chat', type: 'openai' },
  openrouter: { name: 'OpenRouter', url: 'https://openrouter.ai/api/v1/chat/completions', model: 'openai/gpt-4o-mini', type: 'openai' },
  xai: { name: 'xAI', url: 'https://api.x.ai/v1/chat/completions', model: 'grok-3-mini', type: 'openai' },
  qwen: { name: 'Alibaba Qwen', url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', model: 'qwen-turbo', type: 'openai' },
  kimi: { name: 'Moonshot Kimi', url: 'https://api.moonshot.cn/v1/chat/completions', model: 'moonshot-v1-8k', type: 'openai' },
};

const searchProviders: Record<SearchProviderKey, { name: string; url: string }> = {
  tavily: { name: 'Tavily', url: 'https://api.tavily.com/search' },
  serper: { name: 'Serper', url: 'https://google.serper.dev/search' },
  brave: { name: 'Brave Search', url: 'https://api.search.brave.com/res/v1/web/search' },
  exa: { name: 'Exa', url: 'https://api.exa.ai/search' },
  bing: { name: 'Bing Search', url: 'https://api.bing.microsoft.com/v7.0/search' },
  googleCse: { name: 'Google CSE', url: 'https://www.googleapis.com/customsearch/v1' },
};

const stopWords = new Set([
  'the', 'and', 'for', 'that', 'this', 'with', 'from', 'have', 'will', 'your',
  'are', 'was', 'but', 'not', 'they', 'you', 'can', 'all', 'use', 'into',
]);

// ---------- RSS parsing (mirrors electron/services.cjs parseRss) ----------

export function stripTags(value: string): string {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function tagValue(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? stripTags(decodeXml(match[1])) : '';
}

export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    ['utm_source', 'utm_medium', 'utm_campaign', 'ref', 'source', '_t'].forEach((param) => parsed.searchParams.delete(param));
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return url;
  }
}

export function parseRss(xml: string, source: { id: string; name: string; type: 'hotlist' | 'rss'; url: string }, now: string) {
  const blocks = [...xml.matchAll(/<item[\s\S]*?<\/item>|<entry[\s\S]*?<\/entry>/gi)].map((match) => match[0]);
  return blocks.slice(0, 8).map((block, index) => {
    const title = tagValue(block, 'title');
    const link = tagValue(block, 'link') || (block.match(/<link[^>]+href=["']([^"']+)/i)?.[1] ?? source.url);
    const summary = tagValue(block, 'description') || tagValue(block, 'summary') || tagValue(block, 'content') || `${source.name} news item.`;
    return {
      id: `${source.id}:${normalizeUrl(link)}`,
      title,
      sourceId: source.id,
      sourceName: source.name,
      sourceType: source.type,
      url: link,
      rank: index + 1,
      firstSeenAt: now,
      lastSeenAt: now,
      seenCount: 1,
      isNew: true,
      relevance: Math.max(45, 96 - index * 4),
      summary: summary.slice(0, 240),
    };
  }).filter((item) => item.title && item.url);
}

// ---------- key helpers ----------

function readKeys(): { llm: Partial<Record<LlmProviderKey, string>>; search: Partial<Record<SearchProviderKey, string>> } {
  const config: RuntimeConfig = loadRuntimeConfig();
  return { llm: config.llmKeys, search: config.searchKeys };
}

function firstKey<T extends string>(keys: Partial<Record<T, string>>): { provider: T; key: string } | undefined {
  const entry = (Object.entries(keys) as [T, string][])
    .filter(([, value]) => Boolean(value))
    .sort(([a], [b]) => a.localeCompare(b))[0];
  return entry ? { provider: entry[0], key: entry[1] } : undefined;
}

// ---------- persistent usage / logs / budget (localStorage, mirrors desktop) ----------

const usageKey = 'wlm.usage';
const logsKey = 'wlm.logs';
const monthlyBudgetUsd = Number(localStorage.getItem('wlm.monthlyBudgetUsd') || 10);

type Usage = { calls: number; inputTokens: number; outputTokens: number; estimatedCostUsd: number; byProvider: Record<string, { calls: number; inputTokens: number; outputTokens: number; estimatedCostUsd: number }> };

function readUsage(): Usage {
  try {
    return JSON.parse(localStorage.getItem(usageKey) || '') as Usage;
  } catch {
    return { calls: 0, inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0, byProvider: {} };
  }
}

function writeUsage(usage: Usage): void {
  try {
    localStorage.setItem(usageKey, JSON.stringify(usage));
  } catch {
    // Storage unavailable (private mode): usage stays in-memory only.
  }
}

function updateUsage(delta: { provider?: string; calls?: number; inputTokens?: number; outputTokens?: number; estimatedCostUsd?: number }): Usage {
  const usage = readUsage();
  usage.calls += delta.calls || 0;
  usage.inputTokens += delta.inputTokens || 0;
  usage.outputTokens += delta.outputTokens || 0;
  usage.estimatedCostUsd = Number((usage.estimatedCostUsd + (delta.estimatedCostUsd || 0)).toFixed(6));
  if (delta.provider) {
    usage.byProvider[delta.provider] ||= { calls: 0, inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0 };
    usage.byProvider[delta.provider].calls += delta.calls || 0;
    usage.byProvider[delta.provider].inputTokens += delta.inputTokens || 0;
    usage.byProvider[delta.provider].outputTokens += delta.outputTokens || 0;
    usage.byProvider[delta.provider].estimatedCostUsd = Number((usage.byProvider[delta.provider].estimatedCostUsd + (delta.estimatedCostUsd || 0)).toFixed(6));
  }
  writeUsage(usage);
  return usage;
}

function assertBudgetAvailable(provider: string): void {
  const usage = readUsage();
  if (monthlyBudgetUsd > 0 && usage.estimatedCostUsd >= monthlyBudgetUsd) {
    throw new Error(`Monthly LLM budget reached: $${usage.estimatedCostUsd.toFixed(6)} / $${monthlyBudgetUsd}`);
  }
}

function readLogs(): unknown[] {
  try {
    return JSON.parse(localStorage.getItem(logsKey) || '[]') as unknown[];
  } catch {
    return [];
  }
}

function logOperation(entry: Record<string, unknown>): void {
  const logs = readLogs();
  logs.push({ at: new Date().toISOString(), ...entry });
  try {
    localStorage.setItem(logsKey, JSON.stringify(logs.slice(-200)));
  } catch {
    // Storage unavailable: logs stay transient.
  }
}

// Estimate cost per provider (mirrors desktop llmProviders pricing).
const llmPricing: Record<LlmProviderKey, { inputPer1M: number; outputPer1M: number }> = {
  openai: { inputPer1M: 0.15, outputPer1M: 0.6 },
  anthropic: { inputPer1M: 0.8, outputPer1M: 4 },
  gemini: { inputPer1M: 0.075, outputPer1M: 0.3 },
  deepseek: { inputPer1M: 0.27, outputPer1M: 1.1 },
  openrouter: { inputPer1M: 0.15, outputPer1M: 0.6 },
  xai: { inputPer1M: 0.3, outputPer1M: 0.5 },
  qwen: { inputPer1M: 0.05, outputPer1M: 0.2 },
  kimi: { inputPer1M: 1.7, outputPer1M: 1.7 },
};

function estimateCost(provider: LlmProviderKey, inputTokens: number, outputTokens: number): number {
  const pricing = llmPricing[provider];
  return (inputTokens / 1_000_000) * pricing.inputPer1M + (outputTokens / 1_000_000) * pricing.outputPer1M;
}

// ---------- retry (mirrors desktop withRetry) ----------

async function withRetry<T>(meta: Record<string, unknown>, fn: (attempt: number) => Promise<T>, retries = 1): Promise<T> {
  let lastError: unknown;
  const startedAt = Date.now();
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const result = await fn(attempt);
      logOperation({ ...meta, status: 'ok', attempt: attempt + 1, durationMs: Date.now() - startedAt });
      return result;
    } catch (error) {
      lastError = error;
      logOperation({ ...meta, status: attempt < retries ? 'retry' : 'failed', attempt: attempt + 1, error: error instanceof Error ? error.message : String(error) });
      if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
    }
  }
  throw lastError;
}

// ---------- fetch helpers ----------

const newsTimeoutMs = 12_000; // RSS aggregation can be slow through the CORS proxy.
const searchTimeoutMs = 6_000; // Search should feel snappy; fail fast and let the LLM proceed.
const llmTimeoutMs = 8_000; // Generation must not freeze the UI for a dozen seconds.

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 8_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function estimateTokens(text: string): number {
  return Math.ceil(String(text || '').length / 4);
}

function parseJsonObject(text: string): unknown {
  const trimmed = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('LLM did not return a JSON object');
  return JSON.parse(trimmed.slice(start, end + 1));
}

// ---------- public service API ----------

export type BrowserService = {
  getSecretStatus: () => Promise<{ encryptionAvailable: boolean; llm: Record<string, boolean>; search: Record<string, boolean> }>;
  saveSecret: (payload: { kind: 'llm' | 'search'; provider: string; value: string }) => Promise<{ encryptionAvailable: boolean; llm: Record<string, boolean>; search: Record<string, boolean> }>;
  refreshNews: (payload: { input: SourceInput; previous?: NewsAggregation }) => Promise<NewsAggregation>;
  search: (payload: { query: string; provider?: string }) => Promise<{ provider: string; results: { title: string; url: string; snippet: string }[] }>;
  generateText: (payload: { prompt: string; provider?: string }) => Promise<{ provider: string; model: string; text: string; usage: { inputTokens: number; outputTokens: number; estimatedCostUsd: number } }>;
  enhanceCampaign: (payload: { input: SourceInput; style: unknown; selectedAngleId?: string }) => Promise<Record<string, unknown>>;
  getLogs: (payload?: { limit?: number }) => Promise<unknown[]>;
  getUsage: () => Promise<{ calls: number; inputTokens: number; outputTokens: number; estimatedCostUsd: number; monthlyBudgetUsd: number; byProvider: Record<string, { calls: number; inputTokens: number; outputTokens: number; estimatedCostUsd: number }> }>;
};

export function createBrowserService(): BrowserService {
  return {
    async getSecretStatus() {
      const { llm, search } = readKeys();
      return {
        encryptionAvailable: false,
        llm: Object.fromEntries((Object.keys(llmProviders) as LlmProviderKey[]).map((provider) => [provider, Boolean(llm[provider])])),
        search: Object.fromEntries((Object.keys(searchProviders) as SearchProviderKey[]).map((provider) => [provider, Boolean(search[provider])])),
      };
    },

    async saveSecret({ kind, provider, value }) {
      // Keys live in localStorage via RuntimeConfig; App.tsx persists the typed field.
      // Returning the recomputed status keeps the settings banner accurate.
      return this.getSecretStatus();
    },

    async refreshNews({ input, previous }): Promise<NewsAggregation> {
      const now = new Date().toISOString();
      const settled = await Promise.allSettled(
        rssSources.map((source) =>
          withRetry({ type: 'news.fetch', provider: source.name }, async () => {
            const response = await fetchWithTimeout(`${corsProxy}${encodeURIComponent(source.url)}`, {
              headers: { accept: 'application/rss+xml, application/xml, text/xml, */*' },
            }, newsTimeoutMs);
            if (!response.ok) throw new Error(`${source.name} returned HTTP ${response.status}`);
            return parseRss(await response.text(), source, now);
          }),
        ),
      );
      const items = settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
      if (!items.length) {
        // No real source answered (CORS proxy down, offline, etc.): fall back to local rules.
        logOperation({ type: 'news.fetch', status: 'fallback', reason: 'no items' });
        return refreshNewsAggregation(input, previous);
      }
      const keywords = `${input?.title || ''} ${input?.sourceText || ''} ${input?.productContext || ''}`
        .toLowerCase()
        .split(/\W+/)
        .filter((token) => token.length > 3);
      const ranked = items
        .map((item) => {
          const haystack = `${item.title} ${item.summary}`.toLowerCase();
          const boost = keywords.slice(0, 10).filter((keyword) => haystack.includes(keyword)).length * 3;
          return { ...item, relevance: Math.min(100, item.relevance + boost) };
        })
        .sort((a, b) => b.relevance - a.relevance);

      const previousItems = new Map((previous?.items || []).map((item) => [item.id, item]));
      let newCount = 0;
      let updatedCount = 0;
      const merged = ranked.map((item, index) => {
        const existing = previousItems.get(item.id);
        if (!existing) {
          newCount += 1;
          return { ...item, rank: index + 1 };
        }
        updatedCount += 1;
        return { ...item, rank: index + 1, firstSeenAt: existing.firstSeenAt, lastSeenAt: now, seenCount: existing.seenCount + 1, isNew: false };
      });
      updateUsage({ provider: 'news', calls: rssSources.length });
      return {
        refreshedAt: now,
        refreshCount: (previous?.refreshCount || 0) + 1,
        newCount,
        updatedCount,
        sources: rssSources.map(({ id, name, type }) => ({ id, name, type })),
        items: merged.slice(0, 30),
      };
    },

    async search({ query, provider }) {
      const { search } = readKeys();
      const selected = provider && search[provider as SearchProviderKey]
        ? { provider: provider as SearchProviderKey, key: search[provider as SearchProviderKey]! }
        : firstKey(search);
      if (!selected) throw new Error('No search API key configured');
      const config = searchProviders[selected.provider];
      const url = config.url;
      const searchFetch = (reqUrl: string, init: RequestInit) => fetchWithTimeout(reqUrl, init, searchTimeoutMs);
      return withRetry({ type: 'search.query', provider: selected.provider }, async () => {
        let response: Response;
        if (selected.provider === 'tavily') {
          response = await searchFetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ api_key: selected.key, query, max_results: 5 }) });
        } else if (selected.provider === 'serper') {
          response = await searchFetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'X-API-KEY': selected.key }, body: JSON.stringify({ q: query, num: 5 }) });
        } else if (selected.provider === 'brave') {
          response = await searchFetch(`${url}?q=${encodeURIComponent(query)}&count=5`, { headers: { 'X-Subscription-Token': selected.key, accept: 'application/json' } });
        } else if (selected.provider === 'exa') {
          response = await searchFetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': selected.key }, body: JSON.stringify({ query, numResults: 5 }) });
        } else if (selected.provider === 'bing') {
          response = await searchFetch(`${url}?q=${encodeURIComponent(query)}&count=5`, { headers: { 'Ocp-Apim-Subscription-Key': selected.key } });
        } else {
          const [apiKey, cx] = selected.key.split(':');
          if (!apiKey || !cx) throw new Error('Google CSE key must be API_KEY:CX');
          response = await searchFetch(`${url}?key=${encodeURIComponent(apiKey)}&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(query)}&num=5`, {});
        }
        if (!response.ok) throw new Error(`${config.name} returned HTTP ${response.status}`);
        const results = normalizeSearchResults(selected.provider, await response.json());
        updateUsage({ provider: selected.provider, calls: 1 });
        return { provider: selected.provider, results };
      });
    },

    async generateText({ prompt, provider }) {
      const { llm } = readKeys();
      const selected = provider && llm[provider as LlmProviderKey]
        ? { provider: provider as LlmProviderKey, key: llm[provider as LlmProviderKey]! }
        : firstKey(llm);
      if (!selected) throw new Error('No LLM API key configured');
      const config = llmProviders[selected.provider];
      assertBudgetAvailable(selected.provider);
      return withRetry({ type: 'llm.generate', provider: selected.provider, model: config.model }, async () => {
        let response: Response;
        if (config.type === 'anthropic') {
          response = await fetchWithTimeout(config.url, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-api-key': selected.key, 'anthropic-version': '2023-06-01' },
            body: JSON.stringify({ model: config.model, max_tokens: 1800, messages: [{ role: 'user', content: prompt }] }),
          }, llmTimeoutMs);
        } else if (config.type === 'gemini') {
          response = await fetchWithTimeout(`${config.url}?key=${encodeURIComponent(selected.key)}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          }, llmTimeoutMs);
        } else {
          response = await fetchWithTimeout(config.url, {
            method: 'POST',
            headers: { 'content-type': 'application/json', authorization: `Bearer ${selected.key}` },
            body: JSON.stringify({ model: config.model, temperature: 0.4, messages: [{ role: 'user', content: prompt }] }),
          }, llmTimeoutMs);
        }
        if (!response.ok) throw new Error(`${config.name} returned HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
        const data = await response.json();
        const text = config.type === 'anthropic'
          ? (data.content || []).map((part: { text?: string }) => part.text || '').join('\n')
          : config.type === 'gemini'
            ? (data.candidates?.[0]?.content?.parts || []).map((part: { text?: string }) => part.text || '').join('\n')
            : data.choices?.[0]?.message?.content || '';
        const inputTokens = data.usage?.prompt_tokens || data.usage?.input_tokens || estimateTokens(prompt);
        const outputTokens = data.usage?.completion_tokens || data.usage?.output_tokens || estimateTokens(text);
        const estimatedCostUsd = estimateCost(selected.provider, inputTokens, outputTokens);
        updateUsage({ provider: selected.provider, calls: 1, inputTokens, outputTokens, estimatedCostUsd });
        return { provider: selected.provider, model: config.model, text, usage: { inputTokens, outputTokens, estimatedCostUsd } };
      });
    },

    async enhanceCampaign({ input, style, selectedAngleId }) {
      let searchResults: { title: string; url: string; snippet: string }[] = [];
      try {
        const search = await this.search({ query: `${input.title} ${input.audience || ''}`.trim() });
        searchResults = search.results.slice(0, 5);
      } catch {
        // Search is best-effort; the LLM still gets the prompt without evidence.
      }
      const prompt = [
        'You are a senior editor. Return strict JSON only. Do not include markdown fences.',
        'Create a production writing dossier for the supplied source.',
        'Every analysis step must be structured, concrete, and derived from the supplied source plus search evidence.',
        'Avoid generic advice. No filler. No abstract methodology language unless it directly interprets the source.',
        'Return exactly this JSON schema:',
        '{"signal":["..."],"research":{"userPersona":[{"label":"...","detail":"..."}],"realUserLeads":[{"source":"...","query":"...","why":"..."}],"knowledgeBase":[{"label":"...","detail":"..."}],"demandMap":[{"label":"...","detail":"..."}],"authorProfile":[{"label":"...","detail":"..."}]},"writingObjective":{"framework":"...","summary":"...","currentCognition":"...","uniqueValue":"...","cognitionGap":"...","dimensions":[{"label":"...","target":"...","readerGain":"...","successMetric":"..."}]},"contentStructure":{"selectedTemplateId":"...","templates":[{"id":"...","name":"...","bestFor":"...","rationale":"...","sections":[{"title":"...","job":"...","readerGain":"..."}]}],"sections":[{"title":"...","job":"...","readerGain":"..."}]},"angles":[{"id":"...","label":"...","headline":"...","rationale":"...","hook":"..."}],"sectionDrafts":[{"title":"...","objective":"...","readerGain":"...","evidencePrompt":"...","draft":"..."}],"optimizationNotes":["..."],"providerNote":"..."}',
        'Research framework requirements:',
        '1. User Persona: who exactly should care first.',
        '2. Current known facts: 3 concrete things the reader already knows from the source.',
        '3. Unknowns: 3 concrete things still unresolved.',
        '4. Decision questions: 3 concrete decisions the article must help answer.',
        '5. Evidence plan: real-user leads and source-validation next steps.',
        'Structure framework requirements:',
        'Explain why the chosen structure fits this exact source, not generic writing advice.',
        `Source: ${JSON.stringify(input)}`,
        `Style profile: ${JSON.stringify(style)}`,
        `Selected angle id: ${selectedAngleId || ''}`,
        `Search evidence: ${JSON.stringify(searchResults)}`,
      ].join('\n\n');
      const result = await this.generateText({ prompt });
      const parsed = parseJsonObject(result.text) as Record<string, unknown>;
      return { ...parsed, providerMeta: { llm: result.provider, model: result.model, usage: result.usage, searchResults } };
    },

    async getLogs(payload) {
      return readLogs().slice(-(payload?.limit || 80));
    },

    async getUsage() {
      const usage = readUsage();
      return { ...usage, monthlyBudgetUsd };
    },
  };
}

function normalizeSearchResults(provider: SearchProviderKey, data: Record<string, unknown>): { title: string; url: string; snippet: string }[] {
  const arr = (value: unknown): Record<string, unknown>[] => (Array.isArray(value) ? value as Record<string, unknown>[] : []);
  if (provider === 'tavily') return arr(data.results).map((item) => ({ title: String(item.title || ''), url: String(item.url || ''), snippet: String(item.content || item.snippet || '') }));
  if (provider === 'serper') return arr(data.organic).map((item) => ({ title: String(item.title || ''), url: String(item.link || ''), snippet: String(item.snippet || '') }));
  if (provider === 'brave') return arr((data.web as { results?: unknown })?.results).map((item) => ({ title: String(item.title || ''), url: String(item.url || ''), snippet: String(item.description || '') }));
  if (provider === 'exa') return arr(data.results).map((item) => ({ title: String(item.title || ''), url: String(item.url || ''), snippet: String(item.text || item.summary || '') }));
  if (provider === 'bing') return arr((data.webPages as { value?: unknown })?.value).map((item) => ({ title: String(item.name || ''), url: String(item.url || ''), snippet: String(item.snippet || '') }));
  return arr(data.items).map((item) => ({ title: String(item.title || ''), url: String(item.link || ''), snippet: String(item.snippet || '') }));
}

// Re-export for unit tests.
export { stopWords };
