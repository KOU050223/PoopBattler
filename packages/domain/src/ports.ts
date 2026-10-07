export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface PhotoStore {
  put(id: string, data: ArrayBuffer): Promise<void>;
  get(id: string): Promise<ArrayBuffer | null>;
  delete(id: string): Promise<void>;
}

export interface Clock {
  now(): Date;
}

// useSyncExternalStore 等で同期読み出しが要る箇所用。Web の localStorage がそのまま満たす。
export interface SyncKeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
