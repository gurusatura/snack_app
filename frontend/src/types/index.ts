export type Role = "admin" | "member";

export type SnackCategory = "sweet" | "savoury" | "drink" | "healthy-ish";

export type SnackStatus = "gone" | "running_low" | "stocked";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface Snack {
  id: number;
  name: string;
  category: SnackCategory;
  quantity: number;
  low_stock_threshold: number;
  status: SnackStatus;
  created_at: string;
  votes_count: number;
  user_voted: boolean;
}

export interface SnackListResponse {
  items: Snack[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface StockSummary {
  gone: number;
  running_low: number;
  stocked: number;
}

export interface SnackOfTheWeek {
  id: number;
  name: string;
  votes: number;
}

export interface SnackSummaryResponse {
  stock_summary: StockSummary;
  snack_of_the_week: SnackOfTheWeek | null;
}

export interface ApiError {
  error?: {
    code: string;
    message: string;
  };
}

export interface ActivityItem {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  snack_id: number;
  snack_name: string;
  action: "consumed" | "restocked" | string;
  amount: number;
  created_at: string;
}

export interface ActivityListResponse {
  items: ActivityItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface LoginHistoryItem {
  id: number;
  user_id: number | null;
  user_name: string | null;
  user_email: string | null;
  attempted_email: string | null;
  success: boolean;
  timestamp: string;
}

export interface LoginHistoryListResponse {
  items: LoginHistoryItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
