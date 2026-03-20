// services/authService.ts

import { apiRequest } from "./api";

export function signupUser(data: {
  name: string;
  email: string;
  password: string;
}) {
  return apiRequest("/auth/signup", "POST", data);
}

export function loginUser(data: { email: string; password: string }) {
  return apiRequest("/auth/login", "POST", data);
}

export function forgotPassword(data: { email: string }) {
  return apiRequest("/auth/forgot-password", "POST", data);
}

export function resetPassword(token: string, data: { password: string }) {
  return apiRequest(`/auth/reset-password/${token}`, "POST", data);
}

export function resendVerification(data: { email: string }) {
  return apiRequest("/auth/resend-verification", "POST", data);
}

// BUG FIX #3: getMe accepted a `token` argument but never forwarded it —
// the request was always unauthenticated. Now uses requiresAuth=true so
// apiRequest injects the stored token into the Authorization header.
export function getMe() {
  return apiRequest("/auth/me", "GET", undefined, true);
}