import { Client } from "@line/bot-sdk";

// LINE Bot SDK configuration
export const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
  channelSecret: process.env.LINE_CHANNEL_SECRET || "",
};

// Create LINE client instance only if tokens are provided
export let lineClient: Client | null = null;

if (lineConfig.channelAccessToken && lineConfig.channelSecret) {
  lineClient = new Client(lineConfig);
}

export function getLineClient(): Client {
  if (!lineClient) {
    throw new Error("LINE client is not initialized. Please provide valid LINE_CHANNEL_ACCESS_TOKEN and LINE_CHANNEL_SECRET environment variables.");
  }
  return lineClient;
}
