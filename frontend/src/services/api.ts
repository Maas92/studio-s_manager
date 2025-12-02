import axios, { type AxiosRequestConfig } from "axios";

type RetryableConfig = AxiosRequestConfig & { __isRetryRequest?: boolean };

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

// REQUEST interceptor - attach token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let refreshing = false;
let sharedRefreshPromise: Promise<unknown> | null = null;

// RESPONSE interceptor - handle 401 and refresh
api.interceptors.response.use(
  (res) => {
    // Store token if it comes in any response
    if (res.data?.token) {
      localStorage.setItem("accessToken", res.data.token);
    }
    return res;
  },
  async (error) => {
    const original = (error.config || {}) as RetryableConfig;
    const is401 = error.response?.status === 401;
    const isRefreshCall = (original.url || "").includes("/auth/refresh");

    // If we get 401 and it's not the refresh call itself
    if (is401 && !isRefreshCall && !original.__isRetryRequest) {
      if (!refreshing) {
        refreshing = true;
        sharedRefreshPromise = api
          .post("/auth/refresh")
          .then((response) => {
            // CRITICAL: Store the new token immediately
            if (response.data?.token) {
              localStorage.setItem("accessToken", response.data.token);
            } else {
              console.error("No token in refresh response:", response.data);
            }
            return response;
          })
          .catch((err) => {
            // Refresh failed - clear token and redirect to login
            localStorage.removeItem("accessToken");
            window.location.href = "/login";
            throw err;
          })
          .finally(() => {
            refreshing = false;
            sharedRefreshPromise = null;
          });
      }

      try {
        await sharedRefreshPromise;

        // Retry the original request with the new token
        original.__isRetryRequest = true;
        const token = localStorage.getItem("accessToken");
        if (token) {
          original.headers = original.headers || {};
          original.headers.Authorization = `Bearer ${token}`;
        }

        return api(original);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export { api };
