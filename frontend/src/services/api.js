import axios from 'axios'
import { tokenStore } from './tokenStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Antes de cada requisição, adiciona o token JWT automaticamente
api.interceptors.request.use((config) => {
  const token = tokenStore.getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Se a API retornar 401, desloga o usuário
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      tokenStore.clearToken()
      tokenStore.clearUser()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
