import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type {
  AIChatMentionListRefProps,
  AIChatMentionProps,
  AIMentionSelectItemProps,
  BrowserListOfMentionProps,
  FileSystemTreeOfMentionProps,
  FocusModeOfMentionProps,
  ForgeNameListOfMentionProps,
  KnowledgeBaseListOfMentionProps,
  ToolListOfMentionProps,
} from './type'
import styles from './AIChatMention.module.scss'
import {
  useCreation,
  useDebounceEffect,
  useDebounceFn,
  useInViewport,
  useKeyPress,
  useMemoizedFn,
  useSafeState,
} from 'ahooks'
import { AIMentionTabsEnum, AIForgeListDefaultPagination, AIMentionTabs } from '../../defaultConstant'
import { RollingLoadList, type RollingLoadListRef } from '@/components/RollingLoadList/RollingLoadList'
import type {
  AIFocus,
  AIForge,
  QueryAIFocusResponse,
  QueryAIForgeRequest,
  QueryAIForgeResponse,
} from '../../type/forge'
import { grpcQueryAIFocus, grpcQueryAIForge } from '../../grpc'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import type { AITool, GetAIToolListRequest, GetAIToolListResponse } from '../../type/aiTool'
import { genDefaultPagination } from '@/pages/invoker/schema'
import { grpcGetAIToolList } from '../../aiToolList/utils'
import { failed } from '@/utils/notification'
import useSwitchSelectByKeyboard from './hooks/useSwitchSelectByKeyboard'
import classNames from 'classnames'
import useGetSetState from '@/pages/pluginHub/hooks/useGetSetState'
import { useCustomFolder } from '../aiFileSystemList/store/useCustomFolder'
import FileTreeSystemList from '../aiFileSystemList/FileTreeSystemList/FileTreeSystemList'
import type { FileNodeProps } from '@/pages/yakRunner/FileTree/FileTreeType'
import { type KnowledgeBaseItem, useKnowledgeBase } from '@/pages/KnowledgeBase/hooks/useKnowledgeBase'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import {
  browserInstanceMentionName,
  formatLastSeen,
  refreshBrowserInstances,
  selectBrowserInstance,
  useBrowserInstances,
  type AIBrowserInstance,
} from '../../browserInstances/browserInstanceStore'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { AIChatMentionTabs } from './aiChatMentionTabs/AIChatMentionTabs'
import { AllListOfMention } from './allListOfMention/AllListOfMention'
import { buildMentionKnowledgeList } from './allListOfMention/allListOfMentionUtils'
import { BrowserClientIcon } from '../../browserInstances/BrowserClientIcon'

const defaultRef: AIChatMentionListRefProps = {
  onRefresh: () => {},
}
export const AIChatMention: React.FC<AIChatMentionProps> = React.memo((props) => {
  const {
    onSelect,
    defaultActiveTab,
    filterMode,
    keepEditorFocus,
    filterKeyword,
    keyboardTarget,
    visible = true,
  } = props
  const [activeKey, setActiveKey, getActiveKey] = useGetSetState<AIMentionTabsEnum>(
    defaultActiveTab || AIMentionTabsEnum.All,
  )
  const [keyWord, setKeyWord] = useState<string>('')
  const [tabCounts, setTabCounts] = useState<Partial<Record<AIMentionTabsEnum, number>>>({})

  const forgeRef = useRef<AIChatMentionListRefProps>(defaultRef)
  const toolRef = useRef<AIChatMentionListRefProps>(defaultRef)
  const knowledgeBaseRef = useRef<AIChatMentionListRefProps>(defaultRef)
  const focusModeRef = useRef<AIChatMentionListRefProps>(defaultRef)
  const browserRef = useRef<AIChatMentionListRefProps>(defaultRef)
  const allRef = useRef<AIChatMentionListRefProps>(defaultRef)

  const mentionRef = useRef<HTMLDivElement>(null)
  const [inViewport = true] = useInViewport(mentionRef)

  useEffect(() => {
    if (filterKeyword !== undefined) setKeyWord(filterKeyword)
  }, [filterKeyword])

  useEffect(() => {
    // 保留编辑器焦点时不抢焦
    if (inViewport && !keepEditorFocus) mentionFocus()
  }, [inViewport, keepEditorFocus])
  useEffect(() => {
    if (keepEditorFocus) return
    if (activeKey === AIMentionTabsEnum.File_System) {
      mentionFocus()
    }
  }, [activeKey, keepEditorFocus])
  useDebounceEffect(
    () => {
      onSearch()
    },
    [keyWord],
    { wait: 300 },
  )

  const getKeyboardTarget = useMemoizedFn(() => {
    return keyboardTarget?.() || mentionRef.current
  })

  useKeyPress(
    visible ? 'leftarrow' : () => false,
    (e) => {
      e.stopPropagation()
      e.preventDefault()
      onLeftArrow()
    },
    {
      target: getKeyboardTarget,
      exactMatch: true,
      useCapture: true,
    },
  )
  useKeyPress(
    visible ? 'rightarrow' : () => false,
    (e) => {
      e.stopPropagation()
      e.preventDefault()
      onRightArrow()
    },
    {
      target: getKeyboardTarget,
      exactMatch: true,
      useCapture: true,
    },
  )
  const onLeftArrow = useDebounceFn(
    () => {
      if (!inViewport) return
      let newValue = getActiveKey()
      const index = getActiveIndex()
      if (index >= 0 && index < mentionTabs.length) {
        newValue = (mentionTabs[index - 1]?.value as AIMentionTabsEnum) || getActiveKey()
      }
      setActiveKey(newValue)
    },
    { wait: 100, leading: true },
  ).run

  const onRightArrow = useDebounceFn(
    () => {
      if (!inViewport) return
      let newValue = getActiveKey()
      const index = getActiveIndex()
      if (index >= 0 && index < mentionTabs.length) {
        newValue = (mentionTabs[index + 1]?.value as AIMentionTabsEnum) || getActiveKey()
      }
      setActiveKey(newValue)
    },
    { wait: 100, leading: true },
  ).run
  const getActiveIndex = useMemoizedFn(() => {
    return mentionTabs.findIndex((ele) => ele.value === getActiveKey())
  })
  const onActiveKey = useMemoizedFn((k) => {
    setActiveKey(k as AIMentionTabsEnum)
  })
  const onSelectForge = useMemoizedFn((forgeItem: AIForge) => {
    onSelect('forge', {
      id: `${forgeItem.Id}`,
      name: forgeItem.ForgeVerboseName || forgeItem.ForgeName,
    })
  })
  const onSelectTool = useMemoizedFn((toolItem: AITool) => {
    onSelect('tool', {
      id: `${toolItem.ID}`,
      name: toolItem.VerboseName || toolItem.Name,
    })
  })
  const onSelectKnowledgeBase = useMemoizedFn((knowledgeBaseItem: KnowledgeBaseItem) => {
    onSelect('knowledgeBase', {
      id: `${knowledgeBaseItem.ID}`,
      name: knowledgeBaseItem.KnowledgeBaseName,
    })
  })
  const onSelectFile = useMemoizedFn((path: string, isFolder: boolean) => {
    onSelect(isFolder ? 'folder' : 'file', {
      id: path,
      name: path,
    })
  })
  const onSelectFocusMode = useMemoizedFn((focusMode: AIFocus) => {
    onSelect('focusMode', {
      id: `${focusMode.Name}`,
      name: focusMode.Name || '',
    })
  })
  const onSelectBrowser = useMemoizedFn((instance: AIBrowserInstance) => {
    selectBrowserInstance(instance.id)
    onSelect('browser', {
      id: instance.id,
      name: browserInstanceMentionName(instance),
    })
  })
  const onSetTabCount = useMemoizedFn((key: AIMentionTabsEnum, count: number) => {
    setTabCounts((prev) => (prev[key] === count ? prev : { ...prev, [key]: count }))
  })

  const renderTabContent = useMemoizedFn((key: AIMentionTabsEnum) => {
    switch (key) {
      case AIMentionTabsEnum.Forge_Name:
        return (
          <ForgeNameListOfMention
            ref={forgeRef}
            keyWord={keyWord}
            onSelect={onSelectForge}
            getContainer={getContainer}
            keyboardEnabled={visible}
            onTotalChange={(n) => onSetTabCount(AIMentionTabsEnum.Forge_Name, n)}
          />
        )
      case AIMentionTabsEnum.Tool:
        return (
          <ToolListOfMention
            ref={toolRef}
            keyWord={keyWord}
            onSelect={onSelectTool}
            getContainer={getContainer}
            keyboardEnabled={visible}
            onTotalChange={(n) => onSetTabCount(AIMentionTabsEnum.Tool, n)}
          />
        )
      case AIMentionTabsEnum.KnowledgeBase:
        return (
          <KnowledgeBaseListOfMention
            ref={knowledgeBaseRef}
            keyWord={keyWord}
            onSelect={onSelectKnowledgeBase}
            getContainer={getContainer}
            keyboardEnabled={visible}
            onTotalChange={(n) => onSetTabCount(AIMentionTabsEnum.KnowledgeBase, n)}
          />
        )
      case AIMentionTabsEnum.File_System:
        return <FileSystemTreeOfMention onSelect={onSelectFile} />
      case AIMentionTabsEnum.FocusMode:
        return (
          <FocusModeOfMention
            ref={focusModeRef}
            keyWord={keyWord}
            onSelect={onSelectFocusMode}
            getContainer={getContainer}
            keyboardEnabled={visible}
            onTotalChange={(n) => onSetTabCount(AIMentionTabsEnum.FocusMode, n)}
          />
        )
      case AIMentionTabsEnum.Browser:
        return (
          <BrowserListOfMention
            ref={browserRef}
            keyWord={keyWord}
            onSelect={onSelectBrowser}
            getContainer={getContainer}
            keyboardEnabled={visible}
            onTotalChange={(n) => onSetTabCount(AIMentionTabsEnum.Browser, n)}
          />
        )
      default:
        return null
    }
  })
  const onSearch = useMemoizedFn(() => {
    if (activeKey === AIMentionTabsEnum.All) {
      allRef.current.onRefresh()
      return
    }
    switch (activeKey) {
      case AIMentionTabsEnum.Forge_Name:
        forgeRef.current.onRefresh()
        break
      case AIMentionTabsEnum.Tool:
        toolRef.current.onRefresh()
        break
      case AIMentionTabsEnum.KnowledgeBase:
        knowledgeBaseRef.current.onRefresh()
        break
      case AIMentionTabsEnum.FocusMode:
        focusModeRef.current.onRefresh()
        break
      case AIMentionTabsEnum.Browser:
        browserRef.current.onRefresh()
        break
      default:
        break
    }
  })
  const getContainer = useMemoizedFn(() => {
    return keyboardTarget?.() || mentionRef.current
  })

  const mentionFocus = useMemoizedFn(() => {
    mentionRef.current?.focus()
  })

  // 用户文件夹（仅用于角标数量；文件系统 Tab 始终展示）
  const customFolder = useCustomFolder()
  useEffect(() => {
    onSetTabCount(AIMentionTabsEnum.File_System, customFolder?.length || 0)
  }, [customFolder?.length])
  const mentionTabs = useCreation(() => {
    let tabs = AIMentionTabs

    // 处理 filterMode（保留 All）
    if (filterMode?.length) {
      tabs = tabs.filter(
        (item) => item.value === AIMentionTabsEnum.All || !filterMode.includes(item.value as `${AIMentionTabsEnum}`),
      )
    }

    return tabs
  }, [filterMode])

  /** All 内展示的分类：不含 All 自身、不含文件系统 */
  const allSections = useCreation(() => {
    return mentionTabs
      .filter((item) => item.value !== AIMentionTabsEnum.All && item.value !== AIMentionTabsEnum.File_System)
      .map((item) => ({ value: item.value as AIMentionTabsEnum, label: item.label as string }))
  }, [mentionTabs])

  return (
    <div className={styles['ai-chat-mention']} tabIndex={0} ref={mentionRef} onClick={(e) => e.stopPropagation()}>
      <AIChatMentionTabs tabs={mentionTabs} activeKey={activeKey} tabCounts={tabCounts} onChange={onActiveKey} />
      <div className={styles['list-body']}>
        {activeKey === AIMentionTabsEnum.All ? (
          <AllListOfMention
            ref={allRef}
            keyWord={keyWord}
            sections={allSections}
            getContainer={getContainer}
            keyboardEnabled={visible}
            onSelectForge={onSelectForge}
            onSelectTool={onSelectTool}
            onSelectKnowledgeBase={onSelectKnowledgeBase}
            onSelectFocusMode={onSelectFocusMode}
            onSelectBrowser={onSelectBrowser}
            onSectionTotalChange={onSetTabCount}
          />
        ) : (
          renderTabContent(activeKey)
        )}
      </div>
    </div>
  )
})

const ForgeNameListOfMention: React.FC<ForgeNameListOfMentionProps> = React.memo(
  forwardRef((props, ref) => {
    const { keyWord, onSelect, getContainer, onTotalChange, keyboardEnabled = true } = props
    const [loading, setLoading] = useState<boolean>(false)
    const [spinning, setSpinning] = useState<boolean>(false)
    const [isRef, setIsRef] = useState<boolean>(false)
    const [hasMore, setHasMore] = useState<boolean>(true)
    const [response, setResponse] = useState<QueryAIForgeResponse>({
      Pagination: { ...AIForgeListDefaultPagination },
      Data: [],
      Total: 0,
    })
    const [selected, setSelected] = useState<AIForge>()

    const forgeListRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(forgeListRef)

    const listRef = useRef<RollingLoadListRef>({
      containerRef: null,
      scrollTo: () => {},
    })

    useImperativeHandle(
      ref,
      () => ({
        onRefresh: () => {
          getList()
        },
      }),
      [],
    )
    useEffect(() => {
      // 获取模板列表
      getList()
    }, [])
    const onKeyboardSelect = useMemoizedFn((value: number, isScroll: boolean) => {
      if (value >= 0 && value < response.Data.length) {
        setSelected(response.Data[value])
        if (isScroll) {
          listRef.current.scrollTo(value)
        }
      }
    })
    useSwitchSelectByKeyboard<AIForge>(listRef.current.containerRef, {
      data: response.Data,
      selected,
      rowKey: (item) => `AIMentionSelectItem-${item.Id}`,
      onSelectNumber: onKeyboardSelect,
      onEnter: () => onEnter(),
      getContainer,
      enabled: keyboardEnabled,
      defItemHeight: 32,
    })

    const onEnter = useMemoizedFn(() => {
      if (selected && inViewport) onSelect(selected)
    })
    const getList = useMemoizedFn(async (page?: number) => {
      setLoading(true)
      const newQuery: QueryAIForgeRequest = {
        Pagination: {
          ...response.Pagination,
          Page: page || 1,
        },
        Filter: {
          Keyword: keyWord,
        },
      }
      if (newQuery.Pagination.Page === 1) {
        setSpinning(true)
      }
      try {
        const res = await grpcQueryAIForge(newQuery)
        if (!res.Data) res.Data = []
        const keyword = keyWord.trim().toLowerCase()
        // 按展示名再过滤，避免服务端命中描述等字段导致「搜 me 出无关项」
        const filteredData = keyword
          ? res.Data.filter((item) => (item.ForgeVerboseName || item.ForgeName || '').toLowerCase().includes(keyword))
          : res.Data
        const newPage = +res.Pagination.Page
        const length = newPage === 1 ? filteredData.length : filteredData.length + response.Data.length
        setHasMore(length < +res.Total)
        const newRes: QueryAIForgeResponse = {
          Data: newPage === 1 ? filteredData : [...response.Data, ...filteredData],
          Pagination: res?.Pagination || {
            ...AIForgeListDefaultPagination,
          },
          Total: keyword ? length : res.Total,
        }
        setResponse(newRes)
        onTotalChange?.(keyword ? length : +res.Total || 0)
        if (newPage === 1) {
          setIsRef(!isRef)
        }
      } catch (error) {}
      setTimeout(() => {
        setLoading(false)
        setSpinning(false)
      }, 300)
    })
    /**@description 列表加载更多 */
    const loadMoreData = useMemoizedFn(() => {
      getList(+response.Pagination.Page + 1)
    })

    return (
      <div className={styles['forge-name-list-of-mention']} ref={forgeListRef} tabIndex={0}>
        <YakitSpin spinning={spinning}>
          <RollingLoadList<AIForge>
            ref={listRef}
            data={response.Data}
            loadMoreData={loadMoreData}
            renderRow={(rowData: AIForge, index: number) => {
              return (
                <AIMentionSelectItem
                  item={{
                    id: `${rowData.Id}`,
                    name: rowData.ForgeVerboseName || rowData.ForgeName,
                  }}
                  onSelect={() => onSelect(rowData)}
                  isActive={selected?.Id === rowData.Id}
                />
              )
            }}
            classNameRow={styles['ai-forge-list-row']}
            classNameList={styles['ai-forge-list']}
            page={+response.Pagination.Page}
            hasMore={hasMore}
            loading={loading}
            defItemHeight={32}
            rowKey="Id"
            isRef={isRef}
          />
        </YakitSpin>
      </div>
    )
  }),
)

const ToolListOfMention: React.FC<ToolListOfMentionProps> = React.memo(
  forwardRef((props, ref) => {
    const { keyWord, onSelect, getContainer, onTotalChange, keyboardEnabled = true } = props
    const [loading, setLoading] = useState<boolean>(false)
    const [spinning, setSpinning] = useState<boolean>(false)
    const [hasMore, setHasMore] = useState<boolean>(false)
    const [isRef, setIsRef] = useState<boolean>(false)
    const [response, setResponse] = useState<GetAIToolListResponse>({
      Tools: [],
      Pagination: genDefaultPagination(20),
      Total: 0,
    })
    const [selected, setSelected] = useState<AITool>()
    const toolListRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(toolListRef)

    const listRef = useRef<RollingLoadListRef>({
      containerRef: null,
      scrollTo: () => {},
    })

    useImperativeHandle(
      ref,
      () => ({
        onRefresh: () => {
          getList()
        },
      }),
      [],
    )
    useEffect(() => {
      getList()
    }, [])
    const onKeyboardSelect = useMemoizedFn((value: number, isScroll: boolean) => {
      if (value >= 0 && value < response.Tools.length) {
        setSelected(response.Tools[value])
        if (isScroll) {
          listRef.current.scrollTo(value)
        }
      }
    })
    useSwitchSelectByKeyboard<AITool>(listRef.current.containerRef, {
      data: response.Tools,
      selected,
      rowKey: (item) => `AIMentionSelectItem-${item.ID}`,
      onSelectNumber: onKeyboardSelect,
      onEnter: () => onEnter(),
      getContainer,
      enabled: keyboardEnabled,
      defItemHeight: 32,
    })

    const onEnter = useMemoizedFn(() => {
      if (selected && inViewport) onSelect(selected)
    })
    const getList = useMemoizedFn(async (page?: number) => {
      setLoading(true)
      const newQuery: GetAIToolListRequest = {
        Query: keyWord,
        ToolName: '',
        Pagination: {
          ...genDefaultPagination(20),
          OrderBy: 'created_at',
          Page: page || 1,
        },
        OnlyFavorites: false,
      }
      if (newQuery.Pagination.Page === 1) {
        setSpinning(true)
      }
      try {
        const res = await grpcGetAIToolList(newQuery)
        if (!res.Tools) res.Tools = []
        const keyword = keyWord.trim().toLowerCase()
        const filteredTools = keyword
          ? res.Tools.filter((item) => (item.VerboseName || item.Name || '').toLowerCase().includes(keyword))
          : res.Tools
        const newPage = +res.Pagination.Page
        const length = newPage === 1 ? filteredTools.length : filteredTools.length + response.Tools.length
        setHasMore(length < +res.Total)
        const newRes: GetAIToolListResponse = {
          Tools: newPage === 1 ? filteredTools : [...response.Tools, ...filteredTools],
          Pagination: res?.Pagination || {
            ...genDefaultPagination(20),
          },
          Total: keyword ? length : res.Total,
        }
        setResponse(newRes)
        onTotalChange?.(keyword ? length : +res.Total || 0)
        if (newPage === 1) {
          setIsRef(!isRef)
        }
      } catch (error) {}
      setTimeout(() => {
        setLoading(false)
        setSpinning(false)
      }, 300)
    })
    const loadMoreData = useMemoizedFn(() => {
      getList(+response.Pagination.Page + 1)
    })
    return (
      <div className={styles['tool-list-of-mention']} ref={toolListRef}>
        <YakitSpin spinning={spinning}>
          <RollingLoadList<AITool>
            ref={listRef}
            data={response.Tools}
            loadMoreData={loadMoreData}
            renderRow={(rowData: AITool, index: number) => {
              return (
                <AIMentionSelectItem
                  item={{
                    id: `${rowData.ID}`,
                    name: rowData.VerboseName || rowData.Name,
                  }}
                  onSelect={() => onSelect(rowData)}
                  isActive={selected?.ID === rowData.ID}
                />
              )
            }}
            classNameRow={styles['ai-tool-list-row']}
            classNameList={styles['ai-tool-list']}
            page={+response.Pagination.Page}
            hasMore={hasMore}
            loading={loading}
            defItemHeight={32}
            rowKey="ID"
            isRef={isRef}
          />
        </YakitSpin>
      </div>
    )
  }),
)

const KnowledgeBaseListOfMention: React.FC<KnowledgeBaseListOfMentionProps> = React.memo(
  forwardRef((props, ref) => {
    const { knowledgeBases } = useKnowledgeBase()

    const { keyWord, onSelect, getContainer, onTotalChange, keyboardEnabled = true } = props
    const [selected, setSelected] = useState<KnowledgeBaseItem>()
    const toolListRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(toolListRef)

    const listRef = useRef<RollingLoadListRef>({
      containerRef: null,
      scrollTo: () => {},
    })

    const [knowledgeBaseList, setKnowledgeBaseList] = useSafeState<KnowledgeBaseItem[]>([])
    const knowledgeList = useCreation(() => {
      const value: KnowledgeBaseItem = {
        ID: '@所有知识库',
        KnowledgeBaseName: '@所有知识库',
        Description: '',
        KnowledgeBaseFile: [],
        KnowledgeBaseType: '',
        KnowledgeBaseDescription: '',
        KnowledgeBaseLength: 0,
        streamToken: '',
        streamstep: 1,
        Tags: [],
        IsImported: false,
        addManuallyItem: false,
        historyGenerateKnowledgeList: [],
        Type: '',
        Name: '',
        BaseID: 0,
        BaseIndex: '',
        Attributes: [],
        Rationale: '',
        HiddenIndex: '',
        KnowledgeBaseId: 0,
        KnowledgeTitle: '',
        KnowledgeType: '',
        ImportanceScore: 0,
        Keywords: [],
        KnowledgeDetails: '',
        Summary: '',
        SourcePage: 0,
        PotentialQuestions: [],
        PotentialQuestionsVector: [],
        RelatedEntityUUIDS: '',
        disableERM: 'false',
        concurrency: 10,
        chunk: 'Medium',
        SerialVersionID: '',
      }
      return buildMentionKnowledgeList(value, knowledgeBaseList || [], '')
    }, [knowledgeBaseList])
    useImperativeHandle(
      ref,
      () => ({
        onRefresh: () => {
          getList()
        },
      }),
      [],
    )
    useEffect(() => {
      // 与列表渲染一致：按当前 keyWord 过滤后再入库
      getList()
    }, [knowledgeBases])
    useEffect(() => {
      onTotalChange?.(knowledgeList.length)
    }, [knowledgeList.length])

    const onKeyboardSelect = useMemoizedFn((value: number, isScroll: boolean) => {
      if (value >= 0 && value < (knowledgeList || []).length) {
        setSelected(knowledgeList?.[value])
        if (isScroll) {
          listRef.current.scrollTo(value)
        }
      }
    })

    useSwitchSelectByKeyboard<KnowledgeBaseItem>(listRef.current.containerRef, {
      data: knowledgeList,
      selected,
      rowKey: (item) => `AIMentionSelectItem-${item.ID}`,
      onSelectNumber: onKeyboardSelect,
      onEnter: () => onEnter(),
      getContainer,
      enabled: keyboardEnabled,
      defItemHeight: 32,
    })

    const onEnter = useMemoizedFn(() => {
      if (selected && inViewport) onSelect(selected)
    })
    const getList = useMemoizedFn(async () => {
      try {
        setKnowledgeBaseList(
          knowledgeBases.filter(
            (it) =>
              it?.KnowledgeBaseName === '@所有知识库' ||
              it?.KnowledgeBaseName?.toLowerCase().includes(keyWord.toLowerCase()),
          ),
        )
      } catch (error) {
        failed(error + '')
      }
    })

    return (
      <div className={styles['knowledge-base-list-of-mention']}>
        <RollingLoadList<KnowledgeBaseItem>
          ref={listRef}
          data={knowledgeList}
          loadMoreData={() => {}}
          renderRow={(rowData: KnowledgeBaseItem, index: number) => {
            return (
              <AIMentionSelectItem
                item={{
                  id: `${rowData.ID}`,
                  name: rowData.KnowledgeBaseName,
                }}
                onSelect={() => onSelect(rowData)}
                isActive={selected?.ID === rowData.ID}
              />
            )
          }}
          classNameRow={styles['ai-knowledge-base-list-row']}
          classNameList={styles['ai-knowledge-base-list']}
          page={1}
          hasMore={false}
          loading={false}
          defItemHeight={32}
          rowKey="ID"
        />
      </div>
    )
  }),
)

const AIMentionSelectItem: React.FC<AIMentionSelectItemProps> = React.memo((props) => {
  const { item, isActive, onSelect } = props
  return (
    <div
      className={classNames(styles['row-item'], {
        [styles['row-item-active']]: isActive,
      })}
      onClick={onSelect}
      id={`AIMentionSelectItem-${item.id}`}
    >
      <span className="content-ellipsis">{item.name}</span>
    </div>
  )
})

const BrowserListOfMention: React.FC<BrowserListOfMentionProps> = React.memo(
  forwardRef((props, ref) => {
    const { t } = useI18nNamespaces(['aiAgent'])
    const { keyWord, onSelect, getContainer, onTotalChange, keyboardEnabled = true } = props
    const { instances, selectedId, loading } = useBrowserInstances()
    const [selected, setSelected] = useState<AIBrowserInstance>()
    const listRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(listRef)
    const filtered = useCreation(() => {
      const keyword = keyWord.trim().toLowerCase()
      const online = instances.filter((instance) => instance.online)
      if (!keyword) return online
      return online.filter((instance) =>
        [instance.identity, instance.name, instance.origin, instance.tab?.title, instance.tab?.url]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword)),
      )
    }, [instances, keyWord])

    useImperativeHandle(
      ref,
      () => ({
        onRefresh: () => void refreshBrowserInstances(true),
      }),
      [],
    )

    useEffect(() => {
      onTotalChange?.(filtered.length)
      const current = filtered.find((instance) => instance.id === selectedId) || filtered[0]
      setSelected(current)
    }, [filtered, selectedId])

    const onKeyboardSelect = useMemoizedFn((value: number, isScroll: boolean) => {
      if (value >= 0 && value < filtered.length) {
        const item = filtered[value]
        setSelected(item)
        if (isScroll) {
          document.getElementById(`AIMentionSelectItem-${item.id}`)?.scrollIntoView({ block: 'nearest' })
        }
      }
    })
    const onEnter = useMemoizedFn(() => {
      if (selected && inViewport) onSelect(selected)
    })
    useSwitchSelectByKeyboard<AIBrowserInstance>(listRef, {
      data: filtered,
      selected,
      rowKey: (item) => `AIMentionSelectItem-${item.id}`,
      onSelectNumber: onKeyboardSelect,
      onEnter,
      getContainer,
      enabled: keyboardEnabled,
    })

    return (
      <div className={styles['browser-list-of-mention']} ref={listRef}>
        <YakitSpin spinning={loading && !instances.length}>
          {!filtered.length ? (
            <div className={styles['browser-list-empty']}>{t('BrowserInstances.noMentionInstances')}</div>
          ) : (
            <div className={styles['browser-mention-list']}>
              {filtered.map((instance) => (
                <div
                  key={instance.id}
                  id={`AIMentionSelectItem-${instance.id}`}
                  className={classNames(styles['browser-mention-row'], {
                    [styles['browser-mention-row-active']]: selected?.id === instance.id,
                  })}
                  onClick={() => onSelect(instance)}
                >
                  <div className={styles['browser-mention-avatar']}>
                    <BrowserClientIcon client={instance.client} size={18} />
                    {!!instance.identity && (
                      <span className={styles['browser-mention-identity']} data-identity={instance.identity}>
                        {instance.identity}
                      </span>
                    )}
                  </div>
                  <div className={styles['browser-mention-copy']}>
                    <div className={styles['browser-mention-title-row']}>
                      <span
                        className={styles['browser-mention-title']}
                        title={instance.tab?.title || instance.name || instance.client}
                      >
                        {instance.tab?.title || instance.name || instance.client}
                      </span>
                      <YakitTag size="small" fullRadius color={instance.online ? 'success' : 'danger'}>
                        {instance.online ? t('BrowserInstances.online') : t('BrowserInstances.offline')}
                      </YakitTag>
                    </div>
                    <div className={styles['browser-mention-url']} title={instance.tab?.url ?? instance.origin}>
                      {instance.tab?.url ?? instance.origin}
                    </div>
                    <div className={styles['browser-mention-last-seen']}>
                      {t('BrowserInstances.lastSeen', { time: formatLastSeen(instance.lastSeenAt) })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </YakitSpin>
      </div>
    )
  }),
)

const FileSystemTreeOfMention: React.FC<FileSystemTreeOfMentionProps> = React.memo((props) => {
  const { onSelect } = props
  const [selected, setSelected] = useState<FileNodeProps>()
  // 用户文件夹
  const customFolder = useCustomFolder()

  const onSetCheckedKeys = useMemoizedFn((c: boolean, nodeData: FileNodeProps) => {
    if (!nodeData) return
    onSelect(nodeData.path, nodeData.isFolder)
  })
  return (
    <div className={styles['file-system-tree-of-mention']}>
      {customFolder.map((item) => (
        <FileTreeSystemList
          key={item.path}
          path={item.path}
          isOpen={false}
          isShowRightMenu={false}
          checkable={true}
          isFolder={item.isFolder}
          selected={selected}
          setSelected={setSelected}
          checkedKeys={[]}
          // checkedKeys={checkedKeys}
          setCheckedKeys={onSetCheckedKeys}
        />
      ))}
    </div>
  )
})

const FocusModeOfMention: React.FC<FocusModeOfMentionProps> = React.memo(
  forwardRef((props, ref) => {
    const { keyWord, onSelect, getContainer, onTotalChange, keyboardEnabled = true } = props
    const [spinning, setSpinning] = useState<boolean>(false)
    const [response, setResponse] = useState<QueryAIFocusResponse>({
      Data: [],
    })
    const [selected, setSelected] = useState<AIFocus>()
    const toolListRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(toolListRef)

    const listRef = useRef<RollingLoadListRef>({
      containerRef: null,
      scrollTo: () => {},
    })

    useImperativeHandle(
      ref,
      () => ({
        onRefresh: () => {
          getList()
        },
      }),
      [],
    )
    useEffect(() => {
      getList()
    }, [])
    const onKeyboardSelect = useMemoizedFn((value: number, isScroll: boolean) => {
      if (value >= 0 && value < response.Data.length) {
        setSelected(response.Data[value])
        if (isScroll) {
          listRef.current.scrollTo(value)
        }
      }
    })
    useSwitchSelectByKeyboard<AIFocus>(listRef.current.containerRef, {
      data: response.Data,
      selected,
      rowKey: (item) => `AIMentionSelectItem-${item.Name}`,
      onSelectNumber: onKeyboardSelect,
      onEnter: () => onEnter(),
      getContainer,
      enabled: keyboardEnabled,
      defItemHeight: 32,
    })

    const onEnter = useMemoizedFn(() => {
      if (selected && inViewport) onSelect(selected)
    })
    const getList = useMemoizedFn(async (page?: number) => {
      setSpinning(true)
      try {
        const res = await grpcQueryAIFocus()
        const keyword = keyWord.trim().toLowerCase()
        const newRes: QueryAIFocusResponse = {
          Data: (res?.Data || []).filter((it) => {
            if (!keyword) return true
            const name = (it.VerboseNameZh || it.Name || '').toLowerCase()
            return name.includes(keyword)
          }),
        }
        setResponse(newRes)
        onTotalChange?.(newRes.Data.length)
      } catch (error) {}
      setTimeout(() => {
        setSpinning(false)
      }, 300)
    })
    return (
      <div className={styles['focus-mode-list-of-mention']} ref={toolListRef}>
        <YakitSpin spinning={spinning}>
          <RollingLoadList<AIFocus>
            ref={listRef}
            data={response.Data}
            loadMoreData={() => {}}
            renderRow={(rowData: AIFocus) => {
              return (
                <AIMentionSelectItem
                  item={{
                    id: `${rowData.Name}`,
                    name: rowData.VerboseNameZh || rowData.Name || '',
                  }}
                  onSelect={() => onSelect(rowData)}
                  isActive={selected?.VerboseNameZh === rowData.VerboseNameZh}
                />
              )
            }}
            classNameRow={styles['ai-focus-mode-list-row']}
            classNameList={styles['ai-focus-mode-list']}
            page={1}
            hasMore={false}
            loading={false}
            defItemHeight={32}
            rowKey="Name"
          />
        </YakitSpin>
      </div>
    )
  }),
)
