
import { supabase } from './supabase'

export async function testConnection() {
  const { data, error } = await supabase
    .from('categories')
    .select('id')
    .limit(1)

  if (error) {
    console.error('Erro ao conectar:', error.message)
    return false
  }

  console.log('Supabase conectado com sucesso!')
  console.log('Consulta realizada:', data)

  return true
}
