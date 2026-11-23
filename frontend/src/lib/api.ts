import axios, { AxiosError } from "axios";
import { ApiError } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
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
  if (err?.response?.data?.error?.message) {
    return err.response.data.error.message;
  }
  if (err?.response?.data?.detail?.error?.message) {
    return err.response.data.detail.error.message;
  }
  if (typeof err?.response?.data?.detail === "string") {
    return err.response.data.detail;
  }
  if (typeof err?.response?.data === "string" && err.response.data.trim()) {
    return err.response.data.trim();
  }
  if (err?.code === "ECONNABORTED" || err?.message?.includes("timeout")) {
    return "Connection timed out due to network latency. Please try signing in.";
  }
  if (
    err?.message === "Network Error" ||
    err?.code === "ERR_NETWORK" ||
    err?.code === "ECONNREFUSED" ||
    !err?.response
  ) {
    return "Cannot reach backend server. Please verify the backend is running on http://localhost:8000.";
  }
  if (err?.message && typeof err.message === "string" && !err.message.includes("status code")) {
    return err.message;
  }
  return fallback;
};
