import { ACCESS_TOKEN_KEY } from "@/lib/constants";
import type { LoginRequest, RegisterRequest, TokenResponse, User } from "@/types";

const USERS_KEY = "jspl-eaf-guest-users";
const GUEST_ACCESS_TOKEN = "guest-access-token";
const GUEST_REFRESH_TOKEN = "guest-refresh-token";

interface StoredGuestUser extends User {
  password: string;
}

function loadUsers(): StoredGuestUser[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) ?? "[]") as StoredGuestUser[];
  } catch {
    return [];
  }
}

function saveUsers(users: StoredGuestUser[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function isGuestAuthMode(): boolean {
  if (process.env.NEXT_PUBLIC_AUTH_MODE === "api") return false;
  if (process.env.NEXT_PUBLIC_AUTH_MODE === "guest") return true;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  return !apiUrl || apiUrl.includes("localhost");
}

export function guestTokens(): TokenResponse {
  return {
    access_token: GUEST_ACCESS_TOKEN,
    refresh_token: GUEST_REFRESH_TOKEN,
    token_type: "bearer",
    expires_in: 60 * 60 * 24 * 30,
  };
}

export async function guestRegister(payload: RegisterRequest): Promise<User> {
  const users = loadUsers();
  if (users.some((u) => u.email.toLowerCase() === payload.email.toLowerCase())) {
    throw new Error("An account with this email already exists");
  }
  const user: StoredGuestUser = {
    id: crypto.randomUUID(),
    email: payload.email,
    full_name: payload.full_name,
    role: "operator",
    tenant_id: payload.tenant_slug ?? "jspl-angul",
    is_active: true,
    password: payload.password,
  };
  saveUsers([...users, user]);
  const { password: _, ...publicUser } = user;
  return publicUser;
}

export async function guestLogin(payload: LoginRequest): Promise<{ tokens: TokenResponse; user: User }> {
  const users = loadUsers();
  const match = users.find(
    (u) => u.email.toLowerCase() === payload.email.toLowerCase() && u.password === payload.password
  );
  if (!match) {
    throw new Error("Invalid email or password");
  }
  const { password: _, ...user } = match;
  return { tokens: guestTokens(), user };
}

export function guestMe(): User | null {
  const token = typeof window !== "undefined" ? localStorage.getItem(ACCESS_TOKEN_KEY) : null;
  if (token !== GUEST_ACCESS_TOKEN) return null;
  const users = loadUsers();
  const sessionEmail = localStorage.getItem("jspl-eaf-guest-session");
  if (!sessionEmail) return null;
  const match = users.find((u) => u.email === sessionEmail);
  if (!match) return null;
  const { password: _, ...user } = match;
  return user;
}

export function setGuestSession(email: string): void {
  localStorage.setItem("jspl-eaf-guest-session", email);
}

export function clearGuestSession(): void {
  localStorage.removeItem("jspl-eaf-guest-session");
}
