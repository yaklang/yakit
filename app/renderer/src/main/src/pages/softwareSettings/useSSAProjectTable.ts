import { useEffect, useRef, useState } from 'react'
import { useControllableValue, useDebounceFn, useMemoizedFn } from 'ahooks'
import { RJSFSchema } from '@rjsf/utils'
import { genDefaultPagination, QueryGeneralResponse } from '@/pages/invoker/schema'
import { Paging } from '@/utils/yakQueryHTTPFlow'
import {
  DeleteSSAProjectRequest,
  SSAProjectFilter,
  SSAProjectResponse,
} from '@/pages/yakRunnerAuditCode/AuditCode/AuditCodeType'
import { grpcFetchLocalPluginDetail } from '@/pages/pluginHub/utils/grpc'
import { failed, success, yakitFailed } from '@/utils/notification'
import { JSONParseLog } from '@/utils/tool'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import {
  isIRifySharedSchemaProject,
  normalizeSSAProjectResponse,
  SSAProjectPoolUI,
  toSSAProjectListPoolGRPC,
} from './ssaProjectTableShared'
import emiter from '@/utils/eventBus/eventBus'
import { isIRify } from '@/utils/envfile'

const { ipcRenderer } = window.require('electron')

export interface UseSSAProjectTableOptions {
  refresh?: boolean
  setRefresh?: (v: boolean) => void
  /** IRify 项目管理页：隐藏行内删除、展示双库列 */
  variant?: 'default' | 'irify'
  /** Fixed list pool: shared (internal) vs dedicated (external). Default auto uses profile scope. */
  projectPool?: SSAProjectPoolUI
}

export const useSSAProjectTable = (options: UseSSAProjectTableOptions = {}) => {
  const { variant = 'default', projectPool = 'auto' } = options
  const { t } = useI18nNamespaces(['yakRunner', 'yakitUi'])
  const [JSONStringConfig, setJSONStringConfig] = useState<string>()
  const [refresh, setRefresh] = useControllableValue<boolean>(options, {
    defaultValue: false,
    valuePropName: 'refresh',
    trigger: 'setRefresh',
  })
  const [params, setParams] = useState<SSAProjectFilter>({ SearchKeyword: '' })
  const [pagination, setPagination] = useState<Paging>({
    ...genDefaultPagination(20),
    Order: 'asc',
    OrderBy: 'created_at',
  })
  const [loading, setLoading] = useState<boolean>(false)
  const [data, setData] = useState<SSAProjectResponse[]>([])
  const [total, setTotal] = useState<number>(0)
  const [hasMore, setHasMore] = useState<boolean>(false)
  const [isAllSelect, setIsAllSelect] = useState<boolean>(false)
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([])
  const [deleteParams, setDeleteParams] = useState<{
    titile: string
    params: DeleteSSAProjectRequest
  }>()
  const [isAllowIRifyUpdate, setIsAllowIRifyUpdate] = useState<boolean>(false)
  const isGrpcRef = useRef<boolean>(false)
  const afterId = useRef<number>()
  const [schema, setSchema] = useState<RJSFSchema>({})
  const [sharedMode, setSharedMode] = useState<boolean>(projectPool !== 'dedicated')

  const buildQueryFilter = useMemoizedFn((): SSAProjectFilter => {
    const listPool = toSSAProjectListPoolGRPC(projectPool)
    if (listPool === 0) {
      return params
    }
    return { ...params, ListPool: listPool as SSAProjectFilter['ListPool'] }
  })

  const refreshProfileMode = useMemoizedFn(async () => {
    if (variant !== 'irify' || !isIRify()) {
      return
    }
    if (projectPool === 'shared') {
      setSharedMode(true)
      return
    }
    if (projectPool === 'dedicated') {
      setSharedMode(false)
      return
    }
    try {
      const res = await ipcRenderer.invoke('GetCurrentProjectEx', { Type: 'ssa_project' })
      setSharedMode(isIRifySharedSchemaProject(res?.ProjectName))
    } catch {
      setSharedMode(true)
    }
  })

  const handleFetchJSONSchema = useDebounceFn(
    useMemoizedFn(async () => {
      try {
        const newPlugin = await grpcFetchLocalPluginDetail({ Name: 'SSA 项目更新' }, true)
        newPlugin.Params.forEach((item) => {
          if (item.Field === 'config_data') {
            const schema = JSONParseLog(item?.JsonSchema || '{}', {
              page: 'AuditCode',
              fun: 'handleFetchJSONSchema',
            })
            setSchema(schema)
          }
        })
      } catch (error) {
        failed(t('AuditCode.fetchJsonSchemaFailed'))
      }
    }),
    { wait: 300 },
  ).run

  useEffect(() => {
    handleFetchJSONSchema()
  }, [])

  useEffect(() => {
    refreshProfileMode()
  }, [variant, projectPool])

  useEffect(() => {
    const onRefreshList = () => {
      refreshProfileMode().finally(() => update(true))
    }
    const onProjectInfo = () => {
      refreshProfileMode().finally(() => update(true))
    }
    emiter.on('onRefreshSSAProjectList', onRefreshList)
    emiter.on('onGetProjectInfo', onProjectInfo)
    return () => {
      emiter.off('onRefreshSSAProjectList', onRefreshList)
      emiter.off('onGetProjectInfo', onProjectInfo)
    }
  }, [])

  const onSelectAll = useMemoizedFn(() => {
    if (isAllSelect) {
      setIsAllSelect(false)
      setSelectedRowKeys([])
    } else {
      setIsAllSelect(true)
      setSelectedRowKeys(data.map((item) => item.ID))
    }
  })

  const onSelectChange = useMemoizedFn((c: boolean, keys: string, rows: SSAProjectResponse) => {
    if (c) {
      setSelectedRowKeys([...selectedRowKeys, rows.ID])
    } else {
      setIsAllSelect(false)
      setSelectedRowKeys(selectedRowKeys.filter((ele) => ele !== rows.ID))
    }
  })

  useEffect(() => {
    update(true)
  }, [refresh])

  const update = useMemoizedFn(async (reload?: boolean, page?: number, limit?: number) => {
    if (isGrpcRef.current) return
    isGrpcRef.current = true
    const paginationProps = {
      ...pagination,
      Page: page || 1,
      Limit: limit || pagination.Limit,
    }
    if (reload) {
      afterId.current = undefined
      setLoading(true)
      setRefresh(!refresh)
    }

    const queryFilter = buildQueryFilter()

    ipcRenderer
      .invoke('QuerySSAProject', {
        Filter: queryFilter,
        Pagination: { ...paginationProps, AfterId: reload ? undefined : parseInt(afterId.current + '') },
      })
      .then((item: QueryGeneralResponse<SSAProjectResponse>) => {
        const projects = ((item as any).Projects || []).map(normalizeSSAProjectResponse)
        item.Data = projects
        const newData = reload ? item.Data : data.concat(item.Data)
        const isMore = item.Data.length < item.Pagination.Limit || newData.length === total
        setHasMore(!isMore)
        if (isAllSelect) setSelectedRowKeys(newData.map((item) => item.ID))
        setData(newData)
        setPagination(item.Pagination || genDefaultPagination(200))
        if (reload) {
          setTotal(item.Total)
        } else {
          getTotalFun()
        }
      })
      .catch((e) => {
        yakitFailed(t('AuditCode.fetchListDataFailed', { error: String(e) }), true)
      })
      .finally(() =>
        setTimeout(() => {
          setLoading(false)
          isGrpcRef.current = false
        }, 300),
      )
  })

  const getTotalFun = useMemoizedFn(() => {
    const queryFilter = buildQueryFilter()
    ipcRenderer
      .invoke('QuerySSAProject', {
        Filter: queryFilter,
        Pagination: { ...pagination, Page: 1, Limit: pagination.Limit },
      })
      .then((item: QueryGeneralResponse<SSAProjectResponse>) => {
        setTotal(item.Total)
      })
  })

  const onDelete = useMemoizedFn(async (deleteReq: DeleteSSAProjectRequest) => {
    setLoading(true)
    try {
      const resp = await ipcRenderer.invoke('DeleteSSAProject', { ...deleteReq })
      const effectRows = resp?.Message?.EffectRows ?? resp?.message?.EffectRows ?? 0
      if (effectRows <= 0) {
        failed(t('YakitNotification.deleteFailed', { error: 'no project affected' }))
        return
      }
      update(true)
      setIsAllSelect(false)
      setSelectedRowKeys([])
      setDeleteParams(undefined)
      success(t('AuditCode.deleteSuccess'))
      emiter.emit('onRefreshSSAProjectList')
    } catch (error) {
      failed(t('YakitNotification.deleteFailed', { error: String(error) }))
    } finally {
      setLoading(false)
    }
  })

  const loadMoreData = useMemoizedFn(() => {
    if (data.length > 0) {
      afterId.current = data[data.length - 1].ID
      update()
    }
  })

  const onDeleteHistoryOnly = useMemoizedFn(() => {
    deleteParams && onDelete({ ...deleteParams.params, DeleteMode: 'clear_compile_history' })
  })

  const onDeleteAll = useMemoizedFn(() => {
    deleteParams && onDelete({ ...deleteParams.params, DeleteMode: 'delete_all' })
  })

  const openBatchDeleteHint = useMemoizedFn(() => {
    setDeleteParams({
      titile:
        selectedRowKeys.length === 0
          ? t('AuditCode.confirmClearProjectList')
          : t('AuditCode.confirmDeleteSelectedProjects'),
      params:
        selectedRowKeys.length === 0
          ? { DeleteAllProject: true }
          : {
              Filter: {
                IDs: selectedRowKeys.map((item) => parseInt(item + '')),
              },
            },
    })
  })

  return {
    variant,
    projectPool,
    sharedMode,
    t,
    JSONStringConfig,
    setJSONStringConfig,
    refresh,
    setRefresh,
    params,
    setParams,
    pagination,
    loading,
    data,
    setData,
    total,
    hasMore,
    isAllSelect,
    selectedRowKeys,
    setSelectedRowKeys,
    deleteParams,
    setDeleteParams,
    isAllowIRifyUpdate,
    setIsAllowIRifyUpdate,
    schema,
    onSelectAll,
    onSelectChange,
    update,
    onDelete,
    loadMoreData,
    onDeleteHistoryOnly,
    onDeleteAll,
    openBatchDeleteHint,
  }
}

export type SSAProjectTableState = ReturnType<typeof useSSAProjectTable>
