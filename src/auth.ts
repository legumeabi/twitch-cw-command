const CLIENT_ID = "ghcwo4id7lg4bagl4nq20lbveffzyq";
const SCOPES = ["chat:read", "chat:edit"];

interface DeviceCodeResponse {
  device_code: string;
  expires_in: number;
  interval: number;
  user_code: string;
  verification_uri: string;
}

export async function startDeviceAuth(): Promise<DeviceCodeResponse> {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    scopes: SCOPES.join(" "),
  });

  const response = await fetch("https://id.twitch.tv/oauth2/device", {
    method: "POST",
    body: params,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to start device auth: ${response.statusText}`);
  }

  return response.json();
}

interface AuthTokens {
  access_token: string;
  refresh_token: string;
  scope: string[];
  token_type: string;
  expires_in: number;
}

export async function pollAuth(deviceCode: string): Promise<AuthTokens | false> {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    device_code: deviceCode,
    grant_type: "urn:ietf:params:oauth:grant-type:device_code",
  });

  try {
    const response = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      body: params,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (response.status === 400) {
      const error = await response.json();
      if (error.message === "authorization_pending") {
        return false;
      }
      throw new Error(error.message);
    }

    if (!response.ok) {
      throw new Error(`Failed to poll auth: ${response.statusText}`);
    }

    const tokens = await response.json();
    return tokens as AuthTokens;
  } catch (error) {
    console.error("Error polling auth:", error);
    return false;
  }
}

const STORAGE_KEY = "twitch_tokens";

interface StoredTokens extends AuthTokens {
  stored_at: number; // timestamp when the tokens were stored
}

export function storeTokens(tokens: AuthTokens) {
  const storedTokens: StoredTokens = {
    ...tokens,
    stored_at: Date.now(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(storedTokens));
}

export function clearTokens() {
  localStorage.removeItem(STORAGE_KEY);
}

// Add event emitter for auth state changes
const authStateListeners: ((state: { isRefreshing: boolean }) => void)[] = [];

export function onAuthStateChange(callback: (state: { isRefreshing: boolean }) => void) {
  authStateListeners.push(callback);
}

function emitAuthState(state: { isRefreshing: boolean }) {
  authStateListeners.forEach((listener) => listener(state));
}

export async function refreshTokens(refresh_token: string): Promise<AuthTokens | null> {
  emitAuthState({ isRefreshing: true });

  try {
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: "refresh_token",
      refresh_token: refresh_token,
    });

    const response = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      body: params,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (!response.ok) {
      clearTokens();
      emitAuthState({ isRefreshing: false });
      return null;
    }

    const tokens = await response.json();
    emitAuthState({ isRefreshing: false });
    return tokens as AuthTokens;
  } catch (error) {
    console.error("Error refreshing tokens:", error);
    clearTokens();
    emitAuthState({ isRefreshing: false });
    return null;
  }
}

export async function getStoredTokens(): Promise<StoredTokens | null> {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;

  const tokens = JSON.parse(stored) as StoredTokens;

  return tokens;
}
