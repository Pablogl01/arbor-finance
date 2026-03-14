'use client'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Fingerprint, Asterisk } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const supabase = createClient()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (isRegistering) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
      })
      if (error) alert(error.message)
      else alert('¡Registro casi listo! Revisa tu email para confirmar tu cuenta.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) alert(error.message)
      else {
        router.push('/')
        router.refresh()
      }
    }
    setLoading(false)
  }

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ 
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    if (error) alert("Error con Google: " + error.message)
  }

  const handleBiometrics = () => {
    alert('El inicio de sesión biométrico requiere configuración adicional de WebAuthn o envoltura nativa de la app móvil.');
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left side: branding/showcase */}
      <div className="hidden w-1/2 flex-col justify-between bg-arbor-green p-12 lg:flex relative overflow-hidden">
        {/* Wavy background lines (simple CSS representation) */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0 25 C 25 15, 75 35, 100 25 L 100 100 L 0 100 Z" fill="#ffffff" />
            <path d="M0 60 C 30 40, 70 80, 100 60 L 100 100 L 0 100 Z" fill="#ffffff" opacity="0.5" />
          </svg>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-white font-bold text-xl">
          <Asterisk className="h-6 w-6" />
          <span>Arbor Wealth</span>
        </div>

        <div className="relative z-10 mt-20 max-w-md">
          <h1 className="text-5xl font-extrabold leading-[1.1] tracking-tight text-white mb-6">
            Your wealth,<br />grown with<br />clarity.
          </h1>
        </div>

        {/* Decorative mock phone frame */}
        <div className="relative z-10 mt-auto ml-10 mb-[-100px] h-[500px] w-[260px] rounded-[40px] border-[12px] border-slate-900 bg-[#83a286] transform rotate-[-5deg] shadow-2xl overflow-hidden flex flex-col pt-6 px-4">
          {/* Phone Notch */}
          <div className="absolute top-0 left-1/2 w-32 h-6 bg-slate-900 rounded-b-xl -translate-x-1/2"></div>

          {/* Fake App Content inside phone */}
          <div className="mt-8 bg-white rounded-2xl p-3 h-full overflow-hidden opacity-90">
            <div className="h-6 w-2/3 bg-slate-200 rounded-md mb-4"></div>
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-slate-50 p-2 rounded">
                <div className="h-8 w-8 bg-slate-200 rounded-full"></div>
                <div className="h-4 w-12 bg-slate-200 rounded"></div>
              </div>
              <div className="flex justify-between items-center bg-slate-50 p-2 rounded border-l-2 border-arbor-green">
                <div className="h-8 w-8 bg-slate-200 rounded-full"></div>
                <div className="h-4 w-16 bg-arbor-green/20 rounded"></div>
              </div>
              <div className="flex justify-between items-center bg-slate-50 p-2 rounded">
                <div className="h-8 w-8 bg-slate-200 rounded-full"></div>
                <div className="h-4 w-10 bg-slate-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Login Form */}
      <div className="flex w-full flex-col justify-center px-8 sm:px-16 lg:w-1/2 lg:px-24">
        <div key={isRegistering ? 'register' : 'login'} className="mx-auto w-full max-w-sm animate-fade-in">
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              {isRegistering ? 'Create Account' : 'Sign In'}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {isRegistering
                ? 'Join us to start managing your wealth.'
                : 'Welcome back to your financial future.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-arbor-green focus:bg-white focus:ring-2 focus:ring-arbor-mint"
                required
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">
                  Password
                </label>
                {!isRegistering && (
                  <button type="button" className="text-xs font-bold text-arbor-green hover:underline">
                    Forgot?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-arbor-green focus:bg-white focus:ring-2 focus:ring-arbor-mint pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-arbor-green px-4 py-3.5 text-sm font-bold text-white shadow-soft transition-all hover:bg-arbor-darkmint hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {loading
                ? 'Processing...'
                : isRegistering
                  ? 'Start growing today'
                  : 'Sign In to Dashboard'}
            </button>
          </form>

          <div className="mt-8">
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative bg-white px-4 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                Or continue with
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
              >
                {/* Fallback color circle for Google G if no standard colored icon available, but we use Lucide Chrome as a rough stand-in */}
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-blue-500 text-[8px] text-white">
                  G
                </div>
                Google
              </button>
              <button
                type="button"
                onClick={handleBiometrics}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Fingerprint className="h-4 w-4 text-slate-500" />
                Biometrics
              </button>
            </div>
          </div>

          <div className="mt-10 text-center text-sm text-slate-500">
            {isRegistering ? "Already have an account? " : "Don't have an account? "}
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="font-bold text-arbor-green hover:underline"
            >
              {isRegistering ? 'Sign In' : 'Start growing today'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}