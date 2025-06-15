import type { ChatUserstate } from "tmi.js";
import tmi from "tmi.js";

let client: tmi.Client | null = null;
let lastUsedTime = 0;

const DEFAULT_COOLDOWN = 60; // in seconds
const DEFAULT_CHANNEL = "legumeabi";
const CW_SERVICE_URL = "https://heroic-deploy-kna60f.ampt.app/cw-details";

interface ChatConfig {
  accessToken: string;
  channelName?: string;
  cooldownSeconds?: number;
}

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

export async function connectToChat({
  accessToken,
  channelName = DEFAULT_CHANNEL, // Default for now
  cooldownSeconds = DEFAULT_COOLDOWN,
}: ChatConfig): Promise<tmi.Client> {
  // Disconnect existing client if there is one
  if (client) {
    await client.disconnect();
    client = null;
  }

  try {
    // Get username by validating the token
    const { validation } = await import("./auth").then((m) => m.validateToken(accessToken));
    const username = validation.login;
    console.log("Connecting as:", username);

    // Create new client with the validated username
    const newClient = new tmi.Client({
      options: { debug: true },
      identity: {
        username,
        password: `oauth:${accessToken}`,
      },
      channels: [channelName],
    });

    // Register event handlers
    newClient.on("connected", (address: string, port: number) => {
      console.log(`Connected to ${address}:${port}`);
      updateStatus();
    });

    newClient.on("message", async (channel: string, userstate: ChatUserstate, message: string) => {
      const trimmedMessage = message.trim();
      if (trimmedMessage.toLowerCase() !== "!cw2") return;

      // Check cooldown
      const now = Date.now();
      const cooldownMs = cooldownSeconds * 1000;

      if (now - lastUsedTime < cooldownMs) {
        const remainingSeconds = Math.ceil((cooldownMs - (now - lastUsedTime)) / 1000);
        console.log(`Command on cooldown. ${remainingSeconds}s remaining`);
        return;
      }

      console.log(`Received !cw2 command in ${channel} from ${userstate.username}`);
      
      try {
        // Send initial response while fetching data
        await newClient.say(channel, "Fetching latest CW information...");
        
        // Fetch data from CW service
        const response = await fetch(CW_SERVICE_URL);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Send the text response
        await newClient.say(channel, data.text);
      } catch (error) {
        console.error('Error fetching CW data:', error);
        await newClient.say(channel, "Sorry, I couldn't fetch the current war information. Please try again later.");
      }

      lastUsedTime = now;
    });

    // Connect to Twitch
    await newClient.connect();
    client = newClient;
    updateStatus();

    return newClient;
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
