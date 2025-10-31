import axios, { type AxiosRequestConfig } from 'axios';

type RetryableConfig = AxiosRequestConfig & { __isRetryRequest?: boolean };

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true
});

let refreshing = false;
let sharedRefreshPromise: Promise<unknown> | null = null;
let queue: Array<(err?: unknown) => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = (error.config || {}) as RetryableConfig;
    const is401 = error.response?.status === 401;
    const isRefreshCall = (original.url || '').includes('/auth/refresh');

    if (is401 && !isRefreshCall && !original.__isRetryRequest) {
      if (!refreshing) {
        refreshing = true;
        sharedRefreshPromise = api.post('/auth/refresh').finally(() => {
          refreshing = false;
        });
      }
      try {
        await sharedRefreshPromise;
      } catch (e) {
        const fns = queue.slice();
        queue = [];
        fns.forEach((fn) => fn(e));
        return Promise.reject(error);
      }
      return new Promise((resolve, reject) => {
        queue.push((err) => {
          if (err) return reject(err);
          try {
            original.__isRetryRequest = true;
            resolve(api(original));
          } catch (e) {
            reject(e);
          }
        });
      });
    }
    return Promise.reject(error);
  }
);

export { api };