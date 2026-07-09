export type IMControlBadgeState = 'hidden' | 'idle' | 'starting' | 'running' | 'degraded' | 'error'
export type IMControlBadgeColor = 'gray' | 'green' | 'yellow' | 'red'

export interface IMControlBadgePlatform {
  Platform?: string
  Connected?: boolean
  Message?: string
}

export interface IMControlBadgeStatus {
  Running?: boolean
  Platforms?: IMControlBadgePlatform[]
}

export interface DeriveIMControlBadgeParams {
  isLogin: boolean
  loading?: boolean
  status?: IMControlBadgeStatus
}

export interface IMControlBadgeView {
  visible: boolean
  state: IMControlBadgeState
  color: IMControlBadgeColor
  label: string
  detail: string
}

export const deriveIMControlBadge = (params: DeriveIMControlBadgeParams): IMControlBadgeView => {
  const { isLogin, loading, status } = params
  if (!isLogin) {
    return {
      visible: false,
      state: 'hidden',
      color: 'gray',
      label: '',
      detail: '',
    }
  }

  if (loading && !status) {
    return {
      visible: true,
      state: 'starting',
      color: 'yellow',
      label: '移动端控制同步中',
      detail: '正在同步移动端控制状态',
    }
  }

  if (!status?.Running) {
    return {
      visible: true,
      state: 'idle',
      color: 'gray',
      label: '移动端控制未启动',
      detail: '已登录，移动端控制服务未启动',
    }
  }

  const platforms = status.Platforms || []
  const connected = platforms.filter((item) => item.Connected)
  const disconnected = platforms.filter((item) => !item.Connected)

  if (platforms.length === 0) {
    return {
      visible: true,
      state: 'starting',
      color: 'yellow',
      label: '移动端控制启动中',
      detail: '服务已启动，正在等待平台连接状态',
    }
  }

  if (connected.length === platforms.length) {
    return {
      visible: true,
      state: 'running',
      color: 'green',
      label: '移动端控制运行中',
      detail: formatPlatformDetail(connected),
    }
  }

  if (connected.length > 0 && disconnected.length > 0) {
    return {
      visible: true,
      state: 'degraded',
      color: 'yellow',
      label: '移动端控制部分异常',
      detail: formatPlatformDetail(platforms),
    }
  }

  return {
    visible: true,
    state: 'error',
    color: 'red',
    label: '移动端控制异常',
    detail: formatPlatformDetail(platforms),
  }
}

const formatPlatformDetail = (platforms: IMControlBadgePlatform[]): string => {
  if (platforms.length === 0) return '暂无平台状态'
  return platforms
    .map((item) => {
      const platform = item.Platform || 'unknown'
      const status = item.Connected ? '已连接' : '异常'
      return item.Message ? `${platform}: ${status}，${item.Message}` : `${platform}: ${status}`
    })
    .join('\n')
}
