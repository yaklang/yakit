import type React from 'react'
import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import styles from './ChildNewApp.module.scss'
import { useDebounceFn, useMemoizedFn } from 'ahooks'
import { coordinate } from '@/pages/globalVariable'
import { defaultUserInfo } from '@/pages/userInfoDefaults'
import { useStore, type UserInfoProps } from '@/store'
import TitleBar from '@/components/BaseTitleBar'

const OpenPacketNewWindow = lazy(() => import('@/components/OpenPacketNewWindow/OpenPacketNewWindow'))
const YakitRiskDetails = lazy(() =>
  import('@/pages/risks/YakitRiskTable/YakitRiskTable').then((m) => ({ default: m.YakitRiskDetails })),
)
const RightBugAuditResult = lazy(() =>
  import('@/pages/risks/YakitRiskTable/YakitRiskTable').then((m) => ({ default: m.RightBugAuditResult })),
)

const { ipcRenderer } = window.require('electron')

interface ParentWindowData {
  type: string
  data: any
}
interface ChildNewAppProps {}
const ChildNewApp: React.FC<ChildNewAppProps> = (props) => {
  const [parentWinData, setParentWinData] = useState<ParentWindowData>()
  const setStoreUserInfo = useStore((state) => state.setStoreUserInfo)
  const requestLatestParentData = useMemoizedFn(() => {
    ipcRenderer.send('request-parent-data')
  })

  // 子窗口不挂主界面，内存里的登录态默认是未登录。处置记录只看这份状态，
  // 所以打开时读主进程 USER_INFO，并跟上之后的登录与退出。
  // version 用来丢掉过期的首次查询：期间若已收到登录或退出，不再用旧结果覆盖。
  useEffect(() => {
    let cancelled = false
    let version = 0
    const snapshot = ++version
    ipcRenderer
      .invoke('get-login-user-info', {})
      .then((info: UserInfoProps) => {
        if (!cancelled && snapshot === version && info) setStoreUserInfo(info)
      })
      .catch(() => {})
    const onToken = (_event: unknown, info: UserInfoProps) => {
      version += 1
      if (!cancelled && info) setStoreUserInfo(info)
    }
    const onLogout = () => {
      version += 1
      if (!cancelled) setStoreUserInfo(defaultUserInfo)
    }
    ipcRenderer.on('fetch-signin-token', onToken)
    ipcRenderer.on('login-out', onLogout)
    return () => {
      cancelled = true
      ipcRenderer.removeListener('fetch-signin-token', onToken)
      ipcRenderer.removeListener('login-out', onLogout)
    }
  }, [setStoreUserInfo])

  useEffect(() => {
    requestLatestParentData()
    ipcRenderer.on('get-parent-window-data', (e, data) => {
      setParentWinData(data as ParentWindowData)
    })
    return () => {
      setParentWinData(undefined)
      ipcRenderer.removeAllListeners('get-parent-window-data')
    }
  }, [requestLatestParentData])
  // 全局记录鼠标坐标位置(为右键菜单提供定位)
  const handleMouseMove = useDebounceFn(
    useMemoizedFn((e: MouseEvent) => {
      const { screenX, screenY, clientX, clientY, pageX, pageY } = e

      coordinate.screenX = screenX
      coordinate.screenY = screenY
      coordinate.clientX = clientX
      coordinate.clientY = clientY
      coordinate.pageX = pageX
      coordinate.pageY = pageY
    }),
    { wait: 50 },
  ).run
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
    }
  }, [handleMouseMove])

  const childNewAppEle = useMemo(() => {
    if (parentWinData) {
      switch (parentWinData.type) {
        case 'openPacketNewWindow':
          return (
            <div className={styles['child-packet-wrapper']}>
              <OpenPacketNewWindow data={parentWinData.data} />
            </div>
          )
        case 'openRiskNewWindow':
          return (
            <YakitRiskDetails
              info={parentWinData.data}
              className={styles['child-risk-wrapper']}
              detailClassName={styles['child-risk-details-wrapper']}
              boxStyle={{ flex: 1 }}
            />
          )
        case 'openSSARiskNewWindow':
          return <RightBugAuditResult info={parentWinData.data} boxStyle={{ height: '100%' }} />
      }
    }
    return null
  }, [parentWinData])

  return (
    <div className={styles['child-new-app-wrapper']}>
      <TitleBar />
      <div className={styles['child-new-app-content']}>
        <Suspense fallback={null}>{childNewAppEle}</Suspense>
      </div>
    </div>
  )
}

export default ChildNewApp
