import { useNavigate } from '@tanstack/react-router'

/**
 * Hook utilitaire qui permet de revenir à la page précédente exacte de l'utilisateur
 * s'il possède un historique de navigation dans l'application, sinon bascule vers le chemin par défaut.
 */
export function useSmartBack(fallbackPath: string = '/dashboard') {
  const navigate = useNavigate()

  return () => {
    if (typeof window !== 'undefined' && (window.history.state?.idx > 0 || window.history.length > 1)) {
      window.history.back()
    } else {
      navigate({ to: fallbackPath as any })
    }
  }
}
