export type ColorMode = 'light' | 'dark' | 'system';
export type TableDensity = 'compact' | 'comfortable';
export interface Preferences {
  readonly colorMode: ColorMode;
  readonly density: TableDensity;
  readonly locale: 'en' | 'fa';
  readonly showBalances: boolean;
  readonly confirmCancellation: boolean;
  readonly desktopNotifications: boolean;
  readonly keyboardShortcuts: boolean;
  readonly refreshIntervalSeconds: number;
  readonly homeRoute: string;
  readonly hiddenColumns: readonly string[];
}
export const defaultPreferences: Preferences = {
  colorMode: 'system', density: 'comfortable', locale: 'en', showBalances: true,
  confirmCancellation: true, desktopNotifications: false, keyboardShortcuts: true,
  refreshIntervalSeconds: 15, homeRoute: '/overview', hiddenColumns: [],
};

/** Persistence lives outside the reducer to keep browser/storage effects separate. */
export function updatePreferences(current: Preferences, patch: Partial<Preferences>): Preferences {
  const interval = patch.refreshIntervalSeconds ?? current.refreshIntervalSeconds;
  return {
    ...current, ...patch,
    refreshIntervalSeconds: Math.max(5, Math.min(300, interval)),
    hiddenColumns: patch.hiddenColumns ? [...new Set(patch.hiddenColumns)] : current.hiddenColumns,
  };
}

export function parsePreferences(serialized: string | null): Preferences {
  if (!serialized) return defaultPreferences;
  try {
    const input: unknown = JSON.parse(serialized);
    if (!input || typeof input !== 'object') return defaultPreferences;
    const fields = input as Record<string, unknown>;
    return updatePreferences(defaultPreferences, {
      colorMode: fields['colorMode'] === 'dark' || fields['colorMode'] === 'light'
        ? fields['colorMode'] : 'system',
      density: fields['density'] === 'compact' ? 'compact' : 'comfortable',
      locale: fields['locale'] === 'fa' ? 'fa' : 'en',
      showBalances: typeof fields['showBalances'] === 'boolean' ? fields['showBalances'] : true,
      refreshIntervalSeconds: typeof fields['refreshIntervalSeconds'] === 'number'
        && Number.isFinite(fields['refreshIntervalSeconds']) ? fields['refreshIntervalSeconds'] : 15,
    });
  } catch { return defaultPreferences; }
}
