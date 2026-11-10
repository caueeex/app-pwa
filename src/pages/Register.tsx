import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  Alert,
  Button,
  Field,
  Page,
  TextInput,
} from '../components/ui'

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
    <Page auth>
      <form className="auth-panel stack" onSubmit={handleSubmit}>
        <div>
          <p className="eyebrow">Cadastro</p>
          <h1 className="brand">
            Resale<span className="brand__mark">.</span>
          </h1>
          <p className="auth-copy">
            Monte sua bancada: produtos, custos e lucro no mesmo lugar.
          </p>
        </div>

        <Field label="Nome">
          <TextInput
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Como te chamamos"
            autoComplete="name"
          />
        </Field>

        <Field label="E-mail">
          <TextInput
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            autoComplete="email"
          />
        </Field>

        <Field label="Senha">
          <TextInput
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo de 8 caracteres"
            autoComplete="new-password"
          />
        </Field>

        {error ? <Alert>{error}</Alert> : null}
        {message ? <Alert tone="ok">{message}</Alert> : null}

        <Button type="submit" block disabled={loading}>
          {loading ? 'Criando conta...' : 'Criar minha conta'}
        </Button>

        <p className="text-muted" style={{ textAlign: 'center', margin: 0 }}>
          Já tem conta?{' '}
          <Link to="/login" className="linkish">
            Fazer login
          </Link>
        </p>
      </form>
    </Page>
  )
}
