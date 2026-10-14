import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  LANGUAGE_STORAGE_KEY,
  translations,
} from './translations'

const LanguageContext = createContext(null)

function readStoredLanguage() {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    return LANGUAGES.some((language) => language.code === stored) ? stored : DEFAULT_LANGUAGE
  } catch {
    return DEFAULT_LANGUAGE
  }
}

function getValue(source, key) {
  return key.split('.').reduce((current, part) => current?.[part], source)
}

function interpolate(value, params) {
  if (!params || typeof value !== 'string') {
    return value
  }
  return Object.entries(params).reduce(
    (text, [key, replacement]) => text.replaceAll(`{{${key}}}`, String(replacement)),
    value
  )
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(readStoredLanguage)

  useEffect(() => {
    const root = document.documentElement
    root.lang = language === 'si' ? 'si-LK' : 'en-LK'
    root.dataset.language = language
  }, [language])

  function setLanguage(nextLanguage) {
    const safeLanguage = LANGUAGES.some((item) => item.code === nextLanguage)
      ? nextLanguage
      : DEFAULT_LANGUAGE
    setLanguageState(safeLanguage)
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, safeLanguage)
    } catch {
      // If storage is blocked, keep the in-memory language for this session.
    }
  }

  const value = useMemo(() => {
    function t(key, params) {
      const translated = getValue(translations[language], key)
      const fallback = getValue(translations[DEFAULT_LANGUAGE], key)
      return interpolate(translated ?? fallback ?? key, params)
    }

    return {
      language,
      languages: LANGUAGES,
      setLanguage,
      t,
    }
  }, [language])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used inside LanguageProvider.')
  }
  return context
}

