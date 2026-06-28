import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createBrowserService,
  decodeXml,
  normalizeUrl,
  parseRss,
  stripTags,
  tagValue,
} from '../browserServices';
import { saveRuntimeConfig } from '../storage';

const sampleSource = { id: 'hn', name: 'Hacker News', type: 'hotlist' as const, url: 'https://hnrss.org/frontpage' };

// Realistic RSS with CDATA sections (matches what HN/Product Hunt return).
const sampleRss = `<?xml version="1.0"?>
<rss><channel>
  <item>
    <title><![CDATA[WordStar: A Writer's Word Processor (1996)]]></title>
    <link>https://www.sfwriter.com/wordstar.htm</link>
    <description><![CDATA[<p>A look back at the classic word processor.</p>]]></description>
  </item>
  <item>
    <title><![CDATA[Show HN: An open-source marketing agent]]></title>
    <link>https://github.com/example/marketing-agent</link>
    <description>Lightweight agent for content workflows.</description>
  </item>
</channel></rss>`;

describe('XML utilities', () => {
  it('stripTags removes markup and collapses whitespace', () => {
    expect(stripTags('<p>hello <b>world</b></p>')).toBe('hello world');
    expect(stripTags('  a   b  ')).toBe('a b');
  });

  it('decodeXml unescapes entities and unwraps CDATA', () => {
    expect(decodeXml('&lt;tag&gt;')).toBe('<tag>');
    expect(decodeXml('&amp;&quot;&#39;')).toBe('&"\'');
    expect(decodeXml('<![CDATA[raw text]]>')).toBe('raw text');
  });

  it('tagValue extracts a tag value, stripping CDATA', () => {
    const block = '<item><title><![CDATA[Hello &amp; goodbye]]></title></item>';
    expect(tagValue(block, 'title')).toBe('Hello & goodbye');
    expect(tagValue(block, 'missing')).toBe('');
  });

  it('normalizeUrl strips tracking params and hash', () => {
    const out = normalizeUrl('https://example.com/a?utm_source=x&ref=y&keep=1#top');
    expect(out).not.toContain('utm_source');
    expect(out).not.toContain('ref=');
    expect(out).not.toContain('#');
    expect(out).toContain('keep=1');
  });

  it('normalizeUrl passes through non-URL strings unchanged', () => {
    expect(normalizeUrl('not a url')).toBe('not a url');
  });
});

describe('parseRss', () => {
  it('parses items with real titles and links (no example.com)', () => {
    const items = parseRss(sampleRss, sampleSource, '2024-01-01T00:00:00.000Z');
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe("WordStar: A Writer's Word Processor (1996)");
    expect(items[0].url).toBe('https://www.sfwriter.com/wordstar.htm');
    expect(items[1].url).toBe('https://github.com/example/marketing-agent');
    expect(items[0].summary).toContain('classic word processor');
  });

  it('assigns rank, source metadata and a relevance score', () => {
    const items = parseRss(sampleRss, sampleSource, '2024-01-01T00:00:00.000Z');
    expect(items[0].rank).toBe(1);
    expect(items[1].rank).toBe(2);
    expect(items[0].sourceId).toBe('hn');
    expect(items[0].sourceName).toBe('Hacker News');
    expect(items[0].relevance).toBeGreaterThanOrEqual(45);
  });

  it('drops items missing a title or link', () => {
    const broken = '<rss><channel><item><title></title><link></link></item><item><title>x</title><link>https://a.com</link></item></channel></rss>';
    const items = parseRss(broken, sampleSource, 'now');
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('x');
  });
});

describe('createBrowserService', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('getSecretStatus reflects keys stored in localStorage', async () => {
    const service = createBrowserService();
    let status = await service.getSecretStatus();
    expect(Object.values(status.llm).every(Boolean)).toBe(false);

    saveRuntimeConfig({
      llmKeys: { openai: 'sk-test', anthropic: '', gemini: '', deepseek: '', openrouter: '', xai: '', qwen: '', kimi: '' },
      searchKeys: { tavily: '', serper: '', brave: '', exa: '', bing: '', googleCse: '' },
    });
    status = await service.getSecretStatus();
    expect(status.llm.openai).toBe(true);
    expect(status.encryptionAvailable).toBe(false);
  });

  it('refreshNews parses real RSS via the CORS proxy', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => sampleRss,
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = createBrowserService();
    const news = await service.refreshNews({
      input: { url: '', title: 'AI agents', sourceText: '', audience: '', productContext: '' },
    });
    expect(fetchMock).toHaveBeenCalled();
    // Every request goes through the CORS proxy prefix.
    expect(fetchMock.mock.calls[0][0]).toContain('allorigins.win');
    expect(news.items.length).toBeGreaterThan(0);
    expect(news.items.every((item) => !item.url.includes('example.com'))).toBe(true);
    expect(news.refreshCount).toBe(1);
  });

  it('refreshNews falls back to local rules when every source fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const service = createBrowserService();
    const news = await service.refreshNews({
      input: { url: '', title: 'AI agents', sourceText: '', audience: '', productContext: '' },
    });
    // Local rules fallback still returns items (example.com placeholders are expected here).
    expect(news.items.length).toBeGreaterThan(0);
    expect(news.refreshCount).toBe(1);
  });

  it('search throws when no key is configured', async () => {
    const service = createBrowserService();
    await expect(service.search({ query: 'test' })).rejects.toThrow(/No search API key/);
  });

  it('search calls the configured provider', async () => {
    saveRuntimeConfig({
      llmKeys: { openai: '', anthropic: '', gemini: '', deepseek: '', openrouter: '', xai: '', qwen: '', kimi: '' },
      searchKeys: { tavily: '', serper: 'serper-key', brave: '', exa: '', bing: '', googleCse: '' },
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ organic: [{ title: 'Result', link: 'https://r.com', snippet: 'snip' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const service = createBrowserService();
    const result = await service.search({ query: 'ai agents' });
    expect(result.provider).toBe('serper');
    expect(result.results[0].url).toBe('https://r.com');
  });

  it('generateText throws when no LLM key is configured', async () => {
    const service = createBrowserService();
    await expect(service.generateText({ prompt: 'hi' })).rejects.toThrow(/No LLM API key/);
  });

  it('enhanceCampaign surfaces a clear error when no LLM key is configured', async () => {
    const service = createBrowserService();
    await expect(
      service.enhanceCampaign({ input: { url: '', title: 'x', sourceText: '', audience: '', productContext: '' }, style: {} }),
    ).rejects.toThrow(/No LLM API key/);
  });

  it('refreshNews accumulates usage (calls counted in localStorage)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => sampleRss }));
    const service = createBrowserService();
    await service.refreshNews({ input: { url: '', title: 'x', sourceText: '', audience: '', productContext: '' } });
    const usage = await service.getUsage();
    expect(usage.calls).toBeGreaterThan(0);
    expect(usage.byProvider.news.calls).toBeGreaterThan(0);
  });

  it('refreshNews records operation logs', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => sampleRss }));
    const service = createBrowserService();
    await service.refreshNews({ input: { url: '', title: 'x', sourceText: '', audience: '', productContext: '' } });
    const logs = await service.getLogs({ limit: 20 });
    expect(Array.isArray(logs)).toBe(true);
    expect(logs.length).toBeGreaterThan(0);
    const hasNewsLog = logs.some((entry) => (entry as Record<string, unknown>).type === 'news.fetch');
    expect(hasNewsLog).toBe(true);
  });

  it('generateText returns usage and updates persistent cost tracking', async () => {
    saveRuntimeConfig({
      llmKeys: { openai: 'sk-test', anthropic: '', gemini: '', deepseek: '', openrouter: '', xai: '', qwen: '', kimi: '' },
      searchKeys: { tavily: '', serper: '', brave: '', exa: '', bing: '', googleCse: '' },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'hello world' } }], usage: { prompt_tokens: 10, completion_tokens: 5 } }),
    }));
    const service = createBrowserService();
    const result = await service.generateText({ prompt: 'say hi' });
    expect(result.usage.inputTokens).toBe(10);
    expect(result.usage.outputTokens).toBe(5);
    expect(result.usage.estimatedCostUsd).toBeGreaterThan(0);
    const usage = await service.getUsage();
    expect(usage.calls).toBe(1);
    expect(usage.estimatedCostUsd).toBeCloseTo(result.usage.estimatedCostUsd, 5);
  });

  it('generateText retries on transient failure then succeeds', async () => {
    saveRuntimeConfig({
      llmKeys: { openai: 'sk-test', anthropic: '', gemini: '', deepseek: '', openrouter: '', xai: '', qwen: '', kimi: '' },
      searchKeys: { tavily: '', serper: '', brave: '', exa: '', bing: '', googleCse: '' },
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, text: async () => 'server error' })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ choices: [{ message: { content: 'ok' } }] }) });
    vi.stubGlobal('fetch', fetchMock);
    const service = createBrowserService();
    const result = await service.generateText({ prompt: 'hi' });
    expect(result.text).toBe('ok');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('blocks LLM calls once the monthly budget is exceeded', async () => {
    saveRuntimeConfig({
      llmKeys: { openai: 'sk-test', anthropic: '', gemini: '', deepseek: '', openrouter: '', xai: '', qwen: '', kimi: '' },
      searchKeys: { tavily: '', serper: '', brave: '', exa: '', bing: '', googleCse: '' },
    });
    // Pre-spend past the budget.
    localStorage.setItem('wlm.usage', JSON.stringify({ calls: 100, inputTokens: 0, outputTokens: 0, estimatedCostUsd: 999, byProvider: {} }));
    const service = createBrowserService();
    await expect(service.generateText({ prompt: 'hi' })).rejects.toThrow(/Monthly LLM budget reached/);
  });
});
