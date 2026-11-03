import React, { forwardRef, memo, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { AIChatWelcomeProps, AIChatWelcomeSettingCardProps, AIChatWelcomeSettingCardRef } from './type'
import styles from './AIChatWelcome.module.scss'
import { AIChatTextarea } from '../template/template'
import { useCreation, useInViewport, useMemoizedFn } from 'ahooks'
import type { AIChatTextareaRefProps, AIChatTextareaSubmit } from '../template/type'

import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import {
  CheckOutlined,
  PencilAltOutlined,
  ShieldExclamationOutlined,
  FlowOutlined,
  Wrench1Outlined,
} from '@yakit-libs/yakit-ui-icons/outline'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import classNames from 'classnames'
import type { AIEnabledCapability, AIReActRecommendedSkill } from '@/pages/ai-re-act/hooks/grpcApi'
import { ColorsPreViewMDIcon } from '@yakit-libs/yakit-ui-icons/oldicon/ColorsPreViewMDIcon'
import {
  grpcGetAIReActRecommendedSkills,
  grpcUpdateAIReActRecommendedSkill,
  grpcResetAIReActRecommendedSkill,
} from '../grpc'
import { YakitEditor } from '@/components/yakitUI/YakitEditor/YakitEditor'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import { getMainOperatorPageBodyContainerOrBody } from '@/utils/getMainOperatorPageBodyContainer'
import { yakitNotify } from '@/utils/notification'
import { AIWelcomeAsciiRipple } from './AIWelcomeAsciiRipple'
import { useWelcomeAnimationDisabled } from '../store/welcomeAnimationStore'
import { Flex } from 'antd'
import WelcomeRecentSessions, { type WelcomeRecentSessionsDensity } from './WelcomeRecentSessions/WelcomeRecentSessions'
import WelcomeTipsCards from './WelcomeTipsCards/WelcomeTipsCards'

const WELCOME_TITLE = 'Memfit AI Agent'
const WELCOME_NARROW_WIDTH = 720
const WELCOME_TIGHT_HEIGHT = 680
const WELCOME_SHORT_HEIGHT = 850

interface WelcomeLayout {
  compact: boolean
  sessionDensity: WelcomeRecentSessionsDensity
}

const resolveWelcomeLayout = (width: number, height: number): WelcomeLayout => ({
  compact: width < WELCOME_NARROW_WIDTH || height < WELCOME_TIGHT_HEIGHT,
  sessionDensity: height < WELCOME_TIGHT_HEIGHT ? 'collapsed' : height <= WELCOME_SHORT_HEIGHT ? 'three' : 'full',
})

const AIChatWelcome: React.FC<AIChatWelcomeProps> = React.memo(
  forwardRef((props, ref) => {
    const { t } = useI18nNamespaces(['aiAgent'])
    const { onTriageSubmit } = props

    const aiChatTextareaRef = useRef<AIChatTextareaRefProps>({
      setMention: () => {},
      setValue: () => {},
      setHttpFlow: () => {},
      getValue: () => {},
    })

    useImperativeHandle(ref, () => {
      return {
        setMention: (value) => aiChatTextareaRef.current?.setMention(value),
        setValue: (value) => aiChatTextareaRef.current?.setValue(value),
        setHttpFlow: (ids) => aiChatTextareaRef.current?.setHttpFlow(ids),
        getValue: () => aiChatTextareaRef.current?.getValue(),
        handleStart: () => {},
      }
    }, [])

    // #region 问题相关逻辑

    const settingCardRef = useRef<AIChatWelcomeSettingCardRef>(null)

    const welcomeRef = useRef<HTMLDivElement>(null)
    const animationDisabled = useWelcomeAnimationDisabled()
    const [layout, setLayout] = useState<WelcomeLayout>({ compact: false, sessionDensity: 'full' })
    const [isEmptyStats, setIsEmptyStats] = useState(false)
    const handleEmptyStatsChange = useMemoizedFn((empty: boolean) => {
      setIsEmptyStats((prev) => (prev === empty ? prev : empty))
    })
    useEffect(() => {
      const el = welcomeRef.current
      if (!el || typeof ResizeObserver === 'undefined') return
      const update = (width: number, height: number) => {
        const next = resolveWelcomeLayout(width, height)
        setLayout((prev) =>
          prev.compact === next.compact && prev.sessionDensity === next.sessionDensity ? prev : next,
        )
      }
      update(el.clientWidth, el.clientHeight)
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0]
        if (!entry) return
        const { width, height } = entry.contentRect
        update(width, height)
      })
      observer.observe(el)
      return () => observer.disconnect()
    }, [])

    const handleTriageSubmit = useMemoizedFn((value: AIChatTextareaSubmit) => {
      // 通过 ref 主动拉取选中的推荐场景（支持多选），附加到 enabledCapabilities 传出
      const select = settingCardRef.current?.getSelect() || []
      onTriageSubmit({
        ...value,
        enabledCapabilities: select,
      })
    })

    return (
      <div className={styles['ai-chat-welcome-wrapper']} ref={welcomeRef}>
        <AIWelcomeAsciiRipple targetRef={welcomeRef} />
        <div className={styles['welcome-scroll']}>
          <div
            className={classNames(styles['input-wrapper'], {
              [styles['input-wrapper-compact']]: layout.compact,
            })}
          >
            <Flex className={styles['input-heard']} align="center" vertical gap={16}>
              <div className={styles['title']}>
                {animationDisabled
                  ? WELCOME_TITLE
                  : WELCOME_TITLE.split('').map((ch, index) => (
                      <span
                        key={`${ch}-${index}`}
                        className={styles['title-char']}
                        style={{ animationDelay: `${index * 36}ms` }}
                      >
                        {ch === ' ' ? '\u00A0' : ch}
                      </span>
                    ))}
              </div>
              <Flex vertical gap={12} className={styles['welcome-tips-block']}>
                {!isEmptyStats && <div className={styles['subtitle']}>{t('AIChatWelcome.WelcomeHomeSubTitle')}</div>}
                <WelcomeTipsCards compact={layout.compact} onEmptyChange={handleEmptyStatsChange} />
                {!isEmptyStats && <WelcomeRecentSessions density={layout.sessionDensity} />}
              </Flex>
            </Flex>
            <div className={styles['input-body-wrapper']}>
              <div className={styles['input-panel']} data-ai-ripple-disabled>
                {/* <AIChatWelcomeSettingCard ref={settingCardRef} /> */}
                <AIChatTextarea
                  ref={aiChatTextareaRef}
                  onSubmit={handleTriageSubmit}
                  onHttpFlowRemove={props.onHttpFlowRemove}
                  chatDataStoreKey="aiChatDataStore"
                  className={styles['ai-text-wrapper']}
                  milkdownClassName={styles['milkdown-input']}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }),
)

export default AIChatWelcome

const getIconByName = (name: string) => {
  switch (name) {
    case 'code-review': //'代码审计'
      return <ColorsPreViewMDIcon className={styles['code-icon']} />
    case 'security-engineering': //'安全领域'
      return <ShieldExclamationOutlined className={styles['shield-icon']} color="currentColor" />
    case 'pentest-task-design': //"渗透测试"
      return <FlowOutlined className={styles['history-icon']} color="currentColor" />
    default:
      return <Wrench1Outlined className={styles['default-icon']} color="currentColor" />
  }
}
const AIChatWelcomeSettingCard = memo(
  forwardRef<AIChatWelcomeSettingCardRef, AIChatWelcomeSettingCardProps>((props, ref) => {
    const [list, setList] = useState<AIReActRecommendedSkill[]>([])
    const [select, setSelect] = useState<AIEnabledCapability[]>([])
    const listRef = useRef<HTMLDivElement>(null)
    const [inViewport = true] = useInViewport(listRef)
    const { i18n } = useI18nNamespaces([])
    useEffect(() => {
      if (inViewport) getList()
    }, [inViewport])
    const onSelect = useMemoizedFn((item: AIReActRecommendedSkill) => {
      // 多选：已存在则取消，否则追加
      setSelect((prev) => {
        const key = `${item.Type}:${item.Name}`
        const exists = prev.some((s) => `${s.Type}:${s.Name}` === key)
        return exists
          ? prev.filter((s) => `${s.Type}:${s.Name}` !== key)
          : [...prev, { Name: item.Name, Type: item.Type }]
      })
    })
    const getList = useMemoizedFn(() => {
      grpcGetAIReActRecommendedSkills().then((res) => {
        setList(res.Data)
        if (res.Data[0] && select.length === 0) setSelect([res.Data[0]]) // 默认选中第一个
      })
    })
    useImperativeHandle(ref, () => {
      return {
        getSelect: () => select,
      }
    }, [select])
    // #region 编辑推荐 Skill
    const [editVisible, setEditVisible] = useState<boolean>(false)
    const [editContent, setEditContent] = useState<string>('')
    const [editLoading, setEditLoading] = useState<boolean>(false)
    // 用 ref 存当前编辑项，避免触发多余渲染
    const editItemRef = useRef<AIReActRecommendedSkill | null>(null)

    const onEdit = useMemoizedFn((e: React.MouseEvent, item: AIReActRecommendedSkill) => {
      e.stopPropagation()
      editItemRef.current = item
      setEditContent(item.Content)
      setEditVisible(true)
    })
    const handleSave = useMemoizedFn(() => {
      const item = editItemRef.current
      if (!item) return
      setEditLoading(true)
      grpcUpdateAIReActRecommendedSkill({ Name: item.Name, Content: editContent })
        .then(() => {
          yakitNotify('success', '保存成功')
          setEditVisible(false)
          getList()
        })
        .catch(() => {})
        .finally(() => setEditLoading(false))
    })
    const handleReset = useMemoizedFn(() => {
      const item = editItemRef.current
      if (!item) return
      grpcResetAIReActRecommendedSkill({ Name: item.Name })
        .then((res) => {
          setEditContent(res.Content)
          yakitNotify('success', '已恢复默认内容')
        })
        .catch(() => {})
    })
    const title = useCreation(() => {
      return editItemRef.current
        ? i18n.language?.startsWith('zh')
          ? editItemRef.current.DisplayNameZhCN || editItemRef.current.Name
          : editItemRef.current.Name
        : ''
    }, [editVisible, i18n.language])
    // #endregion
    return (
      <div className={styles['card-list']} ref={listRef}>
        {list.map((item, index) => {
          const isSelect = select.some((s) => s.Name === item.Name)
          const displayName = i18n.language?.startsWith('zh') ? item.DisplayNameZhCN || item.Name : item.Name
          return (
            <div
              key={`${item.Type}:${item.Name}`}
              className={classNames(styles['card-item'], { [styles['card-item-select']]: isSelect })}
              onClick={() => onSelect(item)}
            >
              {isSelect ? (
                <CheckOutlined className={styles['select-icon']} color="currentColor" />
              ) : (
                getIconByName(item.Name)
              )}
              <div className={styles['card-content']}>
                <div>{displayName}</div>
              </div>
              <PencilAltOutlined
                onClick={(e) => onEdit(e, item)}
                className={styles['pencilalt-icon']}
                color="currentColor"
              />
            </div>
          )
        })}
        <YakitModal
          open={editVisible}
          title={title}
          width={700}
          maskClosable={false}
          centered
          confirmLoading={editLoading}
          onOk={handleSave}
          onCancel={() => setEditVisible(false)}
          getContainer={getMainOperatorPageBodyContainerOrBody()}
          footerExtra={
            <YakitButton type="outline2" onClick={handleReset}>
              恢复默认
            </YakitButton>
          }
          destroyOnHidden
        >
          <div className={styles['edit-skill-modal']}>
            <YakitEditor type="markdown" value={editContent} setValue={setEditContent} noMiniMap noLineNumber />
          </div>
        </YakitModal>
      </div>
    )
  }),
)

export { SideSettingButton } from './AIChatWelcomeSideSetting'
