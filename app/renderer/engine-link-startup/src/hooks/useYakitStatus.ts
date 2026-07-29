import type { MutableRefObject } from 'react'
import { useMemoizedFn } from 'ahooks'
import useGetSetState from './useGetSetState'
import { YakitStatusType } from '@/pages/StartupPage/types'

export const useYakitStatus = (breakHandleRef: MutableRefObject<boolean>) => {
  const [yakitStatus, setYakitStatus, getYakitStatus] = useGetSetState<YakitStatusType>('init')

  const safeSetYakitStatus = useMemoizedFn((value: YakitStatusType) => {
    if (breakHandleRef.current) return
    setYakitStatus(value)
  })

  return {
    yakitStatus,
    getYakitStatus,
    safeSetYakitStatus,
  }
}
