const DEFAULT_COOLDOWN = 60; // in seconds
const CW_SERVICE_URL = "https://heroic-deploy-kna60f.ampt.app/cw-details";
const CLIENT_ID = "ghcwo4id7lg4bagl4nq20lbveffzyq";

interface DeviceAuthResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

const startDeviceAuth = async (): Promise<DeviceAuthResponse | null> => {
  try {
    const deviceCodeResponse = await fetch("https://id.twitch.tv/oauth2/device", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        scopes: "chat:read chat:edit",
      }),
    });

    const deviceData = await deviceCodeResponse.json();
    return deviceData;
  } catch (error) {
    console.error("Error starting device auth:", error);
    return null;
  }
};

const pollForToken = async (deviceCode: string): Promise<string | null> => {
  try {
    const tokenResponse = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        scopes: "chat:read chat:edit",
        device_code: deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }),
    });

    if (tokenResponse.status === 200) {
      const tokenData = await tokenResponse.json();
      return tokenData.access_token;
    }

    return null;
  } catch (error) {
    console.error("Error polling for token:", error);
    return null;
  }
};

const handleAuthFlow = async () => {
  const deviceData = await startDeviceAuth();
  if (!deviceData) {
    console.error("Failed to start device authentication");
    return;
  }

  console.log("Please visit:", deviceData.verification_uri);
  console.log("And enter code:", deviceData.user_code);

  // Start polling
  const poll = async () => {
    const token = await pollForToken(deviceData.device_code);
    if (token) {
      console.log("Authentication successful! Access token:", token);
    } else {
      // If not authenticated yet, poll again after the specified interval
      setTimeout(poll, deviceData.interval * 1000);
    }
  };

  poll();
};

// Initialize button click handler
document.getElementById("authButton")?.addEventListener("click", handleAuthFlow);
