type SupabaseLikeError = {
  code?: string
  message?: string
  details?: string
  hint?: string
}

export function isMissingRpc(error: SupabaseLikeError) {
  const message = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`

  return (
    error.code === 'PGRST202' ||
    error.code === '42883' ||
    /could not find the function|function .* does not exist/i.test(message)
  )
}

export function isMissingRelation(error: SupabaseLikeError) {
  const message = `${error.message ?? ''} ${error.details ?? ''}`

  return (
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    /could not find the table|relation .* does not exist/i.test(message)
  )
}

export function isForeignKeyViolation(error: SupabaseLikeError) {
  const message = `${error.message ?? ''} ${error.details ?? ''}`

  return (
    error.code === '23503' ||
    /foreign key|violates foreign key constraint/i.test(message)
  )
}

export function toUserError(
  error: unknown,
  fallback: string
): Error {
  if (error instanceof Error) {
    return error
  }

  if (typeof error === 'object' && error && 'message' in error) {
    const message = String((error as SupabaseLikeError).message || fallback)
    return new Error(message)
  }

  return new Error(fallback)
}
