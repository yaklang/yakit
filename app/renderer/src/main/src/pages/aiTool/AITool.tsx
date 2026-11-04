import React, { useEffect, useRef, useState } from 'react'
import type { AIToolPageItemProps, AIToolProps } from './AIToolType'
import { useCreation, useDebounceFn, useInViewport, useMemoizedFn } from 'ahooks'

import { HubGridList, HubGridOpt } from '../pluginHub/pluginHubList/funcTemplate'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import styles from './AITool.module.scss'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { useEmptyImage } from '@/hook/useResultEmpty/SearchEmpty'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import {
  OutlineDotsverticalIcon,
  OutlinePencilaltIcon,
  OutlinePlusIcon,
  OutlineRefreshIcon,
  OutlineSearchIcon,
  OutlineStarIcon,
  OutlineImportIcon,
  OutlineExportIcon,
} from '@/assets/icon/outline'
import { YakitRoute } from '@/enums/yakitRoute'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { TableTotalAndSelectNumber } from '@/components/TableTotalAndSelectNumber/TableTotalAndSelectNumber'
import { Divider } from 'antd'
import type { GetAIToolListRequest, GetAIToolListResponse, ToggleAIToolFavoriteRequest } from '../ai-agent/type/aiTool'
import { genDefaultPagination } from '../invoker/schema'
import { grpcDeleteAITool, grpcGetAIToolList, grpcToggleAIToolFavorite } from '../ai-agent/aiToolList/utils'
import type { ToolQueryType } from '../ai-agent/aiToolList/AIToolListType'
import { YakitRadioButtons } from '@/components/yakitUI/YakitRadioButtons/YakitRadioButtons'
import { handleAddAITool, handleModifyAITool, toolMenu, toolTypeOptions } from '../ai-agent/aiToolList/AIToolList'
import { SolidStarIcon } from '@/assets/icon/solid'
import { YakitDropdownMenu } from '@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu'
import { setClipboardText } from '@/utils/clipboard'
import { yakitNotify } from '@/utils/notification'
import type { YakitMenuItemProps } from '@/components/yakitUI/YakitMenu/YakitMenu'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { BatchExportAIforgeRef, ImportAIforgeRef } from '../ai-agent/forgeName/type'
import { BatchExportAIforge, ImportAIforge } from '../ai-agent/forgeName/ForgeName'
import { collectAIToolExportNames } from './batchTools'
import { YakitCheckbox } from '@/components/yakitUI/YakitCheckbox/YakitCheckbox'

const AIToolPage: React.FC<AIToolProps> = React.memo((props) => {
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const [toolQueryType, setToolQueryType] = useState<ToolQueryType>('all')
  const emptyImageTarget = useEmptyImage('search')
  const [response, setResponse] = useState<GetAIToolListResponse>({
    Pagination: genDefaultPagination(20),
    Tools: [],
    Total: 0,
  })
  // 列表无条件下的总数
  const [listTotal, setListTotal] = useState<number>(0)

  // 搜索条件
  const [keyWord, setKeyWord] = useState<string>('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [loading, setLoading] = useState<boolean>(false)
  const [allChecked, setAllChecked] = useState(false)
  const [selectedById, setSelectedById] = useState<Map<number, AIToolPageItemProps['data']>>(new Map())
  const [excludedIds, setExcludedIds] = useState<Set<number>>(new Set())
  const [exportLoading, setExportLoading] = useState(false)
  const queryEpoch = useRef(0)
  const listRequestEpoch = useRef(0)
  const selected = [...selectedById.values()]
  const clearAll = () => {
    setSelectedById(new Map())
    setExcludedIds(new Set())
  }
  const unSelect = (item: AIToolPageItemProps['data']) =>
    setSelectedById((prev) => {
      const next = new Map(prev)
      next.delete(item.ID)
      return next
    })
  const isSelected = (item: AIToolPageItemProps['data']) =>
    allChecked ? !excludedIds.has(item.ID) : selectedById.has(item.ID)
  const resetSelection = () => {
    queryEpoch.current += 1
    setAllChecked(false)
    clearAll()
  }

  // 是否为获取列表第一页的加载状态
  const isInitLoading = useRef<boolean>(false)
  const hasMore = useRef<boolean>(true)

  const toolRef = useRef<HTMLDivElement>(null)
  const batchExportRef = useRef<BatchExportAIforgeRef>(null)
  const importRef = useRef<ImportAIforgeRef>(null)
  const [inViewPort = true] = useInViewport(toolRef)
  useEffect(() => {
    if (inViewPort) {
      fetchData(true)
      fetchInitTotal()
    }
  }, [inViewPort])
  const fetchInitTotal = useMemoizedFn(() => {
    const request: GetAIToolListRequest = {
      Pagination: {
        ...response.Pagination,
        Page: 1,
        Limit: 1,
      },
      Query: '',
      ToolName: '',
      OnlyFavorites: false,
    }
    grpcGetAIToolList(request, true)
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
  // 获取 AI-Tool 列表
  const fetchData = useMemoizedFn(async (isInit?: boolean) => {
    if (loading && !isInit) return
    const requestEpoch = ++listRequestEpoch.current
    if (isInit) {
      clearAll()
      setAllChecked(false)
      hasMore.current = true
      isInitLoading.current = true
    }
    setLoading(true)
    const pageInfo = response.Pagination
    const newQuery: GetAIToolListRequest = {
      Query: appliedQuery,
      ToolName: '',
      Pagination: {
        ...genDefaultPagination(20),
        Page: isInit ? 1 : Number(pageInfo.Page) + 1,
      },
      OnlyFavorites: toolQueryType === 'collect',
    }
    try {
      const res = await grpcGetAIToolList(newQuery)
      if (requestEpoch !== listRequestEpoch.current) return
      if (!res.Tools) res.Tools = []
      const newPage = +res.Pagination.Page
      const length = newPage === 1 ? res.Tools.length : res.Tools.length + response.Tools.length
      hasMore.current = length < +res.Total
      const newRes: GetAIToolListResponse = {
        Tools: newPage === 1 ? res?.Tools : [...response.Tools, ...(res?.Tools || [])],
        Pagination: res?.Pagination || {
          ...genDefaultPagination(20),
        },
        Total: res.Total,
      }
      setResponse(newRes)
    } catch (error) {}
    setTimeout(() => {
      if (requestEpoch !== listRequestEpoch.current) return
      isInitLoading.current = false
      setLoading(false)
    }, 300)
  })
  const onUpdateList = useMemoizedFn(() => {
    fetchData()
  })
  const onNewTool = useMemoizedFn(() => {
    handleAddAITool(YakitRoute.AI_Tool)
  })
  const listLength = useCreation(() => {
    return Number(response.Total) || 0
  }, [response.Total])

  const onCheck = useMemoizedFn((value: boolean) => {
    setAllChecked(value)
    clearAll()
  })
  const optCheck = useMemoizedFn((data: AIToolPageItemProps['data']) => {
    if (allChecked) {
      setExcludedIds((prev) => {
        const next = new Set(prev)
        next.has(data.ID) ? next.delete(data.ID) : next.add(data.ID)
        return next
      })
    } else
      setSelectedById((prev) => {
        const next = new Map(prev)
        next.has(data.ID) ? next.delete(data.ID) : next.set(data.ID, data)
        return next
      })
  })
  const selectionCount = allChecked ? Math.max(0, listLength - excludedIds.size) : selected.length
  const onBatchExport = useMemoizedFn(async () => {
    if (!selectionCount || exportLoading) return
    const epoch = queryEpoch.current
    setExportLoading(true)
    try {
      const names = allChecked
        ? await collectAIToolExportNames(
            grpcGetAIToolList,
            { Query: appliedQuery, OnlyFavorites: toolQueryType === 'collect' },
            excludedIds,
          )
        : selected.map((item) => item.Name)
      if (epoch !== queryEpoch.current || !names.length) return
      batchExportRef.current?.open({ ToolNames: [...new Set(names)] })
    } catch {
      yakitNotify('error', t('AIToolBatch.exportFailed'))
    } finally {
      setExportLoading(false)
    }
  })
  const onExport = useMemoizedFn((data: AIToolPageItemProps['data']) => {
    batchExportRef.current?.open({ ToolNames: [data.Name], OutputName: data.VerboseName || data.Name })
  })
  const onImportSuccess = useMemoizedFn(() => {
    resetSelection()
    fetchData(true)
    fetchInitTotal()
  })
  const onToolQueryTypeChange = useMemoizedFn((e) => {
    resetSelection()
    setToolQueryType(e.target.value as ToolQueryType)
    setKeyWord('')
    setAppliedQuery('')
    const listEl = toolRef.current?.querySelector('[class*="hub-grid-list"]')
    if (listEl) listEl.scrollTop = 0
    setTimeout(() => {
      fetchData(true)
    }, 200)
  })
  const onFavorite = useMemoizedFn((item) => {
    const params: ToggleAIToolFavoriteRequest = {
      ID: item.ID,
    }
    return grpcToggleAIToolFavorite(params).then(() => {
      setResponse((preV) => ({
        ...preV,
        Tools: preV.Tools.map((ele) => {
          if (ele.ID === item.ID) {
            return { ...ele, IsFavorite: !item.IsFavorite }
          }
          return ele
        }),
      }))
    })
  })
  const onRemove = useMemoizedFn((data) => {
    return grpcDeleteAITool({ IDs: [data.ID] }).then(() => {
      setResponse((old) => {
        return {
          ...old,
          Total: Math.max(0, old.Total - 1),
          Tools: old.Tools.filter((item) => item.ID !== data.ID),
        }
      })
      setListTotal((v) => Math.max(0, v - 1))
      setExcludedIds((prev) => {
        const next = new Set(prev)
        next.delete(data.ID)
        return next
      })
      unSelect(data)
      yakitNotify('success', '删除成功')
    })
  })
  return (
    <div className={styles['ai-tool']} ref={toolRef}>
      <div className={styles['hub-list-header']}>
        <div className={styles['title']}>工具库</div>
        <div className={styles['extra']}>
          <YakitInput.Search
            prefix={<OutlineSearchIcon className={styles['search-icon']} />}
            allowClear
            placeholder="请输入关键词搜索"
            value={keyWord}
            onChange={(e) => setKeyWord(e.target.value)}
            size="large"
            wrapperClassName={styles['search-input']}
            onSearch={(value) => {
              setAppliedQuery(value)
              resetSelection()
              handleRefreshList()
            }}
          />
          <Divider type="vertical" className={styles['diver-style']} />
          <YakitButton
            disabled={!selectionCount || exportLoading}
            loading={exportLoading}
            type="outline2"
            size="large"
            icon={<OutlineExportIcon />}
            onClick={onBatchExport}
          >
            {t('YakitButton.batchExport')}
          </YakitButton>
          <YakitButton
            type="outline2"
            size="large"
            icon={<OutlineImportIcon />}
            onClick={() => importRef.current?.open()}
          >
            {t('YakitButton.import')}
          </YakitButton>
          <YakitButton size="large" icon={<OutlinePlusIcon />} onClick={onNewTool}>
            新建工具
          </YakitButton>
        </div>
      </div>

      <div className={styles['ai-tool-content']}>
        <div className={styles['hub-list-subTitle']}>
          <YakitRadioButtons
            buttonStyle="solid"
            value={toolQueryType}
            options={toolTypeOptions(t)}
            onChange={onToolQueryTypeChange}
          />
          <div className={styles['select-all']}>
            <YakitCheckbox
              checked={allChecked && !excludedIds.size}
              onChange={(e) => onCheck(e.target.checked)}
              indeterminate={selectionCount > 0 && (!allChecked || excludedIds.size > 0)}
            />
            <span>{t('YakitCheckbox.selectAll')}</span>
          </div>
          <TableTotalAndSelectNumber total={listLength} selectNum={selectionCount} />
        </div>
        <div className={styles['hub-list-wrapper']}>
          <YakitSpin spinning={loading && isInitLoading.current}>
            {listLength > 0 ? (
              <HubGridList
                data={response.Tools || []}
                keyName="ID"
                loading={loading}
                hasMore={hasMore.current}
                updateList={onUpdateList}
                gridNode={(info) => {
                  const { index, data } = info
                  return (
                    <AIToolPageItem
                      key={data.ID}
                      index={index}
                      data={data}
                      checked={isSelected(data)}
                      onCheck={optCheck}
                      onExport={onExport}
                      onFavorite={onFavorite}
                      onRemove={onRemove}
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
                <YakitEmpty title="暂无数据" description="可新建工具,创建属于自己的工具" />
                <div className={styles['refresh-buttons']}>
                  <YakitButton type="outline1" icon={<OutlinePlusIcon />} onClick={onNewTool}>
                    新建工具
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
      <BatchExportAIforge ref={batchExportRef} isTool />
      <ImportAIforge ref={importRef} isTool onSuccess={onImportSuccess} />
    </div>
  )
})

export default AIToolPage

const AIToolPageItem: React.FC<AIToolPageItemProps> = React.memo((props) => {
  const { index, data, checked, onCheck, onExport, onFavorite, onRemove } = props
  const { t, i18nRefresh } = useI18nNamespaces(['yakitUi'])
  const [favoriteLoading, setFavoriteLoading] = useState<boolean>(false)
  const [visible, setVisible] = useState<boolean>(false)

  const handleFavorite = useMemoizedFn((e) => {
    e.stopPropagation()
    setFavoriteLoading(true)
    onFavorite(data).finally(() => {
      setTimeout(() => {
        setFavoriteLoading(false)
      }, 200)
    })
  })
  const onEdit = useMemoizedFn((e) => {
    e.stopPropagation()
    handleModifyAITool(data, YakitRoute.AI_Tool)
  })
  const menuSelect = useMemoizedFn((key: string) => {
    switch (key) {
      case 'copy':
        setClipboardText(data.Name)
        break
      case 'export':
        onExport(data)
        break
      case 'delete':
        onRemove(data)
        break
      default:
        break
    }
  })

  const isBuiltin = useCreation(() => {
    return !!data?.IsBuiltin
  }, [data?.IsBuiltin])

  const toolMenuData = useCreation(() => {
    const [copyItem, deleteItem] = toolMenu(t)
    const exportItem: YakitMenuItemProps = {
      key: 'export',
      label: t('YakitButton.export'),
      itemIcon: <OutlineExportIcon />,
    }
    return isBuiltin ? [copyItem, exportItem] : [copyItem, exportItem, deleteItem]
  }, [isBuiltin, i18nRefresh])

  return (
    <HubGridOpt
      order={index}
      info={data}
      checked={checked}
      onCheck={onCheck}
      title={data.VerboseName || data.Name}
      type={''}
      tags={data?.Keywords?.join(',')}
      help={data.Description || ''}
      img={''}
      user={isBuiltin ? 'yaklang.io' : ''}
      time={data?.UpdatedAt || 0}
      isCorePlugin={isBuiltin}
      official={isBuiltin}
      extraFooter={() => (
        <div className={styles['extra-footer']} onClick={(event) => event.stopPropagation()}>
          <YakitButton
            type="text2"
            loading={favoriteLoading}
            icon={
              data.IsFavorite ? (
                <SolidStarIcon className={styles['star-icon-active']} />
              ) : (
                <OutlineStarIcon className={styles['star-icon']} />
              )
            }
            onClick={handleFavorite}
          />
          <div className={styles['diver-style']} />
          <YakitButton type="text2" icon={<OutlinePencilaltIcon />} onClick={onEdit} />
          <div className={styles['diver-style']} />
          <YakitDropdownMenu
            menu={{
              data: toolMenuData,
              onClick: ({ key }) => menuSelect(key),
            }}
            dropdown={{
              trigger: ['click', 'contextMenu'],
              placement: 'bottomLeft',
              visible: visible,
              onVisibleChange: setVisible,
            }}
          >
            <YakitButton isActive={visible} type="text2" size="small" icon={<OutlineDotsverticalIcon />} />
          </YakitDropdownMenu>
        </div>
      )}
    />
  )
})
