const { app, safeStorage } = require('electron');
const { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const llmProviders = {
  openai: { name: 'OpenAI', url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini', type: 'openai', inputPer1M: 0.15, outputPer1M: 0.6 },
  anthropic: { name: 'Anthropic', url: 'https://api.anthropic.com/v1/messages', model: 'claude-3-5-haiku-latest', type: 'anthropic', inputPer1M: 0.8, outputPer1M: 4 },
  gemini: { name: 'Google Gemini', url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', model: 'gemini-1.5-flash', type: 'gemini', inputPer1M: 0.075, outputPer1M: 0.3 },
  deepseek: { name: 'DeepSeek', url: 'https://api.deepseek.com/chat/completions', model: 'deepseek-chat', type: 'openai', inputPer1M: 0.27, outputPer1M: 1.1 },
  openrouter: { name: 'OpenRouter', url: 'https://openrouter.ai/api/v1/chat/completions', model: 'openai/gpt-4o-mini', type: 'openai', inputPer1M: 0.15, outputPer1M: 0.6 },
  xai: { name: 'xAI', url: 'https://api.x.ai/v1/chat/completions', model: 'grok-3-mini', type: 'openai', inputPer1M: 0.3, outputPer1M: 0.5 },
  qwen: { name: 'Alibaba Qwen', url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', model: 'qwen-turbo', type: 'openai', inputPer1M: 0.05, outputPer1M: 0.2 },
  kimi: { name: 'Moonshot Kimi', url: 'https://api.moonshot.cn/v1/chat/completions', model: 'moonshot-v1-8k', type: 'openai', inputPer1M: 1.7, outputPer1M: 1.7 },
};

const searchProviders = {
  tavily: { name: 'Tavily', url: 'https://api.tavily.com/search' },
  serper: { name: 'Serper', url: 'https://google.serper.dev/search' },
  brave: { name: 'Brave Search', url: 'https://api.search.brave.com/res/v1/web/search' },
  exa: { name: 'Exa', url: 'https://api.exa.ai/search' },
  bing: { name: 'Bing Search', url: 'https://api.bing.microsoft.com/v7.0/search' },
  googleCse: { name: 'Google CSE', url: 'https://www.googleapis.com/customsearch/v1' },
};

const rssSources = [
  { id: 'hn', name: 'Hacker News', type: 'hotlist', url: 'https://hnrss.org/frontpage' },
  { id: 'github-trending', name: 'GitHub Trending', type: 'rss', url: 'https://mshibanami.github.io/GitHubTrendingRSS/daily/all.xml' },
  { id: 'product-hunt', name: 'Product Hunt', type: 'rss', url: 'https://www.producthunt.com/feed' },
  { id: 'lobsters', name: 'Lobsters', type: 'hotlist', url: 'https://lobste.rs/rss' },
  { id: 'techcrunch-ai', name: 'TechCrunch AI', type: 'rss', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
  { id: 'the-verge-ai', name: 'The Verge AI', type: 'rss', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml' },
  { id: 'ruanyifeng', name: '阮一峰周刊', type: 'rss', url: 'https://feeds.feedburner.com/ruanyifeng' },
];

const monthlyBudgetUsd = Number(process.env.WLM_MONTHLY_BUDGET_USD || 10);

function providerUrl(kind, provider, fallback) {
  const key = `WLM_${kind.toUpperCase()}_${provider.toUpperCase()}_URL`;
  return process.env[key] || fallback;
}

function userDataPath(...parts) {
  const dir = join(app.getPath('userData'), 'production-services');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return join(dir, ...parts);
}

function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2));
}

function logOperation(entry) {
  appendFileSync(userDataPath('operations.jsonl'), `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`);
}

function updateUsage(delta) {
  const path = userDataPath('usage.json');
  const usage = readJson(path, { calls: 0, inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0, byProvider: {} });
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
  writeJson(path, usage);
  return usage;
}

function assertBudgetAvailable(provider) {
  const usage = getUsage();
  if (monthlyBudgetUsd > 0 && usage.estimatedCostUsd >= monthlyBudgetUsd) {
    logOperation({ type: 'cost.limit', status: 'blocked', provider, estimatedCostUsd: usage.estimatedCostUsd, monthlyBudgetUsd });
    throw new Error(`Monthly LLM budget reached: $${usage.estimatedCostUsd.toFixed(6)} / $${monthlyBudgetUsd}`);
  }
}

function secretPath() {
  return userDataPath('secrets.json');
}

function readSecretStore() {
  return readJson(secretPath(), { llm: {}, search: {} });
}

function encryptSecret(value) {
  if (!safeStorage.isEncryptionAvailable()) return { encoding: 'plain', value };
  return { encoding: 'safeStorage', value: safeStorage.encryptString(value).toString('base64') };
}

function decryptSecret(record) {
  if (!record?.value) return '';
  if (record.encoding === 'safeStorage' && safeStorage.isEncryptionAvailable()) {
    return safeStorage.decryptString(Buffer.from(record.value, 'base64'));
  }
  return record.value;
}

function saveSecret(kind, provider, value) {
  if (!['llm', 'search'].includes(kind)) throw new Error(`Unknown secret kind: ${kind}`);
  const store = readSecretStore();
  store[kind] ||= {};
  if (value) store[kind][provider] = encryptSecret(value);
  else delete store[kind][provider];
  writeJson(secretPath(), store);
  logOperation({ type: 'secret.save', status: 'ok', kind, provider, encrypted: Boolean(value && safeStorage.isEncryptionAvailable()) });
  return getSecretStatus();
}

function getSecret(kind, provider) {
  const envName = `WLM_${kind.toUpperCase()}_${provider.toUpperCase()}_KEY`;
  if (process.env[envName]) return process.env[envName];
  return decryptSecret(readSecretStore()[kind]?.[provider]);
}

function getFirstSecret(kind, providers) {
  for (const provider of providers) {
    const key = getSecret(kind, provider);
    if (key) return { provider, key };
  }
  return undefined;
}

function getSecretStatus() {
  const store = readSecretStore();
  return {
    encryptionAvailable: safeStorage.isEncryptionAvailable(),
    llm: Object.fromEntries(Object.keys(llmProviders).map((provider) => [provider, Boolean(getSecret('llm', provider) || store.llm?.[provider])])),
    search: Object.fromEntries(Object.keys(searchProviders).map((provider) => [provider, Boolean(getSecret('search', provider) || store.search?.[provider])])),
  };
}

async function withRetry(operation, meta, fn, retries = 2) {
  let lastError;
  const startedAt = Date.now();
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const result = await fn(attempt);
      logOperation({ ...meta, status: 'ok', attempt: attempt + 1, durationMs: Date.now() - startedAt });
      return result;
    } catch (error) {
      lastError = error;
      logOperation({ ...meta, status: 'retry', attempt: attempt + 1, error: error.message });
      if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
    }
  }
  logOperation({ ...meta, status: 'failed', durationMs: Date.now() - startedAt, error: lastError?.message });
  throw lastError;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 12_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function stripTags(value) {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function decodeXml(value) {
  return value
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function tagValue(block, tag) {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? stripTags(decodeXml(match[1])) : '';
}

function parseRss(xml, source, now) {
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

function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    ['utm_source', 'utm_medium', 'utm_campaign', 'ref', 'source', '_t'].forEach((param) => parsed.searchParams.delete(param));
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return url;
  }
}

async function fetchRssSource(source, now) {
  return withRetry({ type: 'news.fetch', provider: source.name }, {}, async () => {
    const response = await fetchWithTimeout(source.url, { headers: { 'user-agent': 'WriteLikeMe/0.1 (+https://github.com/fendouai/WriteLikeMe)' } });
    if (!response.ok) throw new Error(`${source.name} returned HTTP ${response.status}`);
    return parseRss(await response.text(), source, now);
  });
}

function mergeNews(previous, sources, generated, now) {
  const previousItems = new Map((previous?.items || []).map((item) => [item.id, item]));
  let newCount = 0;
  let updatedCount = 0;
  const merged = generated.map((item, index) => {
    const existing = previousItems.get(item.id);
    if (!existing) {
      newCount += 1;
      return { ...item, rank: index + 1 };
    }
    updatedCount += 1;
    return { ...item, rank: index + 1, firstSeenAt: existing.firstSeenAt, lastSeenAt: now, seenCount: existing.seenCount + 1, isNew: false };
  });
  const offList = [...previousItems.values()].filter((item) => !generated.some((next) => next.id === item.id)).map((item) => ({ ...item, isNew: false })).slice(0, 8);
  return {
    refreshedAt: now,
    refreshCount: (previous?.refreshCount || 0) + 1,
    newCount,
    updatedCount,
    sources,
    items: [...merged, ...offList].slice(0, 30),
  };
}

async function refreshNews(input, previous) {
  const now = new Date().toISOString();
  const settled = await Promise.allSettled(rssSources.map((source) => fetchRssSource(source, now)));
  const items = settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
  if (!items.length) throw new Error('No real news sources returned items');
  const keywords = `${input?.title || ''} ${input?.sourceText || ''} ${input?.productContext || ''}`.toLowerCase().split(/\W+/).filter((token) => token.length > 3);
  const ranked = items
    .map((item) => {
      const haystack = `${item.title} ${item.summary}`.toLowerCase();
      const boost = keywords.slice(0, 10).filter((keyword) => haystack.includes(keyword)).length * 3;
      return { ...item, relevance: Math.min(100, item.relevance + boost) };
    })
    .sort((a, b) => b.relevance - a.relevance);
  updateUsage({ provider: 'news', calls: rssSources.length });
  return mergeNews(previous, rssSources.map(({ id, name, type }) => ({ id, name, type })), ranked, now);
}

async function searchWeb(query, preferredProvider) {
  const selected = preferredProvider && getSecret('search', preferredProvider)
    ? { provider: preferredProvider, key: getSecret('search', preferredProvider) }
    : getFirstSecret('search', Object.keys(searchProviders));
  if (!selected) throw new Error('No search API key configured');
  const provider = selected.provider;
  const key = selected.key;
  const config = searchProviders[provider];
  return withRetry({ type: 'search.query', provider }, {}, async () => {
    const url = providerUrl('search', provider, config.url);
    let response;
    if (provider === 'tavily') {
      response = await fetchWithTimeout(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ api_key: key, query, max_results: 5 }) });
    } else if (provider === 'serper') {
      response = await fetchWithTimeout(url, { method: 'POST', headers: { 'content-type': 'application/json', 'X-API-KEY': key }, body: JSON.stringify({ q: query, num: 5 }) });
    } else if (provider === 'brave') {
      response = await fetchWithTimeout(`${url}?q=${encodeURIComponent(query)}&count=5`, { headers: { 'X-Subscription-Token': key, accept: 'application/json' } });
    } else if (provider === 'exa') {
      response = await fetchWithTimeout(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': key }, body: JSON.stringify({ query, numResults: 5 }) });
    } else if (provider === 'bing') {
      response = await fetchWithTimeout(`${url}?q=${encodeURIComponent(query)}&count=5`, { headers: { 'Ocp-Apim-Subscription-Key': key } });
    } else {
      const [apiKey, cx] = key.split(':');
      if (!apiKey || !cx) throw new Error('Google CSE key must be API_KEY:CX');
      response = await fetchWithTimeout(`${url}?key=${encodeURIComponent(apiKey)}&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(query)}&num=5`);
    }
    if (!response.ok) throw new Error(`${config.name} returned HTTP ${response.status}`);
    const data = await response.json();
    const results = normalizeSearchResults(provider, data);
    updateUsage({ provider, calls: 1 });
    return { provider, results };
  });
}

function normalizeSearchResults(provider, data) {
  if (provider === 'tavily') return (data.results || []).map((item) => ({ title: item.title, url: item.url, snippet: item.content || item.snippet || '' }));
  if (provider === 'serper') return (data.organic || []).map((item) => ({ title: item.title, url: item.link, snippet: item.snippet || '' }));
  if (provider === 'brave') return (data.web?.results || []).map((item) => ({ title: item.title, url: item.url, snippet: item.description || '' }));
  if (provider === 'exa') return (data.results || []).map((item) => ({ title: item.title, url: item.url, snippet: item.text || item.summary || '' }));
  if (provider === 'bing') return (data.webPages?.value || []).map((item) => ({ title: item.name, url: item.url, snippet: item.snippet || '' }));
  return (data.items || []).map((item) => ({ title: item.title, url: item.link, snippet: item.snippet || '' }));
}

function estimateTokens(text) {
  return Math.ceil(String(text || '').length / 4);
}

function estimateCost(provider, inputTokens, outputTokens) {
  const pricing = llmProviders[provider] || { inputPer1M: 0, outputPer1M: 0 };
  return (inputTokens / 1_000_000) * pricing.inputPer1M + (outputTokens / 1_000_000) * pricing.outputPer1M;
}

async function callLlm(prompt, preferredProvider) {
  const selected = preferredProvider && getSecret('llm', preferredProvider)
    ? { provider: preferredProvider, key: getSecret('llm', preferredProvider) }
    : getFirstSecret('llm', Object.keys(llmProviders));
  if (!selected) throw new Error('No LLM API key configured');
  const { provider, key } = selected;
  const config = llmProviders[provider];
  assertBudgetAvailable(provider);
  return withRetry({ type: 'llm.generate', provider, model: config.model }, {}, async () => {
    const url = providerUrl('llm', provider, config.url);
    let response;
    if (config.type === 'anthropic') {
      response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: config.model, max_tokens: 1800, messages: [{ role: 'user', content: prompt }] }),
      });
    } else if (config.type === 'gemini') {
      response = await fetchWithTimeout(`${url}?key=${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });
    } else {
      response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: config.model, temperature: 0.4, messages: [{ role: 'user', content: prompt }] }),
      });
    }
    if (!response.ok) throw new Error(`${config.name} returned HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
    const data = await response.json();
    const text = config.type === 'anthropic'
      ? (data.content || []).map((part) => part.text || '').join('\n')
      : config.type === 'gemini'
        ? (data.candidates?.[0]?.content?.parts || []).map((part) => part.text || '').join('\n')
        : data.choices?.[0]?.message?.content || '';
    const inputTokens = data.usage?.prompt_tokens || data.usage?.input_tokens || estimateTokens(prompt);
    const outputTokens = data.usage?.completion_tokens || data.usage?.output_tokens || estimateTokens(text);
    const estimatedCostUsd = estimateCost(provider, inputTokens, outputTokens);
    updateUsage({ provider, calls: 1, inputTokens, outputTokens, estimatedCostUsd });
    return { provider, model: config.model, text, usage: { inputTokens, outputTokens, estimatedCostUsd } };
  });
}

async function generateCampaignEnhancement(payload) {
  const { input, style, selectedAngleId } = payload;
  let searchResults = [];
  try {
    const search = await searchWeb(`${input.title} ${input.audience || ''}`.trim());
    searchResults = search.results.slice(0, 5);
  } catch (error) {
    logOperation({ type: 'search.query', status: 'fallback', error: error.message });
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
  const result = await callLlm(prompt);
  const parsed = parseJsonObject(result.text);
  return { ...parsed, providerMeta: { llm: result.provider, model: result.model, usage: result.usage, searchResults } };
}

function parseJsonObject(text) {
  const trimmed = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('LLM did not return a JSON object');
  return JSON.parse(trimmed.slice(start, end + 1));
}

function getLogs(limit = 80) {
  try {
    return readFileSync(userDataPath('operations.jsonl'), 'utf8').trim().split('\n').filter(Boolean).slice(-limit).map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

function getUsage() {
  return { monthlyBudgetUsd, ...readJson(userDataPath('usage.json'), { calls: 0, inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0, byProvider: {} }) };
}

module.exports = {
  saveSecret,
  getSecretStatus,
  refreshNews,
  searchWeb,
  callLlm,
  generateCampaignEnhancement,
  getLogs,
  getUsage,
};
