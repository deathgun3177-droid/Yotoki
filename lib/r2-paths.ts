export const r2StoragePrefix = "r2://";

export function isR2StoragePath(value?: string | null) {
  return typeof value === "string" && value.startsWith(r2StoragePrefix);
}

export function toR2StoragePath(key: string) {
  return `${r2StoragePrefix}${key.replace(/^\/+/, "")}`;
}

export function fromR2StoragePath(path: string) {
  return path.startsWith(r2StoragePrefix) ? path.slice(r2StoragePrefix.length) : path;
}
