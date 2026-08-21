import { useState } from 'react'
import { useGetState, useMemoizedFn } from 'ahooks'
import { useStore } from '@/store'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { yakitNotify } from '@/utils/notification'
import { isEnpriTrace } from '@/utils/envfile'
import {
  getEnvTypeByProjects,
  type ProjectParamsProp,
  type ProjectsResponse,
} from '@/pages/softwareSettings/projectUtils'
import { apiFetchMessageRead, apiFetchQueryAllTask } from './utils'
import emiter from '@/utils/eventBus/eventBus'
import type { API } from '@/services/swagger/resposeType'
import type { YakitButtonProp } from '@/components/yakitUI/YakitButton/YakitButton'

interface TaskModalInfoProps {
  visible: boolean
  loading: boolean
  title: string
  data: API.MessageLogDetail[]
  okButtonText?: string
  cancelButtonText?: string
  cancelButtonProps?: YakitButtonProp
}

interface TaskErrorModalInfoProps {
  visible: boolean
  loading: boolean
  title: string
  data: string[]
  okButtonText?: string
  cancelButtonText?: string
  cancelButtonProps?: YakitButtonProp
}

interface StartTProps {
  // 如若有值则为任务单个已读，没有值则为全部任务已读
  item?: API.MessageLogDetail
  // 是否全部已读其余消息
  isReadAllOther?: boolean
}

interface useEETaskNotificationHookProps {
  refresh?: () => void
}

const { ipcRenderer } = window.require('electron')

/** @name 企业版任务通知 */
export const useEETaskNotificationHook = (props: useEETaskNotificationHookProps) => {
  const { refresh } = props
  const { t } = useI18nNamespaces(['components'])
  const { userInfo } = useStore()
  const [params, setParams, getParams] = useGetState<ProjectParamsProp>({
    Type: 'all',
    Pagination: { Page: 1, Limit: 1000, Order: 'desc', OrderBy: 'updated_at' },
  })
  const [loading, setLoading] = useState<boolean>(false)
  const [taskList, setTaskList] = useState<API.MessageLogDetail[]>([])
  // 名称重复的taskList
  const [reNames, setReNames] = useState<string[]>([])

  // 任务通知的展示Modal控制
  const [taskModalInfo, setTaskModalInfo] = useState<TaskModalInfoProps>({
    visible: false,
    loading: false,
    title: t('MessageCenter.taskNotification'),
    data: [],
    okButtonText: t('MessageCenter.ok'),
    cancelButtonProps: {
      style: { display: 'none' },
    },
  })

  // 创建任务重名异常的Modal控制
  const [taskErrModalInfo, setTaskErrModalInfo] = useState<TaskErrorModalInfoProps>({
    visible: false,
    loading: false,
    title: t('MessageCenter.createTaskError'),
    data: [],
    okButtonText: t('MessageCenter.coverProject'),
    cancelButtonText: t('MessageCenter.later'),
  })

  /** @name 校验任务重名 */
  const onJudgeRepeat: (names: string[]) => Promise<string[]> = useMemoizedFn((names: string[]) => {
    return new Promise(async (resolve, reject) => {
      if (names.length === 0) return resolve([])
      const param: ProjectParamsProp = {
        ...getParams(),
        Pagination: {
          ...getParams().Pagination,
          Page: getParams().Pagination.Page,
          Limit: getParams().Pagination.Limit,
        },
        ProjectName: names.join(','),
      }
      ipcRenderer
        .invoke('GetProjects', param)
        .then((rsp: ProjectsResponse) => {
          const newReNames = rsp.Projects.map((item) => {
            return item.ProjectName
          })
          resolve(newReNames)
        })
        .catch((err) => {
          yakitNotify('error', t('MessageCenter.judgeRepeatError', { err: String(err) }))
          reject(err)
        })
    })
  })

  /** @name 获取任务通知 */
  const getTaskNotification = useMemoizedFn(async (obj?: StartTProps) => {
    try {
      const { item, isReadAllOther } = obj || {}
      // 获取需要操作的任务
      let data: API.MessageLogDetail[] = item ? [item] : []
      if (!item) {
        data = (await apiFetchQueryAllTask())?.data || []
      }
      // 全部已读其余消息
      if (isReadAllOther) {
        // 已取消的任务直接进行已读操作
        const excludeHash = data
          .filter((task) => task.status !== 3)
          .map((i) => i.hash)
          .join(',')
        await apiFetchMessageRead({
          isAll: true,
          hash: '',
          excludeHash,
        })
        setLoading(false)
      }
      const newTaskList = data.filter((task) => task.status === 1)
      const endTaskList = data.filter((task) => task.status === 2)
      // 如若没有数据则无需进行任务通知
      if (newTaskList.length === 0 && endTaskList.length === 0) {
        refresh?.()
        return
      }

      setTaskList(data)
      // 此处还需校验新任务是否在项目管理中已存在，如若存在后续还将提示用户存在重名项目
      const names = newTaskList.map((item) => item.taskName || '').filter((name) => name !== '')
      const newReNames = await onJudgeRepeat(names)
      setReNames(newReNames)
      // 打开任务通知Modal
      setTaskModalInfo((v) => ({ ...v, visible: true, data }))
    } catch (error: any) {
      yakitNotify('error', t('MessageCenter.getTaskNotificationError', { error: String(error?.message || error) }))
      setLoading(false)
    }
  })

  /** @name 新建项目 */
  const createP = useMemoizedFn((list: API.MessageLogDetail[]) => {
    return new Promise(async (resolve, reject) => {
      try {
        const promiseList = list.map((item) => {
          const params = {
            ProjectName: item.taskName,
            Type: getEnvTypeByProjects(),
            ExternalModule: '',
            ExternalProjectCode: '',
            // 是否为线上任务项目
            OnlineSubTaskID: item.subTaskId,
            Description: item.description || '',
          }

          return ipcRenderer
            .invoke('NewProject', params)
            .then((res) => ({
              status: 'fulfilled',
              value: res,
              data: item,
            }))
            .catch((err) => ({
              status: 'rejected',
              reason: err,
              data: item,
            }))
        })
        // 批量创建项目
        const results = await Promise.all(promiseList)
        const success = results
          .filter((item) => item.status === 'fulfilled')
          .map((item) => item.data) as API.MessageLogDetail[]
        const failed = results
          .filter((item) => item.status === 'rejected')
          .map((item) => item.data) as API.MessageLogDetail[]
        // 创建成功的项目置为已读
        if (success.length > 0) {
          const successHashes = success.map((item) => item.hash)
          const successInfo = success.map((item) => `${item.taskName}`).join('，')
          yakitNotify('success', t('MessageCenter.createTaskProjectSuccess', { successInfo }))
          await apiFetchMessageRead({
            isAll: false,
            hash: successHashes.join(','),
          })
          emiter.emit('onRefreshProjectList')
          refresh?.()
        }
        // 创建失败的项目提示错误
        if (failed.length > 0) {
          const failedInfo = failed.map((item) => `${item.taskName}`).join('，')
          yakitNotify('error', t('MessageCenter.createTaskProjectFailed', { failedInfo }))
        }
        resolve(null)
      } catch (error) {
        reject(error)
      }
    })
  })

  /** @name 启动任务通知 */
  const startT = useMemoizedFn((obj?: StartTProps) => {
    if (!isEnpriTrace() || !userInfo.isLogin) return
    setLoading(true)
    getTaskNotification(obj)
  })

  /** @name 任务通知确认 */
  const sureT = useMemoizedFn(async () => {
    try {
      setTaskModalInfo((v) => ({ ...v, loading: true }))

      // 非重名项目新建
      const projectList = taskList.filter(
        (item) => item.status === 1 && (item.taskName || '').length > 0 && !reNames.includes(item.taskName || ''),
      )
      await createP(projectList)
      // 将结束的任务已读
      const endTaskList = taskList.filter((item) => item.status === 2 && (item.taskName || '').length > 0)
      if (endTaskList.length > 0) {
        await apiFetchMessageRead({
          isAll: false,
          hash: endTaskList.map((item) => item.hash).join(','),
        })
        refresh?.()
      }

      // 新建完成后才考虑关闭
      setTaskModalInfo((v) => ({ ...v, visible: false, loading: false, data: [] }))
      // 如若存在重名项目
      if (reNames.length > 0) {
        setTaskErrModalInfo((v) => ({ ...v, visible: true, data: reNames }))
      }
    } catch (error) {}
  })

  /** @name 覆盖项目 */
  const coverP = useMemoizedFn(async () => {
    try {
      // 需考虑当前打开项目是否存在于重名列表中
      const projectReNamesList = taskList.filter(
        (item) => item.status === 1 && (item.taskName || '').length > 0 && reNames.includes(item.taskName || ''),
      )
      await createP(projectReNamesList)
      // 覆盖完成后才考虑关闭
      setTaskErrModalInfo((v) => ({ ...v, visible: false }))
    } catch (error) {}
  })

  /** @name 稍后处理 */
  const waitP = useMemoizedFn(() => {
    // 直接关闭，不做已读处理
    setTaskErrModalInfo((v) => ({ ...v, visible: false }))
  })

  return [loading, taskModalInfo, taskErrModalInfo, { startT, sureT, coverP, waitP }] as const
}
