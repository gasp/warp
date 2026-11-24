import { reactive, watch } from 'vue'

type Settings = Record<string, boolean | number | string>

/**
 * `defaults` overlaid with what `key` holds in localStorage. A saved value
 * only replaces a default of the same type, so a renamed or retyped setting
 * falls back to its default.
 */
export function loadSettings<T extends Settings>(key: string, defaults: T): T {
  const settings = { ...defaults }
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? 'null')
    for (const name of Object.keys(defaults) as (keyof T)[]) {
      if (typeof saved?.[name] === typeof defaults[name]) {
        settings[name] = saved[name]
      }
    }
  } catch {
    // unreadable or blocked storage: defaults
  }
  return settings
}

export function saveSettings(key: string, settings: Settings) {
  try {
    localStorage.setItem(key, JSON.stringify(settings))
  } catch {
    // storage unavailable: the settings last for this session
  }
}

/**
 * Reactive settings saved under `key` on every change. Tabs unmount when
 * left, so storage is what carries settings to the next visit and to the
 * other tabs.
 */
export function persisted<T extends Settings>(key: string, defaults: T): T {
  const settings = reactive(loadSettings(key, defaults)) as T
  watch(settings, () => saveSettings(key, settings))
  return settings
}
