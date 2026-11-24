import axios, { AxiosError } from "axios";
import { ApiError } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000,
  headers: {
    "Content-Type": "application/json",
  },
});

// In-memory token reference for axios interceptor
let memoryToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  memoryToken = token;
};

export const getAuthToken = () => memoryToken;

api.interceptors.request.use((config) => {
  if (memoryToken) {
    config.headers.Authorization = `Bearer ${memoryToken}`;
  }
  return config;
});

export const getApiErrorMessage = (error: unknown, fallback: string = "An unexpected error occurred"): string => {
  const err = error as any;
  let data = err?.response?.data;

  // Handle case where error response body might be a JSON string
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      // Keep as string
    }
  }

  // 1. Direct standard contract: error.response.data.error.message
  if (data?.error?.message && typeof data.error.message === "string") {
    return data.error.message;
  }

  // 2. FastAPI HTTPException detail format: error.response.data.detail.error.message
  if (data?.detail?.error?.message && typeof data.detail.error.message === "string") {
    return data.detail.error.message;
  }

  // 3. String detail: error.response.data.detail
  if (typeof data?.detail === "string" && data.detail.trim()) {
    return data.detail.trim();
  }

  // 4. Direct message field: error.response.data.message
  if (typeof data?.message === "string" && data.message.trim()) {
    return data.message.trim();
  }

  // 5. Direct error field if string: error.response.data.error
  if (typeof data?.error === "string" && data.error.trim()) {
    return data.error.trim();
  }

  // 6. Network / timeout errors
  if (err?.code === "ECONNABORTED" || err?.message?.includes("timeout")) {
    return "Connection timed out due to network latency. Please try signing in.";
  }
  if (
    err?.message === "Network Error" ||
    err?.code === "ERR_NETWORK" ||
    err?.code === "ECONNREFUSED" ||
    !err?.response
  ) {
    return "Cannot reach backend server. Please verify the backend is running.";
  }

  // 7. Non-JSON string response body
  if (typeof data === "string" && data.trim() && !data.trim().startsWith("{")) {
    return data.trim();
  }

  // 8. Clean Axios message (ignore generic status code messages)
  if (err?.message && typeof err.message === "string" && !err.message.includes("status code")) {
    return err.message;
  }

  return fallback;
};
