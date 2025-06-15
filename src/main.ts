// const DEFAULT_COOLDOWN = 60; // in seconds
// const CW_SERVICE_URL = "https://heroic-deploy-kna60f.ampt.app/cw-details";
const CLIENT_ID = "ghcwo4id7lg4bagl4nq20lbveffzyq";

const STORAGE_KEYS = {
  ACCESS_TOKEN: "twitch_access_token",
  REFRESH_TOKEN: "twitch_refresh_token",
  TOKEN_TYPE: "twitch_token_type",
  SCOPE: "twitch_scope",
  EXPIRES_IN: "twitch_expires_in",
} as const;

interface DeviceAuthResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

interface TokenData {
  access_token: string;
  refresh_token: string;
  scope: string[];
  token_type: string;
  expires_in: number;
}

const saveTokenData = (data: TokenData) => {
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
  localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token);
  localStorage.setItem(STORAGE_KEYS.TOKEN_TYPE, data.token_type);
  localStorage.setItem(STORAGE_KEYS.SCOPE, JSON.stringify(data.scope));
  localStorage.setItem(STORAGE_KEYS.EXPIRES_IN, data.expires_in.toString());
};

const loadTokenData = (): TokenData | null => {
  const access_token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  const refresh_token = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  const token_type = localStorage.getItem(STORAGE_KEYS.TOKEN_TYPE);
  const scopeStr = localStorage.getItem(STORAGE_KEYS.SCOPE);
  const expires_in = localStorage.getItem(STORAGE_KEYS.EXPIRES_IN);

  if (!access_token || !refresh_token || !token_type || !scopeStr || !expires_in) {
    return null;
  }

  try {
    return {
      access_token,
      refresh_token,
      token_type,
      scope: JSON.parse(scopeStr),
      expires_in: parseInt(expires_in, 10),
    };
  } catch {
    return null;
  }
};

const clearTokenData = () => {
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
};

const updateUIWithTokenData = (tokenData: TokenData) => {
  const authStartEl = document.getElementById("authStart");
  const authCodeEl = document.getElementById("authCode");
  const authSuccessEl = document.getElementById("authSuccess");
  const tokenInfoEl = document.getElementById("tokenInfo");

  if (authStartEl && authCodeEl && authSuccessEl && tokenInfoEl) {
    authStartEl.style.display = "none";
    authCodeEl.style.display = "none";
    authSuccessEl.style.display = "block";
    tokenInfoEl.textContent = JSON.stringify(tokenData, null, 2);
  }
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
    authCodeEl.style.display = "block";
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
      saveTokenData(tokenData);
      updateUIWithTokenData(tokenData);
    } else {
      // If not authenticated yet, poll again after the specified interval
      setTimeout(poll, deviceData.interval * 1000);
    }
  };

  poll();
};

// Check for existing token data on load
const existingToken = loadTokenData();
if (existingToken) {
  updateUIWithTokenData(existingToken);
} else {
  // Initialize button click handler if no existing token
  document.getElementById("authButton")?.addEventListener("click", handleAuthFlow);
}
