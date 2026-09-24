import React, { useEffect, useImperativeHandle, useRef, useState } from 'react'
import classNames from 'classnames'
import { useCreation, useInViewport, useMemoizedFn } from 'ahooks'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { AIForgeListDefaultPagination, AIMentionTabsEnum } from '../../../defaultConstant'
import { grpcQueryAIFocus, grpcQueryAIForge } from '../../../grpc'
import { grpcGetAIToolList } from '../../../aiToolList/utils'
import { genDefaultPagination } from '@/pages/invoker/schema'
import type { AIFocus, AIForge } from '../../../type/forge'
import type { AITool } from '../../../type/aiTool'
import { type KnowledgeBaseItem, useKnowledgeBase } from '@/pages/KnowledgeBase/hooks/useKnowledgeBase'
import { browserInstanceMentionName, useBrowserInstances } from '../../../browserInstances/browserInstanceStore'
import useSwitchSelectByKeyboard from '../hooks/useSwitchSelectByKeyboard'
import type { AllListOfMentionProps } from '../type'
import {
  buildAllMentionSections,
  buildMentionKnowledgeList,
  filterByDisplayNameIncludes,
  shouldDiscardStaleResult,
} from './allListOfMentionUtils'
import styles from './AllListOfMention.module.scss'

type AllFlatItem = {
  rowKey: string
  section: AIMentionTabsEnum
  id: string
  name: string
  onPick: () => void
}

/** All 专用列表：独立样式，不含文件系统 */
export const AllListOfMention: React.FC<AllListOfMentionProps> = React.memo((props) => {
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const {
    ref,
    keyWord,
    sections,
    getContainer,
    keyboardEnabled = true,
    onSelectForge,
    onSelectTool,
    onSelectKnowledgeBase,
    onSelectFocusMode,
    onSelectBrowser,
    onSectionTotalChange,
  } = props

  const [spinning, setSpinning] = useState(false)
  const [forgeList, setForgeList] = useState<AIForge[]>([])
  const [toolList, setToolList] = useState<AITool[]>([])
  const [focusList, setFocusList] = useState<AIFocus[]>([])
  const [selectedKey, setSelectedKey] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const userNavigatedRef = useRef(false)
  /** 关键词刷新序号：忽略过期请求，避免旧结果覆盖新筛选 */
  const loadSeqRef = useRef(0)
  const mountedRef = useRef(true)
  const [inViewport = true] = useInViewport(rootRef)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      loadSeqRef.current += 1
    }
  }, [])

  const { knowledgeBases } = useKnowledgeBase()
  const { instances } = useBrowserInstances()

  const knowledgeList = useCreation(() => {
    const allItem: KnowledgeBaseItem = {
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
    return buildMentionKnowledgeList(allItem, knowledgeBases || [], keyWord)
  }, [knowledgeBases, keyWord])

  const browserList = useCreation(() => {
    const keyword = keyWord.trim().toLowerCase()
    const online = instances.filter((instance) => instance.online)
    if (!keyword) return online
    return online.filter((instance) =>
      [instance.identity, instance.name, instance.origin, instance.tab?.title, instance.tab?.url]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword)),
    )
  }, [instances, keyWord])

  const loadRemoteLists = useMemoizedFn(async () => {
    const seq = ++loadSeqRef.current
    const keywordSnapshot = keyWord
    setSpinning(true)
    try {
      const [forgeRes, toolRes, focusRes] = await Promise.all([
        grpcQueryAIForge({
          Pagination: { ...AIForgeListDefaultPagination, Page: 1, Limit: 50 },
          Filter: { Keyword: keywordSnapshot },
        }),
        grpcGetAIToolList({
          Query: keywordSnapshot,
          ToolName: '',
          Pagination: {
            ...genDefaultPagination(50),
            OrderBy: 'created_at',
            Page: 1,
          },
          OnlyFavorites: false,
        }),
        grpcQueryAIFocus(),
      ])
      // 已有更新的请求或组件已卸载：丢弃本次结果
      if (shouldDiscardStaleResult(seq, loadSeqRef.current, mountedRef.current)) return
      // 服务端可能按描述等字段模糊匹配，这里再按「展示名」收紧（仅影响列表展示）
      const forges = filterByDisplayNameIncludes(
        forgeRes?.Data || [],
        (item) => item.ForgeVerboseName || item.ForgeName || '',
        keywordSnapshot,
      )
      const tools = filterByDisplayNameIncludes(
        toolRes?.Tools || [],
        (item) => item.VerboseName || item.Name || '',
        keywordSnapshot,
      )
      const focuses = filterByDisplayNameIncludes(
        focusRes?.Data || [],
        (it) => it.VerboseNameZh || it.Name || '',
        keywordSnapshot,
      )
      setForgeList(forges)
      setToolList(tools)
      setFocusList(focuses)
      // 角标用后端 Total（无关键词）；有关键词时与单 Tab 一致，用本页展示名过滤后条数
      const hasKeyword = !!keywordSnapshot.trim()
      onSectionTotalChange(AIMentionTabsEnum.Forge_Name, hasKeyword ? forges.length : +forgeRes?.Total || 0)
      onSectionTotalChange(AIMentionTabsEnum.Tool, hasKeyword ? tools.length : +toolRes?.Total || 0)
      onSectionTotalChange(AIMentionTabsEnum.FocusMode, focuses.length)
    } catch (error) {
    } finally {
      if (!shouldDiscardStaleResult(seq, loadSeqRef.current, mountedRef.current)) {
        setTimeout(() => {
          if (!shouldDiscardStaleResult(seq, loadSeqRef.current, mountedRef.current)) setSpinning(false)
        }, 200)
      }
    }
  })

  useImperativeHandle(
    ref,
    () => ({
      onRefresh: () => {
        loadRemoteLists()
      },
    }),
    [],
  )

  useEffect(() => {
    loadRemoteLists()
  }, [])

  useEffect(() => {
    onSectionTotalChange(AIMentionTabsEnum.KnowledgeBase, knowledgeList.length)
  }, [knowledgeList.length])

  useEffect(() => {
    onSectionTotalChange(AIMentionTabsEnum.Browser, browserList.length)
  }, [browserList.length])

  const sectionData = useCreation(() => {
    const built = buildAllMentionSections(sections, {
      forgeList,
      toolList,
      knowledgeList,
      focusList,
      browserList: browserList.map((item) => ({
        id: item.id,
        name: browserInstanceMentionName(item),
      })),
    })
    return built.map((section) => ({
      ...section,
      items: section.items.map((item) => {
        let onPick = () => {}
        switch (section.value) {
          case AIMentionTabsEnum.Forge_Name: {
            const raw = forgeList.find((f) => `${f.Id}` === item.id)
            if (raw) onPick = () => onSelectForge(raw)
            break
          }
          case AIMentionTabsEnum.Browser: {
            const raw = browserList.find((b) => b.id === item.id)
            if (raw) onPick = () => onSelectBrowser(raw)
            break
          }
          case AIMentionTabsEnum.Tool: {
            const raw = toolList.find((t) => `${t.ID}` === item.id)
            if (raw) onPick = () => onSelectTool(raw)
            break
          }
          case AIMentionTabsEnum.KnowledgeBase: {
            const raw = knowledgeList.find((k) => `${k.ID}` === item.id)
            if (raw) onPick = () => onSelectKnowledgeBase(raw)
            break
          }
          case AIMentionTabsEnum.FocusMode: {
            const raw = focusList.find((f) => `${f.Name}` === item.id)
            if (raw) onPick = () => onSelectFocusMode(raw)
            break
          }
          default:
            break
        }
        return { ...item, onPick }
      }),
    }))
  }, [sections, forgeList, toolList, knowledgeList, focusList, browserList])

  const flatItems = useCreation(() => sectionData.flatMap((section) => section.items), [sectionData])

  // 关键词变化后视为新一次筛选，键盘选中从列表顶部重新开始
  useEffect(() => {
    userNavigatedRef.current = false
  }, [keyWord])

  useEffect(() => {
    if (!flatItems.length) {
      setSelectedKey('')
      return
    }
    const stillExists = flatItems.some((item) => item.rowKey === selectedKey)
    // 异步分区（技能/工具等）晚于知识库返回时，若用户还没按过方向键，始终落在第一项
    if (!userNavigatedRef.current || !stillExists) {
      setSelectedKey(flatItems[0].rowKey)
    }
  }, [flatItems, selectedKey])

  const onKeyboardSelect = useMemoizedFn((value: number) => {
    if (value >= 0 && value < flatItems.length) {
      userNavigatedRef.current = true
      const item = flatItems[value]
      setSelectedKey(item.rowKey)
      document.getElementById(item.rowKey)?.scrollIntoView({ block: 'nearest' })
    }
  })
  const onEnter = useMemoizedFn(() => {
    if (!inViewport) return
    flatItems.find((item) => item.rowKey === selectedKey)?.onPick()
  })
  useSwitchSelectByKeyboard<AllFlatItem>(rootRef, {
    data: flatItems,
    selected: flatItems.find((item) => item.rowKey === selectedKey),
    rowKey: (item) => item.rowKey,
    onSelectNumber: onKeyboardSelect,
    onEnter,
    getContainer,
    enabled: keyboardEnabled,
  })

  return (
    <div className={styles['mention-all']} ref={rootRef}>
      <YakitSpin spinning={spinning}>
        {!flatItems.length ? (
          <div className={styles['mention-all-empty']}>{t('YakitEmpty.noData')}</div>
        ) : (
          sectionData.map((section) => (
            <section key={section.value} className={styles['mention-all-section']}>
              <div className={styles['mention-all-section-title']}>{t(section.label)}</div>
              <div className={styles['mention-all-section-list']}>
                {section.items.map((item) => (
                  <div
                    key={item.rowKey}
                    id={item.rowKey}
                    className={classNames(styles['mention-all-item'], {
                      [styles['mention-all-item-active']]: selectedKey === item.rowKey,
                    })}
                    onClick={item.onPick}
                  >
                    <span className="content-ellipsis" title={item.name}>
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </YakitSpin>
    </div>
  )
})
