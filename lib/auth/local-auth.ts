import type { YotokiUser } from "@/lib/types";
import { getUserRole } from "@/lib/auth/roles";
import { isValidUserNumber, maxUserNumber, minUserNumber } from "@/lib/auth/user-number";

export const localAuthStorageKey = "yotoki:local-user";
export const localAuthEventName = "yotoki:auth-change";
const localUserNumbersStorageKey = "yotoki:local-user-numbers";
const localUsersStorageKey = "yotoki:local-users";

export function readLocalAuthUser(): YotokiUser | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(localAuthStorageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as YotokiUser;

    if (typeof parsed.id !== "string" || typeof parsed.email !== "string") {
      return null;
    }

    if (isValidUserNumber(parsed.userNumber)) {
      if (parsed.role) {
        upsertLocalUser(parsed);
        return parsed;
      }

      const migratedUser = {
        ...parsed,
        role: getUserRole(parsed.email)
      };
      window.localStorage.setItem(localAuthStorageKey, JSON.stringify(migratedUser));
      upsertLocalUser(migratedUser);
      return migratedUser;
    }

    const migratedUser = {
      ...parsed,
      userNumber: claimAvailableLocalUserNumber(),
      role: getUserRole(parsed.email)
    };
    window.localStorage.setItem(localAuthStorageKey, JSON.stringify(migratedUser));
    upsertLocalUser(migratedUser);

    return migratedUser;
  } catch {
    return null;
  }
}

export function saveLocalAuthUser(user: YotokiUser) {
  window.localStorage.setItem(localAuthStorageKey, JSON.stringify(user));
  upsertLocalUser(user);
  window.dispatchEvent(new Event(localAuthEventName));
}

export function clearLocalAuthUser() {
  window.localStorage.removeItem(localAuthStorageKey);
  window.dispatchEvent(new Event(localAuthEventName));
}

export function createLocalAuthUser(email: string, displayName?: string): YotokiUser {
  return {
    id: createUserId(),
    userNumber: claimAvailableLocalUserNumber(),
    email,
    role: getUserRole(email),
    displayName: displayName?.trim() || undefined,
    provider: "local",
    createdAt: new Date().toISOString()
  };
}

export function findLocalUserByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  return readLocalUsers().find((user) => user.email.trim().toLowerCase() === normalizedEmail) ?? null;
}

export function readLocalUsers(): YotokiUser[] {
  if (typeof window === "undefined") return [];

  const users = readStoredLocalUsers();
  const currentUser = readCurrentLocalUserWithoutRegistryWrite();

  if (currentUser && !users.some((user) => user.id === currentUser.id)) {
    users.unshift(currentUser);
    writeLocalUsers(users);
  }

  return users.sort((a, b) => (Date.parse(b.createdAt ?? "") || 0) - (Date.parse(a.createdAt ?? "") || 0));
}

export function updateLocalUser(updatedUser: YotokiUser) {
  upsertLocalUser(updatedUser);

  const currentUser = readCurrentLocalUserWithoutRegistryWrite();
  if (currentUser?.id === updatedUser.id) {
    window.localStorage.setItem(localAuthStorageKey, JSON.stringify(updatedUser));
    window.dispatchEvent(new Event(localAuthEventName));
  }
}

function upsertLocalUser(user: YotokiUser) {
  if (typeof window === "undefined") return;

  const users = readStoredLocalUsers();
  const existingIndex = users.findIndex((item) => item.id === user.id);

  if (existingIndex >= 0) {
    users[existingIndex] = user;
  } else {
    users.unshift(user);
  }

  writeLocalUsers(users);
}

function readStoredLocalUsers() {
  try {
    const raw = window.localStorage.getItem(localUsersStorageKey);
    const parsed = raw ? (JSON.parse(raw) as YotokiUser[]) : [];
    return Array.isArray(parsed) ? parsed.filter(isUsableLocalUser) : [];
  } catch {
    return [];
  }
}

function writeLocalUsers(users: YotokiUser[]) {
  window.localStorage.setItem(localUsersStorageKey, JSON.stringify(users));
}

function readCurrentLocalUserWithoutRegistryWrite() {
  try {
    const raw = window.localStorage.getItem(localAuthStorageKey);
    const parsed = raw ? (JSON.parse(raw) as YotokiUser) : null;
    return parsed && isUsableLocalUser(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isUsableLocalUser(user: YotokiUser) {
  return typeof user.id === "string" && typeof user.email === "string" && isValidUserNumber(user.userNumber);
}

function claimAvailableLocalUserNumber() {
  const used = readUsedLocalUserNumbers();

  if (used.size >= maxUserNumber) {
    throw new Error("All YotoKi user IDs from #1 to #10000 are already taken.");
  }

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const candidate = randomUserNumber();
    if (!used.has(candidate)) {
      return saveClaimedUserNumber(candidate, used);
    }
  }

  for (let candidate = minUserNumber; candidate <= maxUserNumber; candidate += 1) {
    if (!used.has(candidate)) {
      return saveClaimedUserNumber(candidate, used);
    }
  }

  throw new Error("Could not reserve a YotoKi user ID.");
}

function readUsedLocalUserNumbers() {
  try {
    const raw = window.localStorage.getItem(localUserNumbersStorageKey);
    const parsed = raw ? (JSON.parse(raw) as unknown[]) : [];
    return new Set(parsed.map(Number).filter(isValidUserNumber));
  } catch {
    return new Set<number>();
  }
}

function saveClaimedUserNumber(userNumber: number, used: Set<number>) {
  used.add(userNumber);
  window.localStorage.setItem(localUserNumbersStorageKey, JSON.stringify([...used]));
  return userNumber;
}

function randomUserNumber() {
  const range = maxUserNumber - minUserNumber + 1;

  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    return minUserNumber + (buffer[0] % range);
  }

  return minUserNumber + Math.floor(Math.random() * range);
}

function createUserId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `local_${crypto.randomUUID()}`;
  }

  return `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
