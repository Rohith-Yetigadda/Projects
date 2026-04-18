import { useMemo } from 'react'

function useAppConfig() {
  return useMemo(
    () => ({
      appName: 'NXUS',
      version: '1.2.1',
    }),
    [],
  )
}

export default useAppConfig
