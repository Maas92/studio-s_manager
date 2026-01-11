import api from "../services/api";

export async function checkGoogleConnection() {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 5000);

  try {
    const response = await api.get("/google-contacts/status", {
      signal: controller.signal,
    });
    return response.data.connected;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function connectGoogleAccount() {
  const response = await api.get("/google-contacts/connect");

  // Redirect user to Google OAuth page
  window.location.href = response.data.auth_url;
}

export async function syncGoogleContacts() {
  const response = await api.post("/google-contacts/sync");
  console.log("Sync response:", response);
  return response.data;
}

export async function disconnectGoogleAccount() {
  const response = await api.delete("/google-contacts/disconnect");
  return response.data;
}
