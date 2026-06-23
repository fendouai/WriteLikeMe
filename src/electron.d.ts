export {};

declare global {
  interface Window {
    writeLikeMeDesktop?: {
      platform: string;
      version: string;
    };
  }
}
