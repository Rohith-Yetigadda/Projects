import { useMemo } from 'react'

function useAppConfig() {
  return useMemo(
    () => ({
      appName: 'NXUS',
      version: '1.1.2',
    }),
    [],
  )
}

export default useAppConfig
