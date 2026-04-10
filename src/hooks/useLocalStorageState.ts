import {useState, useCallback} from 'react';

export function useLocalStorageState<T>(
  key: string,
  defaultValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? (JSON.parse(stored) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setStateAndPersist = useCallback(
    (value: React.SetStateAction<T>) => {
      setState(prev => {
        const next =
          typeof value === 'function' ? (value as (prev: T) => T)(prev) : value;
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // ignore (e.g. private browsing storage quota)
        }
        return next;
      });
    },
    [key]
  );

  return [state, setStateAndPersist];
}
