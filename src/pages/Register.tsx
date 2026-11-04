
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Register() {
  const { signUp } = useAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      const hasSession = await signUp(email, password, name)

      setMessage(
        hasSession
          ? 'Conta criada com sucesso!'
          : 'Conta criada! Confira seu e-mail para confirmar o cadastro.'
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-5">
      <form
        onSubmit={handleSubmit}
        className="bg-white w-full max-w-md rounded-3xl p-8 shadow-xl"
      >
        <h1 className="text-3xl font-bold text-slate-900">
          Criar conta
        </h1>
        <p className="text-slate-500 mt-2 mb-7">
          Comece a organizar suas compras e vendas.
        </p>

        <label className="block text-sm font-medium mb-2">Nome</label>
        <input
          required
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full border rounded-xl p-3 mb-4"
          placeholder="Seu nome"
        />

        <label className="block text-sm font-medium mb-2">E-mail</label>
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full border rounded-xl p-3 mb-4"
          placeholder="seu@email.com"
        />

        <label className="block text-sm font-medium mb-2">Senha</label>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full border rounded-xl p-3 mb-5"
          placeholder="Mínimo de 8 caracteres"
        />

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        {message && <p className="text-green-700 text-sm mb-4">{message}</p>}

        <button
          disabled={loading}
          className="w-full bg-green-700 text-white rounded-xl p-3 font-semibold disabled:opacity-50"
        >
          {loading ? 'Criando conta...' : 'Criar minha conta'}
        </button>

        <p className="text-center text-sm text-slate-500 mt-6">
          Já tem conta?{' '}
          <Link to="/login" className="text-green-700 font-semibold">
            Fazer login
          </Link>
        </p>
      </form>
    </main>
  )
}
