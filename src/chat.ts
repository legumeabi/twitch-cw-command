import { Client } from "tmi.js";
import { CHANNEL_NAME, CW_SERVICE_URL } from "./constants";
import { clearTokenData } from "./storage";
import { TokenData } from "./types";
import { showInitialState } from "./ui";

let twitchClient: Client | null = null;

export const connectToChat = async (tokenData: TokenData) => {
  // Disconnect existing client if any
  if (twitchClient) {
    await twitchClient.disconnect();
  }

  try {
    if (!tokenData.username) {
      throw new Error("No username found in stored token data");
    }

    // Create new client with stored username
    twitchClient = new Client({
      options: { debug: true, skipUpdatingEmotesets: true },
      identity: {
        username: tokenData.username,
        password: `oauth:${tokenData.access_token}`,
      },
      channels: [CHANNEL_NAME],
    });

    await twitchClient.connect();
    console.log("Connected to Twitch chat!");

    // Add some basic event handlers
    twitchClient.on("message", (_channel, _tags, message) => {
      if (message.startsWith("!cw")) {
        handleCWMesssage();
      }
    });
  } catch (error) {
    console.error("Failed to connect to Twitch chat:", error);
    // Clear tokens and reset UI if we can't connect
    clearTokenData();
    showInitialState();
  }
};

const handleCWMesssage = async () => {
  const serviceResponse = await fetch(`${CW_SERVICE_URL}?channelName=${CHANNEL_NAME}`);

  if (!serviceResponse.ok) {
    console.error("Failed to fetch CW details from service");
    return;
  }

  const message = await serviceResponse.text();

  if (twitchClient) {
    twitchClient.say(CHANNEL_NAME, message);
  } else {
    console.error("Twitch client is not connected");
  }
};

export const disconnectChat = async () => {
  if (twitchClient) {
    await twitchClient.disconnect();
    twitchClient = null;
  }
};
