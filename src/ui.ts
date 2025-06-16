import { TokenData } from "./types";

export const showInitialState = () => {
  const authStartEl = document.getElementById("authStart");
  const authCodeEl = document.getElementById("authCode");
  const authSuccessEl = document.getElementById("authSuccess");

  if (authStartEl && authCodeEl && authSuccessEl) {
    authStartEl.style.display = "block";
    authCodeEl.style.display = "none";
    authSuccessEl.style.display = "none";
  }
};

export const showVerificationUI = (verificationUrl: string, userCode: string) => {
  const authStartEl = document.getElementById("authStart");
  const authCodeEl = document.getElementById("authCode");
  const urlEl = document.getElementById("verificationUrl") as HTMLAnchorElement;
  const codeEl = document.getElementById("userCode");

  if (authStartEl && authCodeEl && urlEl && codeEl) {
    authStartEl.style.display = "none";
    authCodeEl.style.display = "block";
    urlEl.href = verificationUrl;
    codeEl.textContent = userCode;
  }
};

export const updateUIWithTokenData = (tokenData: TokenData) => {
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
