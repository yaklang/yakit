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
  OutlineAcademiccapIcon,
  OutlineBellIcon,
  OutlineCogIcon,
  OutlineDocumentsearchIcon,
  OutlineFingerprintIcon,
  OutlineGlobealtIcon,
  OutlineImportIcon,
  OutlinePencilaltIcon,
  OutlinePlusIcon,
  OutlinePuzzleIcon,
  OutlineRefreshIcon,
  OutlineSearchcircleIcon,
  OutlineSearchIcon,
  OutlineShieldcheckIcon,
  OutlineTrashIcon,
} from '@/assets/icon/outline'
import { YakitRoute } from '@/enums/yakitRoute'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { TableTotalAndSelectNumber } from '@/components/TableTotalAndSelectNumber/TableTotalAndSelectNumber'
import { Divider, Tooltip } from 'antd'
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
import classNames from 'classnames'
import { isMemfit } from '@/utils/envfile'
import { DIGITAL_EMPLOYEES } from '../digitalEmployee/config'
import { formatDate } from '@/utils/timeUtil'

const MEMFIT_AGENT_CATEGORIES = ['全部', ...DIGITAL_EMPLOYEES.map((employee) => employee.name)]

const getAgentTypeLabel = (type: AIForge['ForgeType']) => {
  if (type === 'skillmd') return '技能智能体'
  if (type === 'config') return '配置智能体'
  return '原生智能体'
}

const getAgentIcon = (data: AIForge, index: number) => {
  const content = `${data.ForgeVerboseName || ''}${data.ForgeName || ''}${data.Description || ''}${(
    data.Tag || []
  ).join('')}`
  if (/渗透|漏洞|扫描/.test(content)) return <OutlineSearchcircleIcon />
  if (/告警|应急|响应/.test(content)) return <OutlineBellIcon />
  if (/情报|威胁|狩猎/.test(content)) return <OutlineGlobealtIcon />
  if (/样本|文件|恶意/.test(content)) return <OutlineDocumentsearchIcon />
  if (/教学|培训|知识/.test(content)) return <OutlineAcademiccapIcon />
  if (/身份|指纹|资产/.test(content)) return <OutlineFingerprintIcon />
  if (/策略|配置|运营/.test(content)) return <OutlineCogIcon />
  return index % 2 === 0 ? <OutlineShieldcheckIcon /> : <OutlinePuzzleIcon />
}

const AIForgePage: React.FC<AIForgeProps> = React.memo((props) => {
  const isMemfitMode = isMemfit()
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
  const [activeCategory, setActiveCategory] = useState<string>('全部')
  const [loading, setLoading] = useState<boolean>(false)
  const requestLoadingRef = useRef<boolean>(false)

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
  }, [inViewPort, activeCategory])
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
    if (requestLoadingRef.current) return
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
    const keyword =
      search.trim() || (isMemfitMode && activeCategory !== MEMFIT_AGENT_CATEGORIES[0] ? activeCategory : '')
    if (keyword) request.Filter = { Keyword: keyword }

    requestLoadingRef.current = true
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
        requestLoadingRef.current = false
        setTimeout(() => {
          isInitLoading.current = false
          setLoading(false)
        }, 300)
      })
  })
  const onUpdateList = useMemoizedFn(() => {
    fetchData()
  })
  const handleMarketplaceScroll = useMemoizedFn((event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = event.currentTarget
    if (!loading && hasMore.current && scrollHeight - scrollTop - clientHeight <= 280) {
      fetchData()
    }
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
    <div className={classNames(styles['ai-forge'], { [styles['ai-forge-memfit']]: isMemfitMode })} ref={forgeRef}>
      {isMemfitMode ? (
        <>
          <section className={styles['marketplace-hero']}>
            <div className={styles['hero-glow']} />
            <div className={styles['hero-copy']}>
              <span className={styles['hero-eyebrow']}>AI SENPIKE · AGENT MARKETPLACE</span>
              <h1>智能体广场</h1>
              <p>提供各类专业安全运营智能体，助力企业提升安全运营效率</p>
              <span className={styles['hero-note']}>覆盖威胁分析、渗透测试、安全运营与应急响应等专业场景</span>
            </div>
            <div className={styles['hero-actions']}>
              <YakitButton
                type="outline2"
                size="large"
                icon={<OutlineImportIcon />}
                onClick={onImport}
                className={styles['hero-secondary-button']}
              >
                导入智能体
              </YakitButton>
              <YakitButton
                disabled={!selectedLength}
                type="outline2"
                size="large"
                icon={<OutlineExportIcon />}
                onClick={onBatchExport}
                className={styles['hero-secondary-button']}
              >
                批量导出
              </YakitButton>
              <YakitButton
                size="large"
                icon={<OutlinePlusIcon />}
                onClick={onNewForge}
                className={styles['create-agent-button']}
              >
                创建智能体
              </YakitButton>
            </div>
            <img className={styles['hero-character']} src={DIGITAL_EMPLOYEES[5].portrait} alt="" aria-hidden="true" />
          </section>

          <div className={styles['marketplace-toolbar']}>
            <div className={styles['category-list']} role="tablist" aria-label="智能体分类">
              {MEMFIT_AGENT_CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  role="tab"
                  aria-selected={activeCategory === category}
                  className={classNames(styles['category-item'], {
                    [styles['category-item-active']]: activeCategory === category,
                  })}
                  onClick={() => {
                    setSearch('')
                    setActiveCategory(category)
                  }}
                >
                  {category}
                </button>
              ))}
            </div>
            <div className={styles['marketplace-filter-actions']}>
              <label className={styles['select-all-marketplace']}>
                <YakitCheckbox checked={allSelected} onChange={() => toggleAll()} indeterminate={partiallySelected} />
                <span>{selectedLength ? `已选 ${selectedLength}` : '全选'}</span>
              </label>
              <YakitInput.Search
                prefix={<OutlineSearchIcon className={styles['search-icon']} />}
                allowClear
                placeholder="搜索智能体或技能"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  if (activeCategory !== MEMFIT_AGENT_CATEGORIES[0]) {
                    setActiveCategory(MEMFIT_AGENT_CATEGORIES[0])
                  }
                }}
                size="large"
                wrapperClassName={styles['marketplace-search']}
                onSearch={handleRefreshList}
              />
            </div>
          </div>

          <div className={styles['marketplace-list']} onScroll={handleMarketplaceScroll}>
            <YakitSpin spinning={loading && isInitLoading.current}>
              {listLength > 0 ? (
                <>
                  <div className={styles['agent-grid']}>
                    {(response.Data || []).map((data, index) => (
                      <AIForgeMarketplaceItem
                        key={data.Id || index}
                        index={index}
                        data={data}
                        checked={isSelected(data)}
                        onCheck={optCheck}
                        onExport={onExport}
                        onRemove={handleDeleteAIForge}
                      />
                    ))}
                  </div>
                  {loading && !isInitLoading.current && (
                    <div className={styles['marketplace-loading']}>正在加载更多智能体...</div>
                  )}
                  {!loading && !hasMore.current && response.Data.length > 0 && (
                    <div className={styles['marketplace-end']}>已展示全部 {listLength} 个智能体</div>
                  )}
                </>
              ) : listTotal > 0 ? (
                <YakitEmpty
                  image={emptyImageTarget}
                  imageStyle={{ margin: '0 auto 20px', width: 220, height: 144 }}
                  title="没有找到匹配的智能体"
                  className={styles['marketplace-empty']}
                />
              ) : (
                <div className={styles['marketplace-empty']}>
                  <YakitEmpty title="暂无智能体" description="可创建智能体，沉淀属于自己的专业能力" />
                  <div className={styles['refresh-buttons']}>
                    <YakitButton icon={<OutlinePlusIcon />} onClick={onNewForge}>
                      创建智能体
                    </YakitButton>
                    <YakitButton type="outline1" icon={<OutlineRefreshIcon />} onClick={handleRefreshList}>
                      刷新
                    </YakitButton>
                  </div>
                </div>
              )}
            </YakitSpin>
          </div>
        </>
      ) : (
        <>
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
        </>
      )}
      <BatchExportAIforge ref={batchExportRef} />
      <ImportAIforge ref={importRef} onSuccess={handleEmiterTriggerRefresh} />
    </div>
  )
})

export default AIForgePage

const AIForgeMarketplaceItem: React.FC<AIForgePageItemProps> = React.memo((props) => {
  const { index, data, checked, onCheck, onExport, onRemove } = props
  const [loading, setLoading] = useState<boolean>(false)
  const isBuiltin = !!data.IsBuiltin
  const displayName = data.ForgeVerboseName || data.ForgeName || '未命名智能体'
  const updateTime = Number(data.UpdatedAt || data.CreatedAt || 0)
  const capabilityCount = (data.Tag || []).filter(Boolean).length + (data.ToolNames || []).filter(Boolean).length

  const handleDelete = useMemoizedFn(() => {
    setLoading(true)
    onRemove(data).finally(() => {
      setTimeout(() => setLoading(false), 200)
    })
  })

  return (
    <article
      className={classNames(styles['agent-card'], styles[`agent-card-tone-${index % 6}`], {
        [styles['agent-card-selected']]: checked,
      })}
    >
      <div className={styles['agent-icon']}>{getAgentIcon(data, index)}</div>
      <div className={styles['agent-card-content']}>
        <div className={styles['agent-card-header']}>
          <div className={styles['agent-title-line']}>
            <h2 title={displayName}>{displayName}</h2>
            {isBuiltin && <span className={styles['recommend-tag']}>推荐</span>}
          </div>
          <span className={styles['agent-date']}>
            {isBuiltin ? '内测' : '更新'} {updateTime ? formatDate(updateTime) : '暂无日期'}
          </span>
        </div>
        <p className={styles['agent-description']}>
          {data.Description || '为安全运营场景提供专业智能分析与执行能力。'}
        </p>
        <div className={styles['agent-card-footer']}>
          <div className={styles['agent-facts']}>
            <span className={styles['agent-type']}>{getAgentTypeLabel(data.ForgeType)}</span>
            {capabilityCount > 0 && <span>{capabilityCount} 项关联能力</span>}
            {!!data.Author && <span>{data.Author}</span>}
          </div>
          <div className={styles['agent-card-actions']}>
            <label className={styles['agent-select']} onClick={(event) => event.stopPropagation()}>
              <YakitCheckbox checked={checked} onChange={() => onCheck(data)} />
              <span>选择</span>
            </label>
            <Tooltip title="导出智能体">
              <YakitButton
                type="text2"
                size="small"
                aria-label="导出智能体"
                icon={<OutlineExportIcon />}
                onClick={(event) => {
                  event.stopPropagation()
                  onExport(data)
                }}
              />
            </Tooltip>
            <Tooltip title="编辑智能体">
              <YakitButton
                type="text2"
                size="small"
                aria-label="编辑智能体"
                icon={<OutlinePencilaltIcon />}
                onClick={(event) => {
                  event.stopPropagation()
                  handleModifyAIForge(data, YakitRoute.AI_Forge)
                }}
              />
            </Tooltip>
            {!isBuiltin && (
              <Tooltip title="删除智能体">
                <YakitPopconfirm
                  title="是否删除该智能体?"
                  onConfirm={(event) => {
                    event?.stopPropagation()
                    handleDelete()
                  }}
                  onCancel={(event) => event?.stopPropagation()}
                >
                  <YakitButton
                    loading={loading}
                    type="text2"
                    size="small"
                    aria-label="删除智能体"
                    icon={<OutlineTrashIcon className={styles['del-icon']} />}
                    onClick={(event) => event.stopPropagation()}
                  />
                </YakitPopconfirm>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    </article>
  )
})

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
