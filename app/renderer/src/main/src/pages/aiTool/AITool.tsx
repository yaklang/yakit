import React, { useEffect, useRef, useState } from 'react'
import type { AIToolPageItemProps, AIToolProps } from './AIToolType'
import { useCreation, useDebounceFn, useInViewport, useMemoizedFn, useSelections } from 'ahooks'

import { HubGridList, HubGridOpt } from '../pluginHub/pluginHubList/funcTemplate'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import styles from './AITool.module.scss'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { useEmptyImage } from '@/hook/useResultEmpty/SearchEmpty'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import {
  DotsVerticalOutlined,
  PencilAltOutlined,
  PlusOutlined,
  RefreshOutlined,
  SearchOutlined,
  StarOutlined,
  ImportOutlined,
  ExportOutlined,
} from '@yakit-libs/yakit-ui-icons/outline'
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
import { StarSolid } from '@yakit-libs/yakit-ui-icons/solid'
import { YakitDropdownMenu } from '@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu'
import { setClipboardText } from '@/utils/clipboard'
import { yakitNotify } from '@/utils/notification'
import type { YakitMenuItemProps } from '@/components/yakitUI/YakitMenu/YakitMenu'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { BatchExportAIforgeRef, ImportAIforgeRef } from '../ai-agent/forgeName/type'
import { BatchExportAIforge, ImportAIforge } from '../ai-agent/forgeName/ForgeName'
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
  const [loading, setLoading] = useState<boolean>(false)
  const [allChecked, setAllChecked] = useState<boolean>(false)

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
    if (loading) return
    if (isInit) {
      clearAll()
      setAllChecked(false)
      hasMore.current = true
      isInitLoading.current = true
    }
    setLoading(true)
    const pageInfo = response.Pagination
    const newQuery: GetAIToolListRequest = {
      Query: keyWord,
      ToolName: '',
      Pagination: {
        ...genDefaultPagination(20),
        Page: isInit ? 1 : ++pageInfo.Page,
      },
      OnlyFavorites: toolQueryType === 'collect',
    }
    try {
      const res = await grpcGetAIToolList(newQuery)
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

  const { selected, isSelected, toggle, unSelect, clearAll, setSelected } = useSelections(response.Tools, {
    itemKey: 'ID',
  })
  const onCheck = useMemoizedFn((value: boolean) => {
    setAllChecked(value)
    clearAll()
  })
  const optCheck = useMemoizedFn((data: AIToolPageItemProps['data']) => {
    if (allChecked) {
      setAllChecked(false)
      setSelected((response.Tools || []).filter((item) => item.ID !== data.ID))
      return
    }
    toggle(data)
  })
  const onBatchExport = useMemoizedFn(() => {
    if (!allChecked) {
      batchExportRef.current?.open({ ToolNames: selected.map((item) => item.Name) })
      return
    }
    const filter = { Keyword: keyWord, OnlyFavorites: toolQueryType === 'collect' }
    grpcGetAIToolList({
      Query: keyWord,
      ToolName: '',
      OnlyFavorites: filter.OnlyFavorites,
      Pagination: genDefaultPagination(listLength || 1, 1),
    }).then((res) => {
      batchExportRef.current?.open({
        Filter: filter,
        ToolNames: (res.Tools || []).map((item) => item.Name),
      })
    })
  })
  const onExport = useMemoizedFn((data: AIToolPageItemProps['data']) => {
    batchExportRef.current?.open({ ToolNames: [data.Name], OutputName: data.VerboseName || data.Name })
  })
  const onImportSuccess = useMemoizedFn(() => {
    fetchData(true)
    fetchInitTotal()
  })
  const onToolQueryTypeChange = useMemoizedFn((e) => {
    setToolQueryType(e.target.value as ToolQueryType)
    setKeyWord('')
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
            prefix={<SearchOutlined className={styles['search-icon']} color="currentColor" />}
            allowClear
            placeholder="请输入关键词搜索"
            value={keyWord}
            onChange={(e) => setKeyWord(e.target.value)}
            size="large"
            wrapperClassName={styles['search-input']}
            onSearch={handleRefreshList}
          />
          <Divider type="vertical" className={styles['diver-style']} />
          <YakitButton
            disabled={!allChecked && !selected.length}
            type="outline2"
            size="large"
            icon={<ExportOutlined />}
            onClick={onBatchExport}
          >
            {t('YakitButton.batchExport')}
          </YakitButton>
          <YakitButton
            type="outline2"
            size="large"
            icon={<ImportOutlined color="currentColor" />}
            onClick={() => importRef.current?.open()}
          >
            {t('YakitButton.import')}
          </YakitButton>
          <YakitButton size="large" icon={<PlusOutlined color="currentColor" />} onClick={onNewTool}>
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
              checked={allChecked}
              onChange={(e) => onCheck(e.target.checked)}
              indeterminate={!allChecked && selected.length > 0}
            />
            <span>{t('YakitCheckbox.selectAll')}</span>
          </div>
          <TableTotalAndSelectNumber total={listLength} selectNum={allChecked ? listLength : selected.length} />
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
                      checked={allChecked || isSelected(data)}
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
                styles={{ image: { margin: '0 auto 24px', width: 274, height: 180 } }}
                title="搜索结果“空”"
                className={styles['hub-list-empty']}
              />
            ) : (
              <div className={styles['hub-list-empty']}>
                <YakitEmpty title="暂无数据" description="可新建工具,创建属于自己的工具" />
                <div className={styles['refresh-buttons']}>
                  <YakitButton type="outline1" icon={<PlusOutlined color="currentColor" />} onClick={onNewTool}>
                    新建工具
                  </YakitButton>
                  <YakitButton
                    type="outline1"
                    icon={<RefreshOutlined color="currentColor" />}
                    onClick={handleRefreshList}
                  >
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
      itemIcon: <ExportOutlined color="currentColor" />,
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
        <div className={styles['extra-footer']}>
          <YakitButton
            type="text2"
            loading={favoriteLoading}
            icon={
              data.IsFavorite ? (
                <StarSolid className={styles['star-icon-active']} color="currentColor" />
              ) : (
                <StarOutlined className={styles['star-icon']} color="currentColor" />
              )
            }
            onClick={handleFavorite}
          />
          <div className={styles['diver-style']} />
          <YakitButton type="text2" icon={<PencilAltOutlined color="currentColor" />} onClick={onEdit} />
          <div className={styles['diver-style']} />
          <YakitDropdownMenu
            menu={{
              data: toolMenuData,
              onClick: ({ key }) => menuSelect(key),
            }}
            dropdown={{
              trigger: ['click', 'contextMenu'],
              placement: 'bottomLeft',
              open: visible,
              onOpenChange: setVisible,
            }}
          >
            <YakitButton
              isActive={visible}
              type="text2"
              size="small"
              icon={<DotsVerticalOutlined color="currentColor" />}
            />
          </YakitDropdownMenu>
        </div>
      )}
    />
  )
})
