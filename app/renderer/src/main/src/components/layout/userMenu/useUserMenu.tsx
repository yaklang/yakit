import { useEffect, useMemo, useRef, useState } from 'react'
import { Modal } from 'antd'
import { useDebounceFn, useMemoizedFn } from 'ahooks'
import { ExclamationCircleOutlined } from '@ant-design/icons'
import { useStore, yakitDynamicStatus } from '@/store'
import { defaultUserInfo, SetUserInfo } from '@/pages/MainOperator'
import { loginOut } from '@/utils/login'
import { UserPlatformType } from '@/pages/globalVariable'
import { failed, success, yakitFailed } from '@/utils/notification'
import { NetWorkApi } from '@/services/fetch'
import { API } from '@/services/swagger/resposeType'
import { YakitMenuItemProps, YakitMenuItemType } from '../../yakitUI/YakitMenu/YakitMenu'
import { CeUserInfo, CeUserItemProps, UserMenuItemType } from '../../CeUserMenu/CeUserMenu'
import { YakitRoute } from '@/enums/yakitRoute'
import { RouteToPageProps } from '@/pages/layout/publicMenu/PublicMenu'
import emiter from '@/utils/eventBus/eventBus'
import { isEnpriTraceAgent, isEnpriTraceIRify, isIRify } from '@/utils/envfile'
import { yakitEngine, yakitNetwork, yakitUILayout } from '@/services/electronBridge'
import {
  cancelIMControlState,
  onIMControlStateData,
  onIMControlStateEnd,
  onIMControlStateError,
  subscribeIMControlState,
} from '@/utils/imControl'
import { deriveIMControlBadge, type IMControlBadgeStatus, type IMControlBadgeView } from '@/pages/robotControl/status'
import { TFunction, useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { UserMenusMap, randomAvatarColor } from './constants'

export interface UseUserMenuParams {
  isEngineLink: boolean
  dynamicConnect: boolean
  avatarColor: React.MutableRefObject<string>
}

export interface UseUserMenuResult {
  /** 用户功能菜单 */
  userMenu: YakitMenuItemType[]
  /** CE用户菜单弹窗 */
  ceUserMenuShow: boolean
  setCeUserMenuShow: React.Dispatch<React.SetStateAction<boolean>>
  /** 使用统计弹窗 */
  usageStatisticsShow: boolean
  setUsageStatisticsShow: React.Dispatch<React.SetStateAction<boolean>>
  /** API Key 信息 */
  apiKeysInfo: API.ApiKeyDetail | undefined
  apiKeysInfoLoading: boolean
  onUpdateApiKey: (isLoading?: boolean) => void
  /** 修改密码弹窗 */
  passwordShow: boolean
  setPasswordShow: React.Dispatch<React.SetStateAction<boolean>>
  passwordClose: boolean
  /** 上传数据弹窗 */
  uploadModalShow: boolean
  setUploadModalShow: React.Dispatch<React.SetStateAction<boolean>>
  /** 远程控制弹窗 */
  dynamicControlModal: boolean
  setDynamicControlModal: React.Dispatch<React.SetStateAction<boolean>>
  controlMyselfModal: boolean
  setControlMyselfModal: React.Dispatch<React.SetStateAction<boolean>>
  controlOtherModal: boolean
  setControlOtherModal: React.Dispatch<React.SetStateAction<boolean>>
  dynamicMenuOpen: boolean
  setDynamicMenuOpen: React.Dispatch<React.SetStateAction<boolean>>
  /** 机器人控制弹窗 */
  robotControlModal: boolean
  setRobotControlModal: React.Dispatch<React.SetStateAction<boolean>>
  /** 支付测试弹窗 */
  paymentShow: boolean
  setPaymentShow: React.Dispatch<React.SetStateAction<boolean>>
  /** IM 控制状态 */
  imControlBadge: IMControlBadgeView
  imControlStatus: IMControlBadgeStatus | undefined
  refreshIMControlStatus: () => void
  /** 菜单点击处理 */
  onUserMenuClick: (key: string) => void
  /** 登录弹窗 */
  loginShow: boolean
  setLoginShow: React.Dispatch<React.SetStateAction<boolean>>
}

/**
 * 用户功能菜单核心 hook
 *
 * 封装用户菜单的全部逻辑：菜单构建、点击处理、API Key、IM 控制状态、弹窗状态
 */
export const useUserMenu = (params: UseUserMenuParams): UseUserMenuResult => {
  const { isEngineLink, dynamicConnect, avatarColor } = params
  const { t } = useI18nNamespaces(['layout', 'yakitUi'])

  /** 登录用户信息 */
  const { userInfo, setStoreUserInfo } = useStore()

  const [loginShow, setLoginShow] = useState<boolean>(false)
  /** 用户功能菜单 */
  const [userMenu, setUserMenu] = useState<YakitMenuItemType[]>([UserMenusMap['singOut']])
  const [ceUserMenuShow, setCeUserMenuShow] = useState<boolean>(false)
  const [usageStatisticsShow, setUsageStatisticsShow] = useState<boolean>(false)
  const [apiKeysInfo, setApiKeysInfo] = useState<API.ApiKeyDetail>()
  const [apiKeysInfoLoading, setApiKeysInfoLoading] = useState<boolean>(false)
  const cacheApiKeyRef = useRef<string>()
  /** 修改密码弹框 */
  const [passwordShow, setPasswordShow] = useState<boolean>(false)
  /** 是否允许密码框关闭 */
  const [passwordClose, setPasswordClose] = useState<boolean>(true)
  /** 上传数据弹框 */
  const [uploadModalShow, setUploadModalShow] = useState<boolean>(false)

  /** 发起远程弹框 受控端 - 控制端 */
  const [dynamicControlModal, setDynamicControlModal] = useState<boolean>(false)
  const [controlMyselfModal, setControlMyselfModal] = useState<boolean>(false)
  const [controlOtherModal, setControlOtherModal] = useState<boolean>(false)
  const [dynamicMenuOpen, setDynamicMenuOpen] = useState<boolean>(false)
  /** 机器人控制弹框 */
  const [robotControlModal, setRobotControlModal] = useState<boolean>(false)
  /** 支付测试弹框 */
  const [paymentShow, setPaymentShow] = useState<boolean>(false)
  const [imControlStatus, setIMControlStatus] = useState<IMControlBadgeStatus>()
  const [imControlStatusLoading, setIMControlStatusLoading] = useState<boolean>(false)
  const imControlStateRetryTimerRef = useRef<number>()
  /** 当前远程连接状态 */
  const { dynamicStatus } = yakitDynamicStatus()

  const refreshIMControlStatus = useMemoizedFn(() => {
    if (!userInfo.isLogin) {
      setIMControlStatus(undefined)
      setIMControlStatusLoading(false)
      return
    }

    if (!isEngineLink) {
      setIMControlStatus({ Running: false })
      setIMControlStatusLoading(false)
      return
    }

    setIMControlStatusLoading(true)
  })

  const imControlBadge = useMemo(
    () =>
      deriveIMControlBadge({
        isLogin: userInfo.isLogin,
        loading: imControlStatusLoading,
        status: imControlStatus,
      }),
    [imControlStatus, imControlStatusLoading, userInfo.isLogin],
  )

  useEffect(() => {
    if (!userInfo.isLogin) {
      setIMControlStatus(undefined)
      setIMControlStatusLoading(false)
      return
    }
    if (!isEngineLink) {
      setIMControlStatus({ Running: false })
      setIMControlStatusLoading(false)
      return
    }

    let disposed = false
    let currentToken = ''
    let cleanupListeners: Array<() => void> = []

    function cleanupCurrentStream() {
      cleanupListeners.forEach((cleanup) => cleanup())
      cleanupListeners = []
      if (currentToken) {
        cancelIMControlState(currentToken).catch(() => {})
        currentToken = ''
      }
      if (imControlStateRetryTimerRef.current) {
        window.clearTimeout(imControlStateRetryTimerRef.current)
        imControlStateRetryTimerRef.current = undefined
      }
    }

    function scheduleReconnect() {
      if (disposed) return
      if (imControlStateRetryTimerRef.current) {
        window.clearTimeout(imControlStateRetryTimerRef.current)
      }
      imControlStateRetryTimerRef.current = window.setTimeout(() => {
        imControlStateRetryTimerRef.current = undefined
        startSubscribe()
      }, 1000)
    }

    function startSubscribe() {
      cleanupCurrentStream()
      if (disposed) return
      const token = `im-control-state-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      currentToken = token
      setIMControlStatusLoading(true)
      cleanupListeners = [
        onIMControlStateData(token, (state) => {
          setIMControlStatus(state)
          setIMControlStatusLoading(false)
        }),
        onIMControlStateError(token, (e) => {
          setIMControlStatus({
            Running: true,
            Platforms: [
              {
                Platform: 'im',
                Label: '移动端控制',
                Connected: false,
                Level: 'error',
                Message: `${e}`,
              },
            ],
          })
          setIMControlStatusLoading(false)
          scheduleReconnect()
        }),
        onIMControlStateEnd(token, () => {
          setIMControlStatusLoading(false)
          scheduleReconnect()
        }),
      ]
      subscribeIMControlState(token).catch((e) => {
        setIMControlStatus({
          Running: true,
          Platforms: [
            {
              Platform: 'im',
              Label: '移动端控制',
              Connected: false,
              Level: 'error',
              Message: `${e}`,
            },
          ],
        })
        setIMControlStatusLoading(false)
        scheduleReconnect()
      })
    }

    startSubscribe()
    return () => {
      disposed = true
      cleanupCurrentStream()
    }
  }, [isEngineLink, userInfo.isLogin])

  useEffect(() => {
    // 退出菜单
    const signOutMenu: YakitMenuItemType[] = [UserMenusMap['divider'], UserMenusMap['singOut']]
    // EE|SE 版本
    if (userInfo.platform === 'company') {
      const SetUserInfoModule = () => (
        <SetUserInfo userInfo={userInfo} avatarColor={avatarColor.current} setStoreUserInfo={setStoreUserInfo} />
      )

      // 用户头像
      const userAvatar: YakitMenuItemType[] = [
        { key: 'user-info', label: SetUserInfoModule(), noStyle: true },
        UserMenusMap['divider'],
      ]
      if (userInfo.role === 'admin') {
        // 管理员
        if (isEnpriTraceAgent()) {
          setUserMenu([
            ...userAvatar,
            UserMenusMap['holeCollect'],
            UserMenusMap['roleAdmin'],
            UserMenusMap['accountAdmin'],
            UserMenusMap['setPassword'],
            UserMenusMap['pluginAudit'],
            UserMenusMap['payment'],
            UserMenusMap['robotControl'],
            ...signOutMenu,
          ])
        } else {
          let cacheMenus: YakitMenuItemType[] = [
            ...userAvatar,
            UserMenusMap['uploadData'],
            UserMenusMap['dynamicControl'],
            UserMenusMap['controlAdmin'],
            UserMenusMap['closeDynamicControl'],
            UserMenusMap['roleAdmin'],
            UserMenusMap['accountAdmin'],
            UserMenusMap['setPassword'],
            UserMenusMap['pluginAudit'],
            UserMenusMap['misstatement'],
            UserMenusMap['systemConfig'],
            UserMenusMap['payment'],
            UserMenusMap['robotControl'],
            ...signOutMenu,
          ]
          // 仅在 IRify 企业版本时显示系统配置
          if (!isEnpriTraceIRify()) {
            cacheMenus = cacheMenus.filter((item) => (item as YakitMenuItemProps).key !== 'system-config')
          }
          if (dynamicConnect) {
            // 远程中时不显示发起远程 显示退出远程
            cacheMenus = cacheMenus.filter((item) => (item as YakitMenuItemProps).key !== 'dynamic-control')
          } else {
            // 非远程控制时显示发起远程 不显示退出远程
            cacheMenus = cacheMenus.filter((item) => (item as YakitMenuItemProps).key !== 'close-dynamic-control')
          }
          // IRify 版本时管理员不显示插件管理
          if (isIRify()) {
            cacheMenus = cacheMenus.filter((item) => (item as YakitMenuItemProps).key !== 'plugin-audit')
          }
          setUserMenu([...cacheMenus])
        }
      } else {
        let isNew: boolean = false
        let cacheMenus: YakitMenuItemType[] = [
          ...userAvatar,
          UserMenusMap['uploadData'],
          UserMenusMap['dynamicControl'],
          UserMenusMap['closeDynamicControl'],
          UserMenusMap['setPassword'],
          UserMenusMap['pluginAudit'],
          UserMenusMap['misstatement'],
          UserMenusMap['robotControl'],
          ...signOutMenu,
        ]
        if (userInfo.role !== 'auditor') {
          // 不为审核员时 移除插件管理
          isNew = true
          cacheMenus = cacheMenus.filter((item) => !['plugin-audit'].includes((item as YakitMenuItemProps).key))
        }

        // 不为审核员或超级管理员时 移除误报记录
        if (!['superAdmin', 'auditor'].includes(userInfo.role || '')) {
          isNew = true
          cacheMenus = cacheMenus.filter((item) => !['misstatement'].includes((item as YakitMenuItemProps).key))
        }

        if (isEnpriTraceAgent()) {
          isNew = true
          cacheMenus = cacheMenus.filter(
            (item) => !['upload-data', 'misstatement'].includes((item as YakitMenuItemProps).key),
          )
        }
        // 远程中时不显示发起远程 显示退出远程
        if (dynamicConnect) {
          isNew = true
          cacheMenus = cacheMenus.filter((item) => (item as YakitMenuItemProps).key !== 'dynamic-control')
        }
        // 非远程控制时显示发起远程 不显示退出远程
        if (!dynamicConnect) {
          isNew = true
          cacheMenus = cacheMenus.filter((item) => (item as YakitMenuItemProps).key !== 'close-dynamic-control')
        }

        if (isNew) {
          setUserMenu([...cacheMenus])
        } else {
          // 非权限人员
          setUserMenu([UserMenusMap['robotControl'], ...signOutMenu])
        }
      }
    }
    // ce版本
    else {
      const SetUserInfoModule = () => (
        <CeUserInfo
          userInfo={userInfo}
          apiKeysInfo={apiKeysInfo}
          onOpenStatistics={() => {
            setCeUserMenuShow(false)
            setUsageStatisticsShow(true)
          }}
        />
      )

      // 用户头像
      const userAvatar: UserMenuItemType[] = [{ key: 'user-info', label: SetUserInfoModule() }, UserMenusMap['divider']]
      let isNew: boolean = false
      // CE-超管
      if (userInfo.role === 'superAdmin') {
        isNew = true
        let cacheMenus: UserMenuItemType[] = [
          ...userAvatar,
          UserMenusMap['pluginAudit'],
          UserMenusMap['dataStatistics'],
          UserMenusMap['misstatement'],
          UserMenusMap['payment'],
          UserMenusMap['robotControl'],
          UserMenusMap['divider'],
          UserMenusMap['trustList'],
          UserMenusMap['licenseAdmin'],
          UserMenusMap['singOut'],
        ]
        if (isIRify()) {
          cacheMenus = cacheMenus.filter((item) => (item as YakitMenuItemProps).key !== 'plugin-audit')
        }
        setUserMenu(cacheMenus)
      }
      // CE-管理员
      if (userInfo.role === 'admin') {
        isNew = true
        let cacheMenus: UserMenuItemType[] = [
          ...userAvatar,
          UserMenusMap['pluginAudit'],
          UserMenusMap['dataStatistics'],
          UserMenusMap['misstatement'],
          UserMenusMap['payment'],
          UserMenusMap['robotControl'],
        ].concat(signOutMenu)
        // IRify 版本时管理员不显示插件管理
        if (isIRify()) {
          cacheMenus = cacheMenus.filter((item) => (item as CeUserItemProps).key !== 'plugin-audit')
        }
        setUserMenu(cacheMenus)
      }
      // CE-操作员
      if (userInfo.role === 'operate') {
        isNew = true
        setUserMenu([...userAvatar, UserMenusMap['dataStatistics'], UserMenusMap['robotControl']].concat(signOutMenu))
      }
      // CE-license管理员
      if (userInfo.role === 'licenseAdmin') {
        isNew = true
        setUserMenu([
          ...userAvatar,
          UserMenusMap['robotControl'],
          UserMenusMap['divider'],
          UserMenusMap['licenseAdmin'],
          UserMenusMap['singOut'],
        ])
      }
      // CE-审核员
      if (userInfo.role === 'auditor') {
        isNew = true
        let cacheMenus: UserMenuItemType[] = [
          ...userAvatar,
          UserMenusMap['pluginAudit'],
          UserMenusMap['misstatement'],
          UserMenusMap['robotControl'],
        ].concat(signOutMenu)
        // IRify 版本时管理员不显示插件管理
        if (isIRify()) {
          cacheMenus = cacheMenus.filter((item) => (item as CeUserItemProps).key !== 'plugin-audit')
        }
        setUserMenu(cacheMenus)
      }
      // CE-非权限人员
      if (!isNew) {
        setUserMenu([...userAvatar, UserMenusMap['robotControl'], ...signOutMenu])
      }
    }
  }, [userInfo.role, userInfo.platform, userInfo.companyHeadImg, dynamicConnect, apiKeysInfo])

  const apiFetchApiKeys = useMemoizedFn((apikey: string, isLoading: boolean = false) => {
    isLoading && setApiKeysInfoLoading(true)
    NetWorkApi<API.ApiKeysRequest, API.ApiKeysResponse>({
      method: 'post',
      url: 'apikeys',
      data: {
        keyword: apikey,
      },
    })
      .then((res) => {
        if (res.data.length > 0) {
          setApiKeysInfo(res.data[0])
        } else {
          setApiKeysInfo(undefined)
        }
      })
      .catch((err) => {
        yakitFailed(t('FuncDomain.getApiKeyDetailFailed', { error: err }))
      })
      .finally(() => {
        isLoading && setApiKeysInfoLoading(false)
      })
  })

  const getGrpcApiKey = useDebounceFn(
    () => {
      if (userInfo.isLogin && userInfo.token && userInfo.platform !== 'company') {
        yakitEngine
          .getApiKeyByOnline({ Token: userInfo.token })
          .then((res) => {
            cacheApiKeyRef.current = res.ApiKey
            apiFetchApiKeys(res.ApiKey)
          })
          .catch((err) => {
            yakitFailed(t('FuncDomain.getApiKeyTokenFailed', { error: err }))
          })
      }
      if (!userInfo.isLogin) {
        setApiKeysInfo(undefined)
        cacheApiKeyRef.current = undefined
      }
    },
    { wait: 500 },
  ).run

  const onUpdateApiKey = useMemoizedFn((isLoading: boolean = false) => {
    if (cacheApiKeyRef.current) {
      apiFetchApiKeys(cacheApiKeyRef.current, isLoading)
    } else {
      getGrpcApiKey()
    }
  })

  useEffect(() => {
    getGrpcApiKey()
  }, [userInfo.isLogin])

  /** 渲染端通信-打开一个指定页面 */
  const onOpenPage = useMemoizedFn((info: RouteToPageProps) => {
    emiter.emit('menuOpenPage', JSON.stringify(info))
  })

  useEffect(() => {
    // ipc通信退出登录
    const cleanup = yakitUILayout.onSignOutRequested(() => {
      setStoreUserInfo(defaultUserInfo)
      loginOut(userInfo)
    })
    return () => {
      cleanup()
    }
  }, [])

  useEffect(() => {
    // 强制修改密码
    const cleanup = yakitUILayout.onResetPassword(() => {
      setPasswordShow(true)
      setPasswordClose(false)
    })
    return () => {
      cleanup()
    }
  }, [])

  const onCloseControlMyselfModal = useMemoizedFn(() => {
    setControlMyselfModal(false)
  })
  useEffect(() => {
    emiter.on('onCloseControlMyselfModal', onCloseControlMyselfModal)
    return () => {
      emiter.off('onCloseControlMyselfModal', onCloseControlMyselfModal)
    }
  }, [])

  const onUserMenuClick = useMemoizedFn((key: string) => {
    if (key === 'sign-out') {
      if (dynamicStatus.isDynamicStatus || dynamicStatus.isDynamicSelfStatus) {
        Modal.confirm({
          title: t('YakitModal.friendlyReminder'),
          icon: <ExclamationCircleOutlined />,
          content: t('FuncDomain.signOutRemoteConfirm'),
          cancelText: t('YakitButton.cancel'),
          okText: t('YakitButton.exit'),
          onOk() {
            if (dynamicStatus.isDynamicStatus) {
              yakitNetwork.logoutDynamicControl({
                loginOut: true,
              })
            }
            if (dynamicStatus.isDynamicSelfStatus) {
              yakitNetwork.killDynamicControl().finally(() => {
                setStoreUserInfo(defaultUserInfo)
                loginOut(userInfo)
                setTimeout(() => success(t('FuncDomain.signOutSuccess')), 500)
              })
              // 立即退出界面
              yakitNetwork.exitDynamicControlPage()
            }
          },
          onCancel() {},
          cancelButtonProps: {
            size: 'small',
            className: 'modal-cancel-button',
          },
          okButtonProps: { size: 'small', className: 'modal-ok-button' },
        })
      } else {
        setStoreUserInfo(defaultUserInfo)
        loginOut(userInfo)
        setTimeout(() => success(t('FuncDomain.signOutSuccess')), 500)
      }
    }
    if (key === 'trust-list') {
      onOpenPage({ route: YakitRoute.TrustListPage })
    }
    if (key === 'set-password') {
      setPasswordClose(true)
      setPasswordShow(true)
    }
    if (key === 'upload-data') setUploadModalShow(true)
    if (key === 'role-admin') {
      onOpenPage({ route: YakitRoute.RoleAdminPage })
    }
    if (key === 'account-admin') {
      onOpenPage({ route: YakitRoute.AccountAdminPage })
    }
    if (key === 'license-admin') {
      onOpenPage({ route: YakitRoute.LicenseAdminPage })
    }
    if (key === 'plugin-audit') {
      onOpenPage({ route: YakitRoute.Plugin_Audit })
    }
    if (key === 'hole-collect') {
      onOpenPage({ route: YakitRoute.HoleCollectPage })
    }
    if (key === 'control-admin') {
      onOpenPage({ route: YakitRoute.ControlAdminPage })
    }
    if (key === 'data-statistics') {
      onOpenPage({ route: YakitRoute.Data_Statistics })
    }
    if (key === 'system-config') {
      onOpenPage({ route: YakitRoute.System_Config })
    }
    if (key === 'dynamic-control') {
      setDynamicControlModal(true)
    }
    if (key === 'close-dynamic-control') {
      yakitNetwork.logoutDynamicControl({ loginOut: false })
    }
    if (key === 'misstatement') {
      onOpenPage({ route: YakitRoute.Misstatement })
    }
    if (key === 'robot-control') {
      setRobotControlModal(true)
    }
    if (key === 'payment') {
      setPaymentShow(true)
    }
  })

  return {
    userMenu,
    ceUserMenuShow,
    setCeUserMenuShow,
    usageStatisticsShow,
    setUsageStatisticsShow,
    apiKeysInfo,
    apiKeysInfoLoading,
    onUpdateApiKey,
    passwordShow,
    setPasswordShow,
    passwordClose,
    uploadModalShow,
    setUploadModalShow,
    dynamicControlModal,
    setDynamicControlModal,
    controlMyselfModal,
    setControlMyselfModal,
    controlOtherModal,
    setControlOtherModal,
    dynamicMenuOpen,
    setDynamicMenuOpen,
    robotControlModal,
    setRobotControlModal,
    imControlBadge,
    imControlStatus,
    refreshIMControlStatus,
    onUserMenuClick,
    loginShow,
    setLoginShow,
    paymentShow,
    setPaymentShow,
  }
}
