import type { ChatUserstate } from "tmi.js";
import tmi from "tmi.js";

let lastUsedTime = 0;

const CHANNEL_NAME = "legumeabi";
const DEFAULT_COOLDOWN = 60; // in seconds
const CW_SERVICE_URL = "https://heroic-deploy-kna60f.ampt.app/cw-details";

export async function connectToChat(channelName?: string, oauthToken?: string): Promise<void> {
  if (!channelName || !oauthToken) {
    throw new Error("Missing required parameters: channel and/or token");
  }

  try {
    const newClient = new tmi.Client({
      options: { debug: true },
      identity: {
        username: channelName,
        password: `oauth:${oauthToken}`,
      },
      channels: [CHANNEL_NAME],
    });

    newClient.on("message", async (channel: string, userstate: ChatUserstate, message: string) => {
      if (message.trim() !== "!cw") return;

      const channelNameNoHash = channel.slice(1);
      console.log(`!cw command in ${channelNameNoHash} channel detected`);

      // Check cooldown for non-mods/non-broadcasters
      const isMod = userstate.mod || userstate.username === channelNameNoHash;
      if (!isMod) {
        const now = Date.now();
        const cooldownMs = DEFAULT_COOLDOWN * 1000;

        if (now - lastUsedTime < cooldownMs) {
          console.log(`Command on cooldown. ${Math.ceil((cooldownMs - (now - lastUsedTime)) / 1000)}s remaining`);
          return;
        }
        lastUsedTime = now;
      }

      const loadingMessage = setTimeout(() => {
        newClient.say(channel, "Give me a second...");
      }, 800);

      try {
        const url = `${CW_SERVICE_URL}?channelName=${channelNameNoHash}`;
        const response = await fetch(url);
        clearTimeout(loadingMessage);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();
        await newClient.say(channel, text);
      } catch (error) {
        console.error("Error fetching CW data:", error);
        await newClient.say(
          channel,
          "Sorry, I couldn't fetch the content warning information. Please try again later."
        );
      }
    });

    await newClient.connect();
  } catch (error) {
    console.error("Error connecting to chat:", error);
    throw error;
  }
}
