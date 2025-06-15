import tmi from "tmi.js";

import type { ChatUserstate } from "tmi.js";

const queryParameters = new URLSearchParams(window.location.search);

const CHANNEL_NAME = queryParameters.get("channel") || "";
const OAUTH_TOKEN = queryParameters.get("token") || "";
const DEFAULT_COOLDOWN = 60; // in seconds
const COMMAND_COOLDOWN = (Number(queryParameters.get("cooldown")) || DEFAULT_COOLDOWN) * 1000; // multiply by 1000 to get the milliseconds count

const CW_SERVICE_URL = "https://heroic-deploy-kna60f.ampt.app/cw-details";

// this stores the time when the the command was used the last time by a regular user
let lastUsedTime: number;
const a = 5;

const client = new tmi.Client({
  channels: [CHANNEL_NAME],
  identity: {
    username: "ANY_NAME",
    password: OAUTH_TOKEN,
  },
});

client.connect();

setInterval(() => {
  const statusElement = document.querySelector("#status");
  if (!statusElement) return;

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
}, 1000);

client.on("message", async (channel: string, tags: ChatUserstate, message: string) => {
  const trimmedMessage = message.trim();

  // ignore everything that is not the "cw" command
  // -> just return and do nothing
  if (trimmedMessage !== "!cw") return;

  const channelName = channel.slice(1);

  console.log(`!cw command in ${channelName} channel detected`);

  // user distinctions are for command cooldown handling
  const sentByBroadcaster = tags.username === CHANNEL_NAME;
  const sentByMod = tags.mod;
  const sentByRegularUser = !sentByMod && !sentByBroadcaster;

  // handle cooldowns for regular users
  if (sentByRegularUser) {
    console.log("Command sent by regular user, checking cooldowns...");
    const currentTime = Date.now();

    if (lastUsedTime && currentTime - lastUsedTime < COMMAND_COOLDOWN) {
      // there is a cooldown and the last message is not yet beyond the cooldown threshold
      // -> return without sending any message
      console.log("Command is on cooldown. No response sent");
      return;
    }

    lastUsedTime = currentTime;
    console.log("Command by regular user accepted. Response will be sent...");
  }

  const url = `${CW_SERVICE_URL}?channelName=${channelName}`;

  // prepare a timed message that only gets send if it does not get canceled in time
  // by a successful response
  const timerForLoadingMessage = setTimeout(() => {
    client.say(channelName, "Give me a second...");
  }, 800);

  // get the content warning text to send
  try {
    const response = await fetch(url);
    clearTimeout(timerForLoadingMessage);
    const text = await response.text();

    // send the content warning text into chat
    console.log(`Sending the following text into the ${channelName} channel: "${text}"`);
    client.say(channelName, text);
  } catch (e) {
    console.error(e);
    client.say(channelName, "Sorry, I couldn't fetch the content warning information. Please try again later.");
  }
});
