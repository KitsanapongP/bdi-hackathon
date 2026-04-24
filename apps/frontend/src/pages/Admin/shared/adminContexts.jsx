import { createContext, useContext } from 'react'

export const AdminSessionContext = createContext({
  adminUser: null,
  demoMode: false,
})

export const AdminToastContext = createContext({
  pushToast: () => {},
})

export function useAdminToast() {
  return useContext(AdminToastContext)
}

export function useAdminSession() {
  return useContext(AdminSessionContext)
}
