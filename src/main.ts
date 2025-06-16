import { handleAuthFlow } from "./auth";
import { connectToChat, disconnectChat } from "./chat";
import { clearTokenData, loadTokenData } from "./storage";
import { showInitialState, updateUIWithTokenData } from "./ui";

const handleReset = async () => {
  await disconnectChat();
  clearTokenData();
  showInitialState();
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
