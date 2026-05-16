// Make sure this points to your running backend
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

let currentGameId = typeof window !== 'undefined' ? localStorage.getItem('btf_game_id') : null;
let currentSessionToken = typeof window !== 'undefined' ? localStorage.getItem('btf_session_token') : null;

/**
 * Starts a new game session by calling the backend.
 */
async function startNewGame(userAddress, difficulty, staked = false) {
  try {
    const response = await fetch(`${API_BASE_URL}/game/new`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_address: userAddress, difficulty, num_inaccessible_locations: 5, staked }),
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    
    currentGameId = data.game_id;
    currentSessionToken = data.session_token;
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('btf_game_id', currentGameId);
      localStorage.setItem('btf_session_token', currentSessionToken);
    }
    
    return data;
  } catch (error) {
    console.error("Error starting new game:", error);
    return null;
  }
}

/**
 * Fetches the next part of a conversation from the backend.
 */
async function getConversation(villagerId, playerMessage, userAddress = null) {
  if (!currentGameId || !currentSessionToken) return null;
  try {
    const response = await fetch(`${API_BASE_URL}/game/${currentGameId}/interact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        villager_id: villagerId, 
        player_prompt: playerMessage, 
        user_address: userAddress,
        session_token: currentSessionToken
      }),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Error getting conversation:", error);
    return null;
  }
}

/**
 * Submits final game result for anchoring and reward.
 */
async function submitGameResult(resultData) {
  try {
    const response = await fetch(`${API_BASE_URL}/game/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...resultData,
        session_token: currentSessionToken
      }),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Error submitting game result:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Sends the player's chosen location to the backend.
 */
async function chooseLocation(location, userAddress) {
  if (!currentGameId || !currentSessionToken) return null;
  try {
    const response = await fetch(`${API_BASE_URL}/game/${currentGameId}/guess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        location_name: location,
        user_address: userAddress,
        session_token: currentSessionToken
      }),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Error choosing location:", error);
    return null;
  }
}

/**
 * Mints an item via the backend.
 */
async function mintItem(userAddress, itemName) {
  if (!currentSessionToken) return { success: false, error: "No active session" };
  try {
    const response = await fetch(`${API_BASE_URL}/game/mint-item`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        user_address: userAddress, 
        item_name: itemName,
        session_token: currentSessionToken
      }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Minting Error details:", errorData);
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error minting item:", error);
    return { success: false, error: error.message };
  }
}


/**
 * Pings the server.
 */
async function pingServer() {
  try {
    const response = await fetch(`${API_BASE_URL}/ping`);
    return await response.json();
  } catch (error) {
    console.warn("Server ping failed:", error);
  }
}

async function mintAvatarNft(userAddress, avatarId) {
  try {
    const response = await fetch(`${API_BASE_URL}/game/mint-avatar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_address: userAddress, avatar_id: avatarId }),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Error minting avatar iNFT:", error);
    return { success: false, error: error.message };
  }
}

export { startNewGame, getConversation, chooseLocation, pingServer, submitGameResult, mintItem, mintAvatarNft };
