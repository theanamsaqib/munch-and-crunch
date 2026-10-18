import { createContext, useContext } from 'react'
import { createRemoteCatalogApi } from './catalogApi.js'

const CatalogContext = createContext({ api: createRemoteCatalogApi(), debounceMs: 300 })

export function CatalogProvider({ api, debounceMs = 300, children }) {
  return <CatalogContext.Provider value={{ api, debounceMs }}>{children}</CatalogContext.Provider>
}

export function useCatalog() {
  return useContext(CatalogContext)
}
