import { useEffect } from 'react'
import { handleFormKeyboardEvent } from '@/utils/formKeyBindings'

export default function FormKeyboardManager() {
  useEffect(() => {
    document.addEventListener('keydown', handleFormKeyboardEvent)
    return () => document.removeEventListener('keydown', handleFormKeyboardEvent)
  }, [])

  return null
}
