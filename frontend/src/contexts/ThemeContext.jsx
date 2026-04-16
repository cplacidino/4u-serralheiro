import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext({ theme: 'dark', toggleTheme: () => {} })

const safeGetStorage = () => {
  try { return localStorage.getItem('theme') || 'dark' } catch { return 'dark' }
}
const safeSetStorage = (val) => {
  try { localStorage.setItem('theme', val) } catch { /* silencia */ }
}

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(safeGetStorage)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    safeSetStorage(theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
