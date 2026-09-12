const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("karmate_token");
}

async function request(path, { method = "GET", body, isFormData = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!isFormData && body) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    /* no body */
  }

  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  API_URL,
  mediaUrl: (path) => (path?.startsWith("http") ? path : `${API_URL}${path}`),

  register: (payload) => request("/api/auth/register", { method: "POST", body: payload }),
  login: (payload) => request("/api/auth/login", { method: "POST", body: payload }),
  me: () => request("/api/auth/me"),

  listReports: (status) => request(`/api/reports${status ? `?status=${status}` : ""}`),
  getReport: (id) => request(`/api/reports/${id}`),
  createReport: (formData) => request("/api/reports", { method: "POST", body: formData, isFormData: true }),
  appealReport: (id) => request(`/api/reports/${id}/appeal`, { method: "POST" }),

  vote: (id, voteChoice) => request(`/api/reports/${id}/votes`, { method: "POST", body: { voteChoice } }),

  enterCourt: (id) => request(`/api/reports/${id}/enter`, { method: "POST" }),
  getChat: (id) => request(`/api/reports/${id}/chat`),
  postChat: (id, payload) => request(`/api/reports/${id}/chat`, { method: "POST", body: payload }),

  // Binary audio response, not JSON — can't reuse request(). Resolves to a
  // Blob on success; throws (with err.data.error) on a JSON error response,
  // e.g. { error: "tts_not_configured" } when no ElevenLabs key is set.
  async fetchSpeech(reportId, messageId) {
    const token = getToken();
    const res = await fetch(`${API_URL}/api/reports/${reportId}/messages/${messageId}/speech`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await res.json().catch(() => null);
      const err = new Error(data?.error || `Request failed (${res.status})`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    return res.blob();
  },

  listTasks: () => request("/api/tasks"),
  suggestRevenge: (reportId) => request(`/api/tasks/${reportId}/suggest`),
  acceptTask: (reportId, payload) => request(`/api/tasks/${reportId}/accept`, { method: "POST", body: payload }),
  submitTask: (taskId) => request(`/api/tasks/${taskId}/submit`, { method: "POST" }),
  completeTask: (taskId) => request(`/api/tasks/${taskId}/complete`, { method: "POST" }),
};

export { getToken };
