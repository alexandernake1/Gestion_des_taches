import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

export const Route = createRootRoute({
  component: () => (
    <>
      <Outlet />
      {import.meta.env.VITE_SHOW_ROUTER_DEVTOOLS === 'true' && (
        <TanStackRouterDevtools />
      )}
    </>
  ),
})
