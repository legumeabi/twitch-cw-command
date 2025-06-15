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

  // Create a promise that resolves after 1 second
  const minDelay = new Promise((resolve) => setTimeout(resolve, 1000));

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

    // Wait for both the minimum delay and the response
    await minDelay;

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
    // Still wait for minimum delay even on error
    await minDelay;
    clearTokens();
    emitAuthState({ isRefreshing: false });
    return null;
  }
}

export async function getStoredTokens(): Promise<StoredTokens | null> {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;

  const tokens = JSON.parse(stored) as StoredTokens;

  // Calculate if the access token has expired
  const now = Date.now();
  const expiresAt = tokens.stored_at + tokens.expires_in * 1000;

  if (now >= expiresAt) {
    // Token has expired, try to refresh it
    emitAuthState({ isRefreshing: true }); // Add loading state when starting refresh
    const refreshed = await refreshTokens(tokens.refresh_token);
    if (refreshed) {
      storeTokens(refreshed);
      return {
        ...refreshed,
        stored_at: Date.now(),
      };
    }
    return null;
  }

  return tokens;
}

// Check tokens on page load
checkAndRefreshTokens().catch(console.error);

export function decodeAuthToken(accessToken: string): { login: string } | null {
  try {
    const base64Payload = accessToken.split(".")[1];
    if (!base64Payload) return null;

    const payload = JSON.parse(atob(base64Payload));
    return {
      login: payload.preferred_username || payload.sub,
    };
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
}

interface ValidateResponse {
  client_id: string;
  login: string;
  scopes: string[];
  user_id: string;
  expires_in: number;
}

// Import loadTokens and storeTokens from earlier in the file
function loadTokens(): AuthTokens | null {
  const stored = localStorage.getItem("twitch_tokens");
  if (!stored) return null;

  try {
    const tokens = JSON.parse(stored) as AuthTokens;
    return tokens;
  } catch {
    return null;
  }
}

interface ValidateResult {
  token: string;
  validation: ValidateResponse;
}

export async function validateToken(accessToken: string): Promise<ValidateResult> {
  try {
    const response = await fetch("https://id.twitch.tv/oauth2/validate", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.ok) {
      return {
        token: accessToken,
        validation: await response.json(),
      };
    }

    // If we get a 401, try to refresh the token
    if (response.status === 401) {
      // Get stored tokens to find the refresh token
      const tokens = loadTokens();
      if (!tokens) {
        throw new Error("No stored tokens found");
      }

      // Try to refresh the tokens
      const refreshed = await refreshTokens(tokens.refresh_token);
      if (!refreshed) {
        throw new Error("Failed to refresh token");
      }

      // Store the new tokens
      storeTokens(refreshed);

      // Try validation again with the new access token
      const retryResponse = await fetch("https://id.twitch.tv/oauth2/validate", {
        headers: {
          Authorization: `Bearer ${refreshed.access_token}`,
        },
      });

      if (!retryResponse.ok) {
        throw new Error(`Token validation failed after refresh: ${retryResponse.statusText}`);
      }

      return {
        token: refreshed.access_token,
        validation: await retryResponse.json(),
      };
    }

    throw new Error(`Failed to validate token: ${response.statusText}`);
  } catch (error) {
    console.error("Error validating token:", error);
    throw error;
  }
}

interface CheckResult {
  tokens: StoredTokens;
  validation: ValidateResponse;
}

export async function checkAndRefreshTokens(): Promise<CheckResult | null> {
  const tokens = loadTokens();
  if (!tokens) return null;

  try {
    // Try to validate the current token
    const result = await validateToken(tokens.access_token);
    // Return stored tokens with timestamp and validation info
    return {
      tokens: { ...tokens, stored_at: Date.now() },
      validation: result.validation,
    };
  } catch (error) {
    console.log("Token validation failed, trying refresh:", error);

    // Try to refresh the token
    try {
      const refreshed = await refreshTokens(tokens.refresh_token);
      if (refreshed) {
        const storedTokens: StoredTokens = {
          ...refreshed,
          stored_at: Date.now(),
        };
        storeTokens(refreshed);

        // Validate the new token
        const result = await validateToken(refreshed.access_token);
        const checkResult = {
          tokens: storedTokens,
          validation: result.validation,
        };
        return checkResult;
      }
    } catch (refreshError) {
      console.error("Token refresh failed:", refreshError);
    }

    // If we get here, both validation and refresh failed
    clearTokens();
    return null;
  }
}
