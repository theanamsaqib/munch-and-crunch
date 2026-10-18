import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { createRemoteCatalogApi } from './api/catalogApi.js'
import { CatalogProvider } from './api/CatalogContext.jsx'
import { routes } from './routes.jsx'
import './styles.css'

const router = createBrowserRouter(routes)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CatalogProvider api={createRemoteCatalogApi()}>
      <RouterProvider router={router} />
    </CatalogProvider>
  </StrictMode>,
)
