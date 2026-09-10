import { useState } from "react"
import { Shield, Lock, User, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react"

export default function AuthLogin({ onLoginSuccess }) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setError("")

    const cleanUser = username.trim()
    const cleanPass = password.trim()

    if (!cleanUser || !cleanPass) {
      setError("Please enter both username and password.")
      return
    }

    setLoading(true)

    setTimeout(() => {
      // Required credentials: username: Admin, password: 5192
      if (cleanUser.toLowerCase() === "admin" && cleanPass === "5192") {
        const userData = {
          username: "Admin",
          role: "Lead Criminal Investigator",
          badgeId: "INV-5192",
          agency: "Special Investigation Unit",
          sessionToken: "sec_token_" + Math.random().toString(36).substring(2),
          loginTime: new Date().toISOString(),
        }

        if (rememberMe) {
          localStorage.setItem("investiq_auth_user", JSON.stringify(userData))
        } else {
          sessionStorage.setItem("investiq_auth_user", JSON.stringify(userData))
        }

        onLoginSuccess(userData)
      } else {
        setError("Invalid authorization credentials. Authorized personnel only.")
        setLoading(false)
      }
    }, 400)
  }

  const fillDemoCredentials = () => {
    setUsername("Admin")
    setPassword("5192")
    setError("")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-100/90 p-4 backdrop-blur-md">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all">
        {/* Header Badge */}
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-900 to-slate-800 px-8 py-7 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600/30 ring-2 ring-blue-400/40">
              <Shield className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-wider text-white">INVESTIQ</span>
                <span className="rounded bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-300">
                  v2.4 SECURE
                </span>
              </div>
              <p className="text-xs text-slate-300">Criminal Neural Intelligence & Syndicate Analysis</p>
            </div>
          </div>
        </div>

        {/* Login Body */}
        <div className="p-8">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">Investigator Workstation Login</h2>
            <p className="mt-1 text-xs text-slate-500">
              Enter official credentials to access criminal network graph & case files.
            </p>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Investigator Username
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. Admin"
                  autoComplete="username"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">
                  Security Passcode
                </label>
                <button
                  type="button"
                  onClick={fillDemoCredentials}
                  className="text-[11px] font-medium text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Quick Fill (Admin / 5192)
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter 5192"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-10 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Remember this workstation
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Authenticating Clearance...</span>
                </div>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  <span>Authenticate & Enter Workspace</span>
                </>
              )}
            </button>
          </form>

          {/* Verification info */}
          <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>Encrypted Law Enforcement Portal • End-to-End SSL</span>
          </div>
        </div>
      </div>
    </div>
  )
}
