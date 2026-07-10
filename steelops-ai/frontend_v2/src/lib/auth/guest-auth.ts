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

function toPublicUser(stored: StoredGuestUser): User {
  const { id, email, full_name, role, tenant_id, is_active } = stored;
  return { id, email, full_name, role, tenant_id, is_active };
}

export function isGuestAuthMode(): boolean {
  // Enterprise JWT against EAF backend is the default.
  // Opt into local guest mode only with NEXT_PUBLIC_AUTH_MODE=guest
  return process.env.NEXT_PUBLIC_AUTH_MODE === "guest";
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
  return toPublicUser(user);
}

export async function guestLogin(payload: LoginRequest): Promise<{ tokens: TokenResponse; user: User }> {
  const users = loadUsers();
  const match = users.find(
    (u) => u.email.toLowerCase() === payload.email.toLowerCase() && u.password === payload.password
  );
  if (!match) {
    throw new Error("Invalid email or password");
  }
  return { tokens: guestTokens(), user: toPublicUser(match) };
}

export function guestMe(): User | null {
  const token = typeof window !== "undefined" ? localStorage.getItem(ACCESS_TOKEN_KEY) : null;
  if (token !== GUEST_ACCESS_TOKEN) return null;
  const users = loadUsers();
  const sessionEmail = localStorage.getItem("jspl-eaf-guest-session");
  if (!sessionEmail) return null;
  const match = users.find((u) => u.email === sessionEmail);
  if (!match) return null;
  return toPublicUser(match);
}

export function setGuestSession(email: string): void {
  localStorage.setItem("jspl-eaf-guest-session", email);
}

export function clearGuestSession(): void {
  localStorage.removeItem("jspl-eaf-guest-session");
}
