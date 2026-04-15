import { useEffect, useRef } from 'react'

// Chama a função `fn` imediatamente e depois a cada `intervalMs` milissegundos.
// Para automaticamente quando o componente é desmontado.
const useAutoRefresh = (fn, intervalMs = 30000) => {
  const fnRef = useRef(fn)
  fnRef.current = fn // sempre usa a versão mais recente sem re-criar o interval

  useEffect(() => {
    const id = setInterval(() => fnRef.current(), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
}

export default useAutoRefresh
