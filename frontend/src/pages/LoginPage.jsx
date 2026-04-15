import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'

const loginSchema = z.object({
  email: z.email('E-mail inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
})

const LoginPage = () => {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [loginError, setLoginError] = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
  })

  // Se já está logado, redireciona
  useEffect(() => {
    if (user) {
      navigate(user.role === 'superadmin' ? '/admin' : '/dashboard', { replace: true })
    }
  }, [user, navigate])

  const onSubmit = async (data) => {
    setIsLoading(true)
    setLoginError('')
    try {
      const userData = await login(data.email, data.password)
      toast.success(`Bem-vindo, ${userData.name}!`)
      navigate(userData.role === 'superadmin' ? '/admin' : '/dashboard', { replace: true })
    } catch (error) {
      const message = error.response?.data?.message || 'Erro ao fazer login. Tente novamente.'
      setLoginError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #0d0d0f 0%, #111114 50%, #1a1a1f 100%)' }}
    >
      {/* Textura de fundo — parafusos industriais */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `radial-gradient(circle, #f97316 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Logo e nome */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #f97316, #ea6c10)', boxShadow: '0 0 40px rgba(249,115,22,0.3)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#e0e0ec' }}>
            4u <span style={{ color: '#f97316' }}>Serralheiro</span>
          </h1>
          <p className="mt-1 text-sm" style={{ color: '#8a8a9a' }}>
            Sistema de gestão para serralherias
          </p>
        </div>

        {/* Card de login */}
        <div
          className="rounded-2xl p-6"
          style={{ background: '#1a1a1f', border: '1px solid #2e2e35', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}
        >
          <h2 className="text-lg font-semibold mb-5" style={{ color: '#e0e0ec' }}>
            Entrar na sua conta
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" autoComplete="off">
            {/* Campo E-mail */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#b8b8c8' }}>
                E-mail
              </label>
              <input
                {...register('email')}
                type="email"
                autoComplete="off"
                placeholder="seu@email.com"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{
                  background: '#242429',
                  border: `1px solid ${errors.email ? '#ef4444' : '#3d3d47'}`,
                  color: '#e0e0ec',
                }}
                onFocus={(e) => { if (!errors.email) e.target.style.borderColor = '#f97316' }}
                onBlur={(e) => { if (!errors.email) e.target.style.borderColor = '#3d3d47' }}
              />
              {errors.email && (
                <p className="mt-1 text-xs" style={{ color: '#ef4444' }}>{errors.email.message}</p>
              )}
            </div>

            {/* Campo Senha */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#b8b8c8' }}>
                Senha
              </label>
              <input
                {...register('password')}
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{
                  background: '#242429',
                  border: `1px solid ${errors.password ? '#ef4444' : '#3d3d47'}`,
                  color: '#e0e0ec',
                }}
                onFocus={(e) => { if (!errors.password) e.target.style.borderColor = '#f97316' }}
                onBlur={(e) => { if (!errors.password) e.target.style.borderColor = '#3d3d47' }}
              />
              {errors.password && (
                <p className="mt-1 text-xs" style={{ color: '#ef4444' }}>{errors.password.message}</p>
              )}
            </div>

            {/* Erro de login */}
            {loginError && (
              <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                {loginError}
              </div>
            )}

            {/* Botão de login */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all"
              style={{
                background: isLoading
                  ? '#ea6c10'
                  : 'linear-gradient(135deg, #f97316, #ea6c10)',
                color: 'white',
                opacity: isLoading ? 0.8 : 1,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                boxShadow: isLoading ? 'none' : '0 4px 20px rgba(249,115,22,0.3)',
              }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Entrando...
                </span>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-xs" style={{ color: '#5c5c6b' }}>
          © 2025 4u Serralheiro · Todos os direitos reservados
        </p>
      </div>
    </div>
  )
}

export default LoginPage
