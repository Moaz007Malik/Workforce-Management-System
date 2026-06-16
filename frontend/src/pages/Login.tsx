import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Loader2, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/stores/useAuthStore'

export function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, token, ready } = useAuthStore()
  const from = (location.state as { from?: string } | null)?.from ?? '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (ready && token) {
    return <Navigate to={from} replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-red-50/40 p-4 dark:from-slate-950 dark:via-background dark:to-red-950/20">
      <div className="w-full max-w-md space-y-4 animate-fade-in min-w-0 sm:space-y-6">
        <div className="text-center">
          <img src="/logo.png" alt="Descon" className="mx-auto mb-4 h-14 w-14 rounded-xl object-contain shadow-sm" />
          <h1 className="text-xl font-bold sm:text-2xl tracking-tight">Descon</h1>
          <p className="text-sm text-muted-foreground">Personnel Cost Planning</p>
        </div>

        <Card className="border-border/80 shadow-xl">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Use your work email and password. Access depends on your role.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@descon.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null) }}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null) }}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90"
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                Sign in
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">Powered By Corvit</p>
      </div>
    </div>
  )
}
