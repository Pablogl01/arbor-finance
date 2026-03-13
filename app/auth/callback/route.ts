import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // El parámetro "next" puede indicar a dónde ir tras el login (por defecto a la raíz /)
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Al usar exchangeCodeForSession, Supabase guarda la cookie de sesión automáticamente
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Si hay error, volvemos al login
  return NextResponse.redirect(`${origin}/auth/login?error=auth-code-error`)
}