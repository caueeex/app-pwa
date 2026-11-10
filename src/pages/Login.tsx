import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  Alert,
  Button,
  Field,
  Page,
  TextInput,
} from '../components/ui'

export default function Login() {
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
    <Page auth>
      <form className="auth-panel stack" onSubmit={handleSubmit}>
        <div>
          <p className="eyebrow">Entrar</p>
          <h1 className="brand">
            Resale<span className="brand__mark">.</span>
          </h1>
          <p className="auth-copy">
            Controle compras, estoque e vendas no bolso — sem planilha.
          </p>
        </div>

        <Field label="E-mail">
          <TextInput
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
          />
        </Field>

        <Field label="Senha">
          <TextInput
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Sua senha"
          />
        </Field>

        {error ? <Alert>{error}</Alert> : null}

        <Button type="submit" block disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar na bancada'}
        </Button>

        <p className="text-muted" style={{ textAlign: 'center', margin: 0 }}>
          Não tem conta?{' '}
          <Link to="/register" className="linkish">
            Criar agora
          </Link>
        </p>
      </form>
    </Page>
  )
}
