import { connectToChat, disconnectChat } from "./chat";
import { CLIENT_ID } from "./constants";
import { clearTokenData, loadTokenData, saveTokenData } from "./storage";
import { DeviceAuthResponse } from "./types";
import { showInitialState, showVerificationUI, updateUIWithTokenData } from "./ui";

const handleReset = async () => {
  await disconnectChat();
  clearTokenData();
  showInitialState();
};

const startDeviceAuth = async (): Promise<DeviceAuthResponse | null> => {
  try {
    const deviceCodeResponse = await fetch("https://id.twitch.tv/oauth2/device", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        scope: "chat:read chat:edit",
      }),
    });

    const deviceData = await deviceCodeResponse.json();
    return deviceData;
  } catch (error) {
    console.error("Error starting device auth:", error);
    return null;
  }
};

const handleAuthFlow = async () => {
  const deviceData = await startDeviceAuth();
  if (!deviceData) {
    console.error("Failed to start device authentication");
    return;
  }

  showVerificationUI(deviceData.verification_uri, deviceData.user_code);

  // Start polling
  const poll = async () => {
    const tokenResponse = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        device_code: deviceData.device_code,
        scope: "chat:read chat:edit",
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }),
    });

    if (tokenResponse.status === 200) {
      const tokenData = await tokenResponse.json();

      // Validate token and get user info
      const validateResponse = await fetch("https://id.twitch.tv/oauth2/validate", {
        headers: {
          Authorization: `OAuth ${tokenData.access_token}`,
        },
      });

      if (validateResponse.ok) {
        const validateData = await validateResponse.json();
        const fullTokenData = {
          ...tokenData,
          username: validateData.login,
        };
        saveTokenData(fullTokenData);
        updateUIWithTokenData(fullTokenData);
        await connectToChat(fullTokenData);
      }
    } else {
      // If not authenticated yet, poll again after the specified interval
      setTimeout(poll, deviceData.interval * 1000);
    }
  };

  poll();
};

// Initialize event listeners and check initial state
document.getElementById("authButton")?.addEventListener("click", handleAuthFlow);
document.getElementById("resetButton")?.addEventListener("click", handleReset);

// Check for existing token data on load
const existingToken = loadTokenData();
if (existingToken) {
  updateUIWithTokenData(existingToken);
  connectToChat(existingToken);
} else {
  showInitialState();
}
