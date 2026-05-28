import { useEffect, useRef, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import emiter from '@/utils/eventBus/eventBus'
import { YakitRoute } from '@/enums/yakitRoute'
import { useIrifyCurrentSSAProjectStore } from '@/store/irifyCurrentSSAProject'
import { isIRifySharedSchemaProject } from './ssaProjectTableShared'

const { ipcRenderer } = window.require('electron')

export interface UseIRifySharedProfileOptions {
  /** When internal project manage should hide, close code-audit project manager tab. */
  closeProjectManagerOnDedicated?: boolean
}

export const useIRifySharedProfile = (options?: UseIRifySharedProfileOptions) => {
  const [loading, setLoading] = useState(true)
  const [profileName, setProfileName] = useState<string>('')
  const dedicatedSSA = useIrifyCurrentSSAProjectStore((s) => s.current)
  const prevCanShowRef = useRef<boolean | null>(null)

  const profileIsShared = isIRifySharedSchemaProject(profileName)
  const dedicatedSSAActive = !!dedicatedSSA
  /** Default/temporary profile AND not working in a dedicated SSA sqlite context. */
  const canShowInternalProjectManage = profileIsShared && !dedicatedSSAActive

  const refresh = useMemoizedFn(async () => {
    try {
      const res = await ipcRenderer.invoke('GetCurrentProjectEx', { Type: 'ssa_project' })
      const name = (res?.ProjectName ?? '').trim()
      setProfileName(name)
    } catch {
      setProfileName('')
    } finally {
      setLoading(false)
    }
  })

  useEffect(() => {
    refresh()
    const onRefresh = () => {
      setLoading(true)
      refresh()
    }
    emiter.on('onGetProjectInfo', onRefresh)
    emiter.on('onRefreshSSAProjectList', onRefresh)
    return () => {
      emiter.off('onGetProjectInfo', onRefresh)
      emiter.off('onRefreshSSAProjectList', onRefresh)
    }
  }, [])

  useEffect(() => {
    if (loading) {
      return
    }
    if (options?.closeProjectManagerOnDedicated && prevCanShowRef.current === true && !canShowInternalProjectManage) {
      emiter.emit('closePage', JSON.stringify({ route: YakitRoute.YakRunner_Project_Manager }))
    }
    prevCanShowRef.current = canShowInternalProjectManage
  }, [loading, canShowInternalProjectManage, options?.closeProjectManagerOnDedicated])

  return {
    loading,
    profileName,
    profileIsShared,
    dedicatedSSAActive,
    canShowInternalProjectManage,
    /** @deprecated use canShowInternalProjectManage */
    isSharedProfile: canShowInternalProjectManage,
    isDedicatedProfile: !canShowInternalProjectManage,
    refresh,
  }
}
