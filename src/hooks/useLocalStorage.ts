import { useState, useEffect } from "react";

// Starts with `initial` on both server and client so hydration matches,
// then loads the stored value after mount.
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) setValue(JSON.parse(item) as T);
    } catch {
      /* corrupted value or storage unavailable */
    }
    setLoaded(true);
  }, [key]);

  useEffect(() => {
    // Wait until the stored value is loaded so `initial` never overwrites it.
    if (!loaded) return;
    try {
      if (value === null || value === undefined || value === "") {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    } catch {
      /* quota exceeded or private mode */
    }
  }, [key, value, loaded]);

  return [value, setValue] as const;
}
