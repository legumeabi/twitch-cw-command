import { load } from "@tauri-apps/plugin-store";
import { TokenData } from "./types";

const store = await load("porridge.json", { autoSave: false });

const STORAGE_KEYS = {
  ACCESS_TOKEN: "twitch_access_token",
  REFRESH_TOKEN: "twitch_refresh_token",
  TOKEN_TYPE: "twitch_token_type",
  SCOPE: "twitch_scope",
  EXPIRES_IN: "twitch_expires_in",
  USERNAME: "twitch_username",
} as const;

export const saveTokenData = async (data: TokenData) => {
  await store.set(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
  await store.set(STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token);
  await store.set(STORAGE_KEYS.TOKEN_TYPE, data.token_type);
  await store.set(STORAGE_KEYS.SCOPE, JSON.stringify(data.scope));
  await store.set(STORAGE_KEYS.EXPIRES_IN, data.expires_in.toString());
  await store.set(STORAGE_KEYS.USERNAME, data.username);

  await store.save();
};

export const loadTokenData = async (): Promise<TokenData | null> => {
  const access_token = await store.get<string>(STORAGE_KEYS.ACCESS_TOKEN);
  const refresh_token = await store.get<string>(STORAGE_KEYS.REFRESH_TOKEN);
  const token_type = await store.get<string>(STORAGE_KEYS.TOKEN_TYPE);
  const scopeStr = await store.get<string>(STORAGE_KEYS.SCOPE);
  const expires_in = await store.get<string>(STORAGE_KEYS.EXPIRES_IN);
  const username = await store.get<string>(STORAGE_KEYS.USERNAME);

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
  store.clear();
};
