import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  private handleReload = () => {
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-rose-100 mb-6">
            <AlertTriangle className="h-10 w-10 text-rose-600" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-slate-900">Oups ! Une erreur est survenue</h1>
          <p className="mb-8 max-w-md text-slate-500">
            Un problème inattendu s'est produit lors de l'affichage de cette page. Nous nous en excusons.
          </p>
          <div className="flex gap-4">
            <button
              onClick={this.handleReload}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-500"
            >
              <RefreshCw className="h-4 w-4" />
              Recharger la page
            </button>
            <a
              href="mailto:support@activity-tracker.com"
              className="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
            >
              Contacter le support
            </a>
          </div>
          {import.meta.env.DEV && this.state.error && (
            <div className="mt-12 w-full max-w-2xl rounded-lg bg-rose-50 p-4 text-left text-sm text-rose-800 shadow-sm overflow-auto">
              <p className="font-bold mb-2">Détails de l'erreur (Développement uniquement) :</p>
              <pre className="whitespace-pre-wrap">{this.state.error.stack}</pre>
            </div>
          )}
        </div>
      )
    }

    return this.props.children
  }
}
