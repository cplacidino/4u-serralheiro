// Armazena o token em memória (funciona sempre) + localStorage (bônus para recarregar página)
let _token = null
let _user = null

export const tokenStore = {
  setToken(token) {
    _token = token
    try { localStorage.setItem('4u_token', token) } catch {}
  },
  getToken() {
    if (_token) return _token
    try { return localStorage.getItem('4u_token') } catch {}
    return null
  },
  clearToken() {
    _token = null
    try { localStorage.removeItem('4u_token') } catch {}
  },
  setUser(user) {
    _user = user
    try { localStorage.setItem('4u_user', JSON.stringify(user)) } catch {}
  },
  getUser() {
    if (_user) return _user
    try {
      const saved = localStorage.getItem('4u_user')
      return saved ? JSON.parse(saved) : null
    } catch {}
    return null
  },
  clearUser() {
    _user = null
    try { localStorage.removeItem('4u_user') } catch {}
  },
}
