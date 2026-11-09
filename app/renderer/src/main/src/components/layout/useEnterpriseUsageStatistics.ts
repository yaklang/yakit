import { useEffect, useRef } from 'react'
import { yakitApp } from '@/services/electronBridge'
import { visitorsStatisticsFun } from '@/utils/visitorsStatistics'

const HEARTBEAT_MS = 60_000
const IDLE_MS = 30 * 60_000
type UsageActivity = Awaited<ReturnType<typeof yakitApp.getUsageActivity>>

/** 按前台交互统计使用时间；后台扫描、AI 输出及窗口恢复本身均不算用户操作。 */
export const useEnterpriseUsageStatistics = (collectData: boolean, isLogin: boolean, token?: string) => {
  const loginReported = useRef<string | undefined>(undefined)
  const session = useRef<{ token: string; startedAt: number } | undefined>(undefined)

  useEffect(() => {
    if (!isLogin || !token) {
      session.current = undefined
      loginReported.current = undefined
      return
    }
    if (session.current?.token !== token) {
      session.current = { token, startedAt: Date.now() }
      loginReported.current = undefined
    }
    if (!collectData) return

    const startedAt = session.current.startedAt
    let stopped = false
    let activity: UsageActivity | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    let nextReportAt: number | undefined
    let pauseGeneration = 0
    let pending = false

    const idleAt = () => Math.max(startedAt, activity?.lastActivityAt ?? 0) + IDLE_MS
    const active = () => !stopped && activity?.foreground === true && Date.now() < idleAt()

    const acceptActivity = (value: UsageActivity) => {
      if (stopped || (activity && value.revision < activity.revision)) return
      activity = value
      schedule()
    }

    const report = () => {
      if (pending) return
      pending = true
      const generation = pauseGeneration
      // 获取机器码期间可能已经离开应用，发请求前重新向主进程核验窗口状态。
      void visitorsStatisticsFun(token, undefined, async () => {
        if (!active() || generation !== pauseGeneration) return false
        try {
          acceptActivity(await yakitApp.getUsageActivity())
          return active() && generation === pauseGeneration
        } catch {
          return false
        }
      }).finally(() => {
        pending = false
      })
    }

    function schedule() {
      if (timer !== undefined) clearTimeout(timer)
      timer = undefined
      if (!active()) {
        if (nextReportAt !== undefined) pauseGeneration += 1
        nextReportAt = undefined
        return
      }
      // 恢复后重新等待一分钟，不补发暂停期间的心跳；输入事件不推迟既有周期。
      nextReportAt ??= Date.now() + HEARTBEAT_MS
      timer = setTimeout(
        () => {
          timer = undefined
          if (active() && nextReportAt !== undefined && Date.now() >= nextReportAt) {
            nextReportAt = Date.now() + HEARTBEAT_MS
            report()
          }
          schedule()
        },
        Math.max(0, Math.min(nextReportAt, idleAt()) - Date.now()),
      )
    }

    // 登录事件与活跃心跳分离。标记在实际发送前设置，避免 StrictMode 清理或异步机器码造成漏报。
    void visitorsStatisticsFun(token, 'login', () => {
      if (stopped || loginReported.current === token) return false
      loginReported.current = token
      return true
    })
    const unsubscribe = yakitApp.onUsageActivity(acceptActivity)
    // 先订阅再取快照，用 revision 避免迟到的初始响应覆盖较新的窗口事件。
    void yakitApp
      .getUsageActivity()
      .then(acceptActivity)
      .catch(() => {})

    return () => {
      stopped = true
      pauseGeneration += 1
      if (timer !== undefined) clearTimeout(timer)
      unsubscribe()
    }
  }, [collectData, isLogin, token])
}
