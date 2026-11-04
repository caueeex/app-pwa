
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signIn(email, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl bg-gray-900 p-8 text-white">
        <h1 className="mb-2 text-3xl font-bold">Resale Manager</h1>
        <p className="mb-8 text-gray-400">Entre na sua conta</p>

        <label className="mb-2 block text-sm">E-mail</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-5 w-full rounded-lg border border-gray-700 bg-gray-800 p-3 outline-none"
          placeholder="seu@email.com"
        />

        <label className="mb-2 block text-sm">Senha</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-5 w-full rounded-lg border border-gray-700 bg-gray-800 p-3 outline-none"
          placeholder="Sua senha"
        />

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-green-500 p-3 font-semibold text-gray-950 hover:bg-green-400 disabled:opacity-50"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>

        <p className="mt-6 text-center text-sm text-gray-400">
          Não tem uma conta?{' '}
          <Link to="/register" className="text-green-400 hover:underline">
            Criar conta
          </Link>
        </p>
      </form>
    </main>
  )
}

export default Login
