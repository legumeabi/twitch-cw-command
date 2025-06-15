import type { ChatUserstate } from "tmi.js";
import tmi from "tmi.js";

let client: tmi.Client | null = null;
let lastUsedTime = 0;

const DEFAULT_COOLDOWN = 60; // in seconds
const CW_SERVICE_URL = "https://heroic-deploy-kna60f.ampt.app/cw-details";

// Get configuration from URL parameters
const queryParams = new URLSearchParams(window.location.search);
const channelName = queryParams.get("channel") || "";
const oauthToken = queryParams.get("token") || "";
const cooldownSeconds = Number(queryParams.get("cooldown")) || DEFAULT_COOLDOWN;

function updateStatus() {
  const statusElement = document.querySelector("#status");
  if (!statusElement || !client) return;

  switch (client.readyState()) {
    case "OPEN":
      statusElement.innerHTML = "🟢 Running";
      break;
    case "CONNECTING":
      statusElement.innerHTML = "🚀 Starting";
      break;
    case "CLOSING":
    case "CLOSED":
    default:
      statusElement.innerHTML = "🛑 Stopped";
      break;
  }
}

export async function connectToChat(): Promise<void> {
  if (!channelName || !oauthToken) {
    throw new Error("Missing required parameters: channel and/or token");
  }

  // Disconnect existing client if there is one
  if (client) {
    await disconnectFromChat();
  }

  try {
    const newClient = new tmi.Client({
      options: { debug: true },
      identity: {
        username: "ANY_NAME",
        password: `oauth:${oauthToken}`,
      },
      channels: [channelName],
    });

    newClient.on("connected", () => {
      console.log("Connected to Twitch chat");
      updateStatus();
    });

    newClient.on("message", async (channel: string, userstate: ChatUserstate, message: string) => {
      if (message.trim() !== "!cw") return;

      const channelNameNoHash = channel.slice(1);
      console.log(`!cw command in ${channelNameNoHash} channel detected`);

      // Check cooldown for non-mods/non-broadcasters
      const isMod = userstate.mod || userstate.username === channelNameNoHash;
      if (!isMod) {
        const now = Date.now();
        const cooldownMs = cooldownSeconds * 1000;

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
    client = newClient;
    updateStatus();
  } catch (error) {
    console.error("Error connecting to chat:", error);
    throw error;
  }
}

export async function disconnectFromChat(): Promise<void> {
  if (client) {
    await client.disconnect();
    client = null;
    updateStatus();
  }
}
