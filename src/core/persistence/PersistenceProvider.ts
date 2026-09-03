// PersistenceProvider.ts
// Abstract contract for persistent operating system storage with schema versioning and migrations

export const ROCKET_DATA_SCHEMA_VERSION = 2;

export const PERSISTENCE_KEYS = {
  SCHEMA_VERSION: 'rocket_schema_version',
  VFS: 'rocket_vfs_state',
  TRASH: 'rocket_trash_state',
  NOTES: 'rocket_notes_state',
  PAINT: 'rocket_paint_state',
  SETTINGS: 'rocket_settings_state',
  PINNED_APPS: 'rocket_pinned_apps_state',
  WORKSPACES: 'rocket_workspaces_state',
  WINDOW_SESSION: 'rocket_window_session_state',
} as const;

export type PersistenceKey = typeof PERSISTENCE_KEYS[keyof typeof PERSISTENCE_KEYS];

export interface IPersistenceProvider {
  init(): Promise<void>;
  getItem<T>(key: string): Promise<T | null>;
  setItem<T>(key: string, value: T): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
  getSchemaVersion(): Promise<number>;
  migrateIfNeeded(): Promise<void>;
}
