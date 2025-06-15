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

const handleAuthFlow = async () => {
  const deviceData = await startDeviceAuth();
  if (!deviceData) {
    console.error("Failed to start device authentication");
    return;
  }

  // Hide the initial auth button and show the code section
  const authStartEl = document.getElementById("authStart");
  const authCodeEl = document.getElementById("authCode");
  const urlEl = document.getElementById("verificationUrl") as HTMLAnchorElement;
  const codeEl = document.getElementById("userCode");

  if (authStartEl && authCodeEl && urlEl && codeEl) {
    authStartEl.style.display = "none";
    authCodeEl.style.display = "grid";
    urlEl.href = deviceData.verification_uri;
    codeEl.textContent = deviceData.user_code;
  }

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
        scopes: "chat:read chat:edit",
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }),
    });

    if (tokenResponse.status === 200) {
      const tokenData = await tokenResponse.json();
      const authCodeEl = document.getElementById("authCode");
      const authSuccessEl = document.getElementById("authSuccess");
      const tokenInfoEl = document.getElementById("tokenInfo");

      if (authCodeEl && authSuccessEl && tokenInfoEl) {
        authCodeEl.style.display = "none";
        authSuccessEl.style.display = "block";
        tokenInfoEl.textContent = JSON.stringify(tokenData, null, 2);
      }
    } else {
      // If not authenticated yet, poll again after the specified interval
      setTimeout(poll, deviceData.interval * 1000);
    }
  };

  poll();
};

// Initialize button click handler
document.getElementById("authButton")?.addEventListener("click", handleAuthFlow);
