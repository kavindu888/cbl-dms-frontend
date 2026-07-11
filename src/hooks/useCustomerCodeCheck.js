import { useEffect, useRef, useState } from 'react'
import { salesService } from '@services/api/salesService'

export function useCustomerCodeCheck(code) {
  const [status, setStatus] = useState('idle')
  const timerRef = useRef(null)
  const latestRef = useRef('')

  useEffect(() => {
    const trimmed = (code ?? '').trim().toUpperCase()

    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    latestRef.current = trimmed

    if (trimmed.length < 2) {
      setStatus('idle')
      return undefined
    }

    setStatus('checking')

    timerRef.current = setTimeout(async () => {
      if (latestRef.current !== trimmed) return

      try {
        const data = await salesService.checkCustomerCode(trimmed)
        if (latestRef.current !== trimmed) return
        setStatus(data.available ? 'available' : 'taken')
      } catch {
        if (latestRef.current === trimmed) {
          setStatus('idle')
        }
      }
    }, 300)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [code])

  return status
}

