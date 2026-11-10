import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

export function Page({
  children,
  auth = false,
}: {
  children: ReactNode
  auth?: boolean
}) {
  return <main className={auth ? 'page page--auth' : 'page'}>{children}</main>
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <header className="page-header">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="page-title">{title}</h1>
        {subtitle ? <p className="page-sub">{subtitle}</p> : null}
      </div>
      {action}
    </header>
  )
}

export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}

export function Metric({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string
  value: string
  hint?: string
  accent?: boolean
}) {
  return (
    <div className={accent ? 'metric metric--accent' : 'metric'}>
      <p className="metric__label">{label}</p>
      <p className="metric__value">{value}</p>
      {hint ? <p className="metric__hint">{hint}</p> : null}
    </div>
  )
}

export function Alert({
  tone = 'error',
  children,
}: {
  tone?: 'error' | 'ok'
  children: ReactNode
}) {
  return (
    <div className={tone === 'ok' ? 'alert alert-ok' : 'alert alert-error'}>
      {children}
    </div>
  )
}

export function EmptyState({
  title,
  text,
  action,
}: {
  title: string
  text: string
  action?: ReactNode
}) {
  return (
    <div className="empty">
      <p className="empty__title">{title}</p>
      <p className="empty__text">{text}</p>
      {action ? <div style={{ marginTop: '1rem' }}>{action}</div> : null}
    </div>
  )
}

export function Button({
  variant = 'primary',
  block = false,
  size = 'md',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'accent' | 'ghost' | 'danger'
  block?: boolean
  size?: 'md' | 'sm'
}) {
  const classes = [
    'btn',
    `btn-${variant}`,
    block ? 'btn-block' : '',
    size === 'sm' ? 'btn-sm' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return <button className={classes} {...props} />
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="input" {...props} />
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="input" {...props} />
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="input" {...props} />
}
