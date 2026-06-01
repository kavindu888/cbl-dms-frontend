import { useEffect, useState } from 'react'
export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    if (typeof window === 'undefined') {
      return initialValue
    }
    const item = window.localStorage.getItem(key)
    if (!item) {
      return initialValue
    }
    try {
      return JSON.parse(item)
    } catch {
      return initialValue
    }
  })
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    window.localStorage.setItem(key, JSON.stringify(storedValue))
  }, [key, storedValue])
  return [storedValue, setStoredValue]
}
