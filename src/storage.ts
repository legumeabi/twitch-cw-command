import { TokenData } from "./types";

const STORAGE_KEYS = {
  ACCESS_TOKEN: "twitch_access_token",
  REFRESH_TOKEN: "twitch_refresh_token",
  TOKEN_TYPE: "twitch_token_type",
  SCOPE: "twitch_scope",
  EXPIRES_IN: "twitch_expires_in",
  USERNAME: "twitch_username",
} as const;

export const saveTokenData = (data: TokenData) => {
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
  localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token);
  localStorage.setItem(STORAGE_KEYS.TOKEN_TYPE, data.token_type);
  localStorage.setItem(STORAGE_KEYS.SCOPE, JSON.stringify(data.scope));
  localStorage.setItem(STORAGE_KEYS.EXPIRES_IN, data.expires_in.toString());
  localStorage.setItem(STORAGE_KEYS.USERNAME, data.username);
};

export const loadTokenData = (): TokenData | null => {
  const access_token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  const refresh_token = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  const token_type = localStorage.getItem(STORAGE_KEYS.TOKEN_TYPE);
  const scopeStr = localStorage.getItem(STORAGE_KEYS.SCOPE);
  const expires_in = localStorage.getItem(STORAGE_KEYS.EXPIRES_IN);
  const username = localStorage.getItem(STORAGE_KEYS.USERNAME);

  let parsedScope: string[];
  let parsedExpiresIn: number;

  try {
    if (!access_token || !refresh_token || !token_type || !scopeStr || !expires_in || !username) {
      return null;
    }

    parsedScope = JSON.parse(scopeStr);
    parsedExpiresIn = parseInt(expires_in, 10);

    if (!Array.isArray(parsedScope) || isNaN(parsedExpiresIn)) {
      return null;
    }

    return {
      access_token,
      refresh_token,
      token_type,
      scope: parsedScope,
      expires_in: parsedExpiresIn,
      username,
    };
  } catch {
    return null;
  }
};

export const clearTokenData = () => {
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
};
