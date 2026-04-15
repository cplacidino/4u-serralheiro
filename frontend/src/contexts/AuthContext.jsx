import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'
import { tokenStore } from '../services/tokenStore'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Ao carregar o app, verifica se já existe sessão salva
  useEffect(() => {
    const savedUser = tokenStore.getUser()
    const savedToken = tokenStore.getToken()
    if (savedUser && savedToken) {
      setUser(savedUser)
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password })
    const { token, user: userData } = response.data.data

    tokenStore.setToken(token)
    tokenStore.setUser(userData)
    setUser(userData)

    return userData
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Ignora erro no logout
    }
    tokenStore.clearToken()
    tokenStore.clearUser()
    setUser(null)
  }

  const updateUser = (fields) => {
    setUser(prev => {
      const updated = { ...prev, ...fields }
      tokenStore.setUser(updated)
      return updated
    })
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return context
}
