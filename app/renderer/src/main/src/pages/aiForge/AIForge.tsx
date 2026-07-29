import React, { useEffect, useRef, useState } from 'react'
import { AIForgePageItemProps, AIForgeProps } from './AIForgeType'
import { useCreation, useDebounceFn, useInViewport, useMemoizedFn, useSelections } from 'ahooks'
import { AIForge, QueryAIForgeRequest, QueryAIForgeResponse } from '../ai-agent/type/forge'
import { AIForgeListDefaultPagination } from '../ai-agent/defaultConstant'
import { grpcDeleteAIForge, grpcQueryAIForge } from '../ai-agent/grpc'
import { HubGridList, HubGridOpt } from '../pluginHub/pluginHubList/funcTemplate'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import styles from './AIForge.module.scss'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { useEmptyImage } from '@/hook/useResultEmpty/SearchEmpty'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import {
  OutlineExportIcon,
  OutlineImportIcon,
  OutlinePencilaltIcon,
  OutlinePlusIcon,
  OutlineRefreshIcon,
  OutlineSearchIcon,
  OutlineTrashIcon,
} from '@/assets/icon/outline'
import { YakitRoute } from '@/enums/yakitRoute'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { TableTotalAndSelectNumber } from '@/components/TableTotalAndSelectNumber/TableTotalAndSelectNumber'
import { Divider } from 'antd'
import { BatchExportAIforgeRef, ExportAIForgeRequest, ImportAIforgeRef } from '../ai-agent/forgeName/type'
import {
  BatchExportAIforge,
  handleAddAIForge,
  handleModifyAIForge,
  ImportAIforge,
} from '../ai-agent/forgeName/ForgeName'
import { YakitCheckbox } from '@/components/yakitUI/YakitCheckbox/YakitCheckbox'
import { YakitPopconfirm } from '@/components/yakitUI/YakitPopconfirm/YakitPopconfirm'
import { yakitNotify } from '@/utils/notification'
const AIForgePage: React.FC<AIForgeProps> = React.memo((props) => {
  const emptyImageTarget = useEmptyImage('search')
  const [response, setResponse] = useState<QueryAIForgeResponse>({
    Pagination: { ...AIForgeListDefaultPagination },
    Data: [],
    Total: 0,
  })
  // 列表无条件下的总数
  const [listTotal, setListTotal] = useState<number>(0)

  // 搜索条件
  const [search, setSearch] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)

  const batchExportRef = useRef<BatchExportAIforgeRef>(null)
  const importRef = useRef<ImportAIforgeRef>(null)

  // 是否为获取列表第一页的加载状态
  const isInitLoading = useRef<boolean>(false)
  const hasMore = useRef<boolean>(true)

  const forgeRef = useRef<HTMLDivElement>(null)
  const [inViewPort = true] = useInViewport(forgeRef)
  useEffect(() => {
    if (inViewPort) {
      fetchData(true)
      fetchInitTotal()
    }
  }, [inViewPort])
  const fetchInitTotal = useMemoizedFn(() => {
    const request: QueryAIForgeRequest = {
      Pagination: {
        ...response.Pagination,
        Page: 1,
        Limit: 1,
      },
    }
    grpcQueryAIForge(request, true)
      .then((res) => {
        setListTotal(Number(res.Total) || 0)
      })
      .catch(() => {})
  })
  // 刷新列表(是否刷新高级筛选数据)
  const handleRefreshList = useDebounceFn(
    useMemoizedFn(() => {
      fetchData(true)
    }),
    { wait: 200 },
  ).run
  const handleEmiterTriggerRefresh = useDebounceFn(
    () => {
      fetchInitTotal()
      fetchData(true)
    },
    { wait: 300 },
  ).run
  // 获取 AI-Forge 列表
  const fetchData = useMemoizedFn((isInit?: boolean) => {
    if (loading) return
    if (isInit) {
      unSelectAll()
      hasMore.current = true
      isInitLoading.current = true
    }
    const pageInfo = response.Pagination
    const request: QueryAIForgeRequest = {
      Pagination: {
        ...pageInfo,
        Page: isInit ? 1 : ++pageInfo.Page,
      },
    }
    if (search) request.Filter = { Keyword: search }

    setLoading(true)
    grpcQueryAIForge(request)
      .then((res) => {
        const newLength = res.Data?.length || 0
        if (newLength < request.Pagination.Limit) hasMore.current = false
        else hasMore.current = true

        const newArr = isInit ? res.Data : response.Data.concat(res.Data)
        setResponse({ ...res, Pagination: request.Pagination, Data: newArr })
      })
      .catch(() => {})
      .finally(() => {
        setTimeout(() => {
          isInitLoading.current = false
          setLoading(false)
        }, 300)
      })
  })
  const onUpdateList = useMemoizedFn(() => {
    fetchData()
  })
  const onNewForge = useMemoizedFn(() => {
    handleAddAIForge(YakitRoute.AI_Forge)
  })
  const listLength = useCreation(() => {
    return Number(response.Total) || 0
  }, [response.Total])

  const { selected, allSelected, isSelected, toggle, toggleAll, unSelectAll, partiallySelected } = useSelections(
    response.Data,
  )
  const selectedLength = useCreation(() => {
    return selected.length
  }, [selected.length])
  const onBatchExport = useMemoizedFn(() => {
    const query: ExportAIForgeRequest = {
      ForgeNames: [],
      OutputName: '',
      Filter: {
        Keyword: '',
      },
    }
    if (allSelected) {
      query.Filter = {
        Keyword: search,
      }
    } else {
      query.ForgeNames = selected.map((item) => item.ForgeName)
    }
    batchExportRef.current?.open(query)
  })
  const onExport = useMemoizedFn((data: AIForge) => {
    const tools = !!data?.ToolNames?.length ? data.ToolNames.filter(Boolean) : []
    batchExportRef.current?.open({
      ForgeNames: [data.ForgeName],
      ToolNames: tools,
      OutputName: data.ForgeVerboseName || data.ForgeName || '',
    })
  })
  const onImport = useMemoizedFn(() => {
    importRef.current?.open()
  })
  /** 单项勾选 */
  const optCheck = useMemoizedFn((data: AIForge) => {
    toggle(data)
  })
  // 删除 forge 模板
  const handleDeleteAIForge = useMemoizedFn((info: AIForge) => {
    const id = Number(info.Id) || 0
    if (!id) {
      yakitNotify('error', `该模板 ID('${info.Id}') 异常, 无法编辑`)
      return Promise.reject('ID 异常')
    }
    return grpcDeleteAIForge({ Id: id }).then(() => {
      setResponse((old) => {
        return {
          ...old,
          Total: Math.max(0, old.Total - 1),
          Data: old.Data.filter((item) => item.Id !== info.Id),
        }
      })
      setListTotal((v) => Math.max(0, v - 1))
      yakitNotify('success', '删除Forge模板成功')
    })
  })
  return (
    <div className={styles['ai-forge']} ref={forgeRef}>
      <div className={styles['hub-list-header']}>
        <div className={styles['title']}>技能库</div>
        <div className={styles['extra']}>
          <YakitInput.Search
            prefix={<OutlineSearchIcon className={styles['search-icon']} />}
            allowClear
            placeholder="请输入关键词搜索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="large"
            wrapperClassName={styles['search-input']}
            onSearch={handleRefreshList}
          />
          <Divider type="vertical" className={styles['diver-style']} />
          <YakitButton
            disabled={!selectedLength}
            type="outline2"
            size="large"
            icon={<OutlineExportIcon />}
            onClick={onBatchExport}
          >
            批量导出
          </YakitButton>
          <YakitButton type="outline2" size="large" icon={<OutlineImportIcon />} onClick={onImport}>
            导入
          </YakitButton>
          <YakitButton size="large" icon={<OutlinePlusIcon />} onClick={onNewForge}>
            新建技能
          </YakitButton>
        </div>
      </div>

      <div className={styles['ai-forge-content']}>
        <div className={styles['hub-list-subTitle']}>
          <div className={styles['select-all']}>
            <YakitCheckbox checked={allSelected} onChange={() => toggleAll()} indeterminate={partiallySelected} />
            <span>全选</span>
          </div>
          <TableTotalAndSelectNumber total={listLength} selectNum={selectedLength} />
        </div>
        <div className={styles['hub-list-wrapper']}>
          <YakitSpin spinning={loading && isInitLoading.current}>
            {listLength > 0 ? (
              <HubGridList
                data={response.Data || []}
                keyName="Id"
                loading={loading}
                hasMore={hasMore.current}
                updateList={onUpdateList}
                gridNode={(info) => {
                  const { index, data } = info
                  const check = isSelected(data)
                  return (
                    <AIForgePageItem
                      key={data.Id || index}
                      index={index}
                      data={data}
                      checked={check}
                      onCheck={optCheck}
                      onExport={onExport}
                      onRemove={handleDeleteAIForge}
                    />
                  )
                }}
              />
            ) : listTotal > 0 ? (
              <YakitEmpty
                image={emptyImageTarget}
                imageStyle={{ margin: '0 auto 24px', width: 274, height: 180 }}
                title="搜索结果“空”"
                className={styles['hub-list-empty']}
              />
            ) : (
              <div className={styles['hub-list-empty']}>
                <YakitEmpty title="暂无数据" description="可新建技能,创建属于自己的技能" />
                <div className={styles['refresh-buttons']}>
                  <YakitButton type="outline1" icon={<OutlinePlusIcon />} onClick={onNewForge}>
                    新建技能
                  </YakitButton>
                  <YakitButton type="outline1" icon={<OutlineRefreshIcon />} onClick={handleRefreshList}>
                    刷新
                  </YakitButton>
                </div>
              </div>
            )}
          </YakitSpin>
        </div>
      </div>
      <BatchExportAIforge ref={batchExportRef} />
      <ImportAIforge ref={importRef} onSuccess={handleEmiterTriggerRefresh} />
    </div>
  )
})

export default AIForgePage

const AIForgePageItem: React.FC<AIForgePageItemProps> = React.memo((props) => {
  const { index, data, checked, onCheck, onExport, onRemove } = props

  const [loading, setLoading] = useState<boolean>(false)

  const handleDeleteAIForge = useMemoizedFn((data: AIForge) => {
    setLoading(true)
    onRemove(data).finally(() => {
      setTimeout(() => {
        setLoading(false)
      }, 200)
    })
  })
  const isBuiltin = useCreation(() => {
    return !!data?.IsBuiltin
  }, [data?.IsBuiltin])

  return (
    <HubGridOpt
      order={index}
      info={data}
      checked={checked}
      onCheck={onCheck}
      title={data.ForgeVerboseName || data.ForgeName}
      type={data.ForgeType}
      tags={data.Tag?.join(',') || ''}
      help={data.Description || ''}
      img={''}
      user={isBuiltin ? 'yaklang.io' : ''}
      time={data?.UpdatedAt || 0}
      isCorePlugin={isBuiltin}
      official={isBuiltin}
      extraFooter={() => (
        <div className={styles['extra-footer']}>
          <YakitButton
            key="import"
            onClick={(e) => {
              e.stopPropagation()
              onExport(data)
            }}
            type="text2"
            icon={<OutlineExportIcon />}
          />
          <div className={styles['diver-style']} />
          <YakitButton
            type="text2"
            icon={<OutlinePencilaltIcon />}
            onClick={(e) => {
              e.stopPropagation()
              handleModifyAIForge(data, YakitRoute.AI_Forge)
            }}
          />
          {!isBuiltin && (
            <>
              <div className={styles['diver-style']} />
              <YakitPopconfirm
                title={'是否删除该 Forge 模板?'}
                onConfirm={(e) => {
                  e?.stopPropagation()
                  handleDeleteAIForge(data)
                }}
                onCancel={(e) => {
                  e?.stopPropagation()
                }}
              >
                <YakitButton
                  loading={loading}
                  type="text2"
                  icon={<OutlineTrashIcon className={styles['del-icon']} />}
                  onClick={(e) => {
                    e.stopPropagation()
                  }}
                />
              </YakitPopconfirm>
            </>
          )}
        </div>
      )}
    />
  )
})
