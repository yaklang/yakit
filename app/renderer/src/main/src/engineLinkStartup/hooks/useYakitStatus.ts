import type { MutableRefObject } from 'react'
import { useMemoizedFn } from 'ahooks'
import useGetSetState from './useGetSetState'
import type { YakitLinkStatusType } from '@/engineLinkStartup/pages/StartupPage/types'

export const useYakitStatus = (breakHandleRef: MutableRefObject<boolean>) => {
  const [yakitStatus, setYakitStatus, getYakitStatus] = useGetSetState<YakitLinkStatusType>('init')

  const safeSetYakitStatus = useMemoizedFn((value: YakitLinkStatusType) => {
    if (breakHandleRef.current) return
    setYakitStatus(value)
  })

  return {
    yakitStatus,
    getYakitStatus,
    safeSetYakitStatus,
  }
}
