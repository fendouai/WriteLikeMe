export {};

declare global {
  interface Window {
    writeLikeMeDesktop?: {
      platform: string;
      version: string;
      api?: {
        getSecretStatus: () => Promise<{
          encryptionAvailable: boolean;
          llm: Record<string, boolean>;
          search: Record<string, boolean>;
        }>;
        saveSecret: (payload: { kind: 'llm' | 'search'; provider: string; value: string }) => Promise<{
          encryptionAvailable: boolean;
          llm: Record<string, boolean>;
          search: Record<string, boolean>;
        }>;
        refreshNews: (payload: { input: unknown; previous?: unknown }) => Promise<unknown>;
        search: (payload: { query: string; provider?: string }) => Promise<unknown>;
        generateText: (payload: { prompt: string; provider?: string }) => Promise<unknown>;
        enhanceCampaign: (payload: { input: unknown; style: unknown; selectedAngleId?: string }) => Promise<unknown>;
        getLogs: (payload?: { limit?: number }) => Promise<unknown[]>;
        getUsage: () => Promise<unknown>;
      };
    };
  }
}
