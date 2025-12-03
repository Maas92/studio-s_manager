import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";

const BASE = "http://localhost:4000"; //process.env.VITE_API_BASE_URL; // gateway

// Create single shared axios instance
const api: AxiosInstance = axios.create({
  baseURL: BASE,
  withCredentials: true, // important: send cookies (refresh cookie)
  headers: {
    "Content-Type": "application/json",
  },
});

// --- Refresh queue logic ---
let isRefreshing = false;
type QueueItem = {
  resolve: (value?: any) => void;
  reject: (err?: any) => void;
  config: InternalAxiosRequestConfig;
};
let failedQueue: QueueItem[] = [];

const processQueue = (error: any, token?: string | null) => {
  failedQueue.forEach((p) => {
    if (error) {
      p.reject(error);
    } else {
      if (token) {
        // attach token if you return one from refresh (optional)
        p.config.headers = p.config.headers || {};
        p.config.headers["Authorization"] = `Bearer ${token}`;
      }
      p.resolve(api(p.config));
    }
  });
  failedQueue = [];
};

// --- Interceptor setup function (call once in app root) ---
export function setupInterceptors(onLogout?: () => void) {
  // request interceptor (optional for adding auth header from in-memory token)
  api.interceptors.request.use(
    (config) => {
      // if you store an access token in memory, attach here:
      // const token = authStore.getAccessToken();
      // if (token && !config.headers?.Authorization) config.headers.Authorization = `Bearer ${token}`;
      return config;
    },
    (error) => Promise.reject(error)
  );

  // response interceptor handles 401 -> refresh flow
  api.interceptors.response.use(
    (res) => res,
    async (err: AxiosError & { config?: InternalAxiosRequestConfig }) => {
      const originalRequest = err.config;

      // If no response or not a 401, reject
      if (!err.response || err.response.status !== 401) {
        return Promise.reject(err);
      }

      // Avoid infinite loop if refresh endpoint itself returned 401
      if (
        originalRequest &&
        originalRequest.url &&
        originalRequest.url.includes("/auth/refresh")
      ) {
        // logout user
        onLogout?.();
        return Promise.reject(err);
      }

      // If already refreshing, queue the request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          if (!originalRequest) return reject(err);
          failedQueue.push({ resolve, reject, config: originalRequest });
        });
      }

      isRefreshing = true;

      try {
        // Call refresh endpoint on gateway. Server should set a new refresh cookie and possibly return an access token.
        const refreshRes = await api.post("/auth/refresh");

        // If your server returns an accessToken in the response body, extract it:
        const newAccessToken = refreshRes?.data?.accessToken ?? null;

        // Optional: if you maintain access token in memory, set it here (auth store)
        // authStore.setAccessToken(newAccessToken);

        processQueue(null, newAccessToken);
        isRefreshing = false;

        // Attach token to original request if present
        if (newAccessToken && originalRequest) {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
        }

        return api(originalRequest as InternalAxiosRequestConfig);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        // optional: call logout / redirect to login
        onLogout?.();
        return Promise.reject(refreshError);
      }
    }
  );
}

export default api;
