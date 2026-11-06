import { lazy, Suspense } from "react";
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";
import { ApplicationShell } from "../layout/ApplicationShell";
import { NotFoundPage } from "../pages/NotFoundPage";
import { demoRoutes } from "./demoRoutes";
import { productRoutes } from "./productRoutes";
const G6ReadDemoApp = lazy(() => import("../../features/catalog/pages/G6ReadDemoApp").then(module => ({ default: module.G6ReadDemoApp })));
const router = createBrowserRouter([
  ...(import.meta.env.VITE_G6_READ_DEMO === "true" ? [{
    path: "/demo/g6/*",
    element: <Suspense fallback={<p role="status">Cargando catálogo…</p>}><G6ReadDemoApp /></Suspense>,
  }] : []),
  {
    element: <ApplicationShell />,
    children: [
      { path: "/", element: <Navigate to="/precios" replace /> },
      ...productRoutes,
      ...(import.meta.env.DEV ? demoRoutes : []),
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
export function AppRoutes() {
  return <RouterProvider router={router} />;
}
