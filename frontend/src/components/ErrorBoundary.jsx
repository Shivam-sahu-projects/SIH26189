import React from "react"
import { AlertCircle, RefreshCw, Home } from "lucide-react"

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error("INVESTIQ React Error Boundary Caught Error:", error, errorInfo)
    this.setState({ errorInfo })
  }

  handleReset = () => {
    try {
      localStorage.removeItem("investiq_auth_user")
      sessionStorage.clear()
    } catch (e) {
      // ignore
    }
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-slate-900">
          <div className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-8 shadow-xl">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">INVESTIQ Workspace Error</h2>
                <p className="text-xs text-slate-500">An unexpected interface error occurred during render.</p>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-mono text-red-600 break-words font-semibold">
                {this.state.error?.toString() || "Unknown rendering exception"}
              </div>
              {this.state.errorInfo && (
                <pre className="mt-3 max-h-40 overflow-y-auto text-[10px] font-mono text-slate-500">
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Reload Interface</span>
              </button>
              <button
                onClick={this.handleReset}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
              >
                <Home className="h-3.5 w-3.5" />
                <span>Reset & Relogin</span>
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
