import { clearTokens, getStoredTokens, pollAuth, startDeviceAuth, storeTokens } from "./auth";
import { connectToChat } from "./chat";

let polling = false;
let pollInterval: number | null = null;

// Check for existing tokens and update UI accordingly
function initAuth(): void {
  const tokens = getStoredTokens();
  if (tokens) {
    document.getElementById("connect-view")?.classList.add("hidden");
    document.getElementById("connected-view")?.classList.remove("hidden");
    // Update debug display
    const debugElement = document.getElementById("debug-tokens");
    if (debugElement) {
      debugElement.textContent = JSON.stringify(tokens, null, 2);
    }
  }
}

// Handle disconnect button click
function handleDisconnect(): void {
  clearTokens();
  document.getElementById("connected-view")?.classList.add("hidden");
  document.getElementById("connect-view")?.classList.remove("hidden");
}

// Start the authentication process
async function startAuth(): Promise<void> {
  try {
    document.getElementById("connect-view")?.classList.add("hidden");
    document.getElementById("verification-view")?.classList.remove("hidden");

    const auth = await startDeviceAuth();
    const userCodeElement = document.getElementById("user-code");
    if (userCodeElement) {
      userCodeElement.textContent = auth.user_code;
    }

    // Start polling for auth completion
    polling = true;
    pollInterval = window.setInterval(async () => {
      if (!polling) return;

      const tokens = await pollAuth(auth.device_code);
      if (tokens) {
        polling = false;
        if (pollInterval) clearInterval(pollInterval);

        // Show connected view
        document.getElementById("verification-view")?.classList.add("hidden");
        document.getElementById("connected-view")?.classList.remove("hidden");

        // Store tokens and update debug information
        storeTokens(tokens);
        const debugElement = document.getElementById("debug-tokens");
        if (debugElement) {
          debugElement.textContent = JSON.stringify(tokens, null, 2);
        }

        // Initialize chat with new tokens
        initChat();
      }
    }, auth.interval * 1000);

    // Set a timeout to stop polling after the expires_in period
    setTimeout(() => {
      if (polling) {
        polling = false;
        if (pollInterval) clearInterval(pollInterval);
        alert("Verification timeout. Please try again.");
        document.getElementById("verification-view")?.classList.add("hidden");
        document.getElementById("connect-view")?.classList.remove("hidden");
      }
    }, auth.expires_in * 1000);
  } catch (error) {
    console.error("Error starting auth:", error);
    alert("Failed to start authentication. Please try again.");
    document.getElementById("verification-view")?.classList.add("hidden");
    document.getElementById("connect-view")?.classList.remove("hidden");
  }
}

// Initialize chat connection
async function initChat(): Promise<void> {
  await connectToChat();
}

function initialize(): void {
  const connectButton = document.getElementById("connect-button");
  const disconnectButton = document.getElementById("disconnect-button");

  if (connectButton) {
    connectButton.addEventListener("click", startAuth);
  }

  if (disconnectButton) {
    disconnectButton.addEventListener("click", handleDisconnect);
  }

  initAuth();
  // Initialize chat with stored tokens
  initChat();
}

// Wait for DOM to be loaded before initializing
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}
