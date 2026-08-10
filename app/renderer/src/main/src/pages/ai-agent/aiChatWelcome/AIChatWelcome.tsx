import React, { type FC, forwardRef, memo, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import type {
  AIChatWelcomeIntroTipsProps,
  AIChatWelcomeProps,
  AIChatWelcomeSettingCardProps,
  AIChatWelcomeSettingCardRef,
  SideSettingButtonProps,
} from './type'
import styles from './AIChatWelcome.module.scss'
import DoomFlameBackground from './DoomFlameBackground'
import { AIChatTextarea } from '../template/template'
import { useCreation, useDebounceFn, useInViewport, useMemoizedFn, useSize, useUpdateEffect } from 'ahooks'
import type { AIChatTextareaRefProps, AIChatTextareaSubmit } from '../template/type'

import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import {
  OutlileHistoryIcon,
  OutlineChatIcon,
  OutlineCheckIcon,
  OutlineCloseIcon,
  OutlineExportIcon,
  OutlineImportIcon,
  OutlineOpenIcon,
  OutlinePencilaltIcon,
  OutlinePinIcon,
  OutlinePinOffIcon,
  OutlinePluscircleIcon,
  OutlineShieldexclamationIcon,
  OutlineWrenchIcon,
} from '@/assets/icon/outline'
import { Tooltip } from 'antd'
import emiter from '@/utils/eventBus/eventBus'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import FileTreeList from './FileTreeList/FileTreeList'
import { RemoteAIAgentGV } from '@/enums/aiAgent'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import KnowledgeSidebarList, { type KnowledgeModalRef } from './KnowledgeSidebarList/KnowledgeSidebarList'
import { YakitDrawer } from '@/components/yakitUI/YakitDrawer/YakitDrawer'
import Tabs from './Tabs/Tabs'
import ForgeName, { type ForgeNameRef } from '../forgeName/ForgeName'
import AIToolList, { handleAddAITool } from '../aiToolList/AIToolList'
import { SplitView } from '@/pages/yakRunner/SplitView/SplitView'
import { InstallPluginModal } from '@/pages/KnowledgeBase/compoment/InstallPluginModal/InstallPluginModal'
import { reseultKnowledgePlugin, useCheckKnowledgePlugin } from '@/pages/KnowledgeBase/hooks/useCheckKnowledgePlugin'
import classNames from 'classnames'
import type { AIEnabledCapability, AIReActRecommendedSkill } from '@/pages/ai-re-act/hooks/grpcApi'
import { ColorsChatIcon, ColorsMemfitIcon, ColorsPreViewMDIcon } from '@/assets/icon/colors'
import {
  grpcGetAIReActRecommendedSkills,
  grpcUpdateAIReActRecommendedSkill,
  grpcResetAIReActRecommendedSkill,
} from '../grpc'
import { YakitEditor } from '@/components/yakitUI/YakitEditor/YakitEditor'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import { getMainOperatorPageBodyContainerOrBody } from '@/utils/getMainOperatorPageBodyContainer'
import { yakitNotify } from '@/utils/notification'

enum AIChatWelcomeTabKeyEnum {
  Knowledge = 'knowledge',
  Skills = 'skills',
  Tools = 'tools',
}

const AIChatWelcome: React.FC<AIChatWelcomeProps> = React.memo(
  forwardRef((props, ref) => {
    const { t, i18nRefresh } = useI18nNamespaces(['aiAgent'])
    const { onTriageSubmit, streams, api } = props

    const aiChatTextareaRef = useRef<AIChatTextareaRefProps>({
      setMention: () => {},
      setValue: () => {},
      setHttpFlow: () => {},
      getValue: () => {},
    })

    useImperativeHandle(ref, () => {
      return {
        ...aiChatTextareaRef.current,
        handleStart: () => {},
      }
    }, [])

    // #region 问题相关逻辑

    const settingCardRef = useRef<AIChatWelcomeSettingCardRef>(null)

    // 控制下拉菜单
    const [openDrawer, setOpenDrawer] = useState<boolean>(true)
    const [tabActiveKey, setTabActiveKey] = useState<AIChatWelcomeTabKeyEnum>(AIChatWelcomeTabKeyEnum.Knowledge)

    const welcomeRef = useRef<HTMLDivElement>(null)
    const welcomeSize = useSize(welcomeRef)

    useUpdateEffect(() => {
      if (welcomeSize?.width && welcomeSize?.width < 1430) {
        setOpenDrawer(false)
      }
    }, [welcomeSize?.width])

    const handleTriageSubmit = useMemoizedFn((value: AIChatTextareaSubmit) => {
      // 通过 ref 主动拉取选中的推荐场景（支持多选），附加到 enabledCapabilities 传出
      const select = settingCardRef.current?.getSelect() || []
      onTriageSubmit({
        ...value,
        enabledCapabilities: select,
      })
    })
    const handleTabChange = useMemoizedFn((key: string) => {
      setTabActiveKey(key as AIChatWelcomeTabKeyEnum)
    })

    const [isSelectForgeName, setIsSelectForgeName] = useState<boolean>(false)
    const knowledgeSidebarListRef = useRef<KnowledgeModalRef>(null)
    const forgeNameRef = useRef<ForgeNameRef>(null)
    const { installPlug, refresh: refreshPluginStatus, ThirdPartyBinaryRunAsync } = useCheckKnowledgePlugin()

    const items = useMemo(() => {
      return [
        {
          label: t('AIChatWelcome.knowledgeBase'),
          key: AIChatWelcomeTabKeyEnum.Knowledge,
          children: <KnowledgeSidebarList ref={knowledgeSidebarListRef} api={api} streams={streams} />,
          extra: [
            <YakitButton
              key="import"
              onClick={() => {
                knowledgeSidebarListRef.current?.openImport()
              }}
              type="text2"
              icon={<OutlineImportIcon />}
            />,
            <YakitButton
              key="add"
              onClick={async () => {
                try {
                  const result = await ThirdPartyBinaryRunAsync()
                  const targetInstallPlugins = reseultKnowledgePlugin(result)
                  targetInstallPlugins
                    ? InstallPluginModal({
                        getContainer: '#main-operator-page-body-ai-agent',
                        callback: () => {
                          refreshPluginStatus()
                        },
                      })
                    : knowledgeSidebarListRef.current?.openAdd()
                } catch (error) {}
              }}
              type="text2"
              icon={<OutlinePluscircleIcon />}
            />,
          ],
        },
        {
          label: t('AIChatWelcome.skillBase'),
          key: AIChatWelcomeTabKeyEnum.Skills,
          children: <ForgeName ref={forgeNameRef} onSelectChange={setIsSelectForgeName} />,
          extra: [
            <YakitButton
              key="batch-export"
              onClick={() => {
                forgeNameRef.current?.onBatchExport()
              }}
              type="text2"
              icon={<OutlineExportIcon />}
              disabled={!isSelectForgeName}
            />,
            <YakitButton
              key="import"
              onClick={() => {
                forgeNameRef.current?.openImport()
              }}
              type="text2"
              icon={<OutlineImportIcon />}
            />,
            <YakitButton
              key="add"
              onClick={() => {
                forgeNameRef.current?.openAdd()
              }}
              type="text2"
              icon={<OutlinePluscircleIcon />}
            />,
          ],
        },
        {
          label: t('AIChatWelcome.toolBase'),
          key: AIChatWelcomeTabKeyEnum.Tools,
          children: <AIToolList />,
          extra: [
            <YakitButton
              key="add"
              onClick={() => {
                handleAddAITool()
              }}
              type="text2"
              icon={<OutlinePluscircleIcon />}
            />,
          ],
        },
      ]
    }, [api, streams, installPlug, i18nRefresh, isSelectForgeName])

    const onSetInputValue = useMemoizedFn((v: string) => {
      aiChatTextareaRef.current?.setValue(v)
    })
    return (
      <div className={styles['ai-chat-welcome-wrapper']} ref={welcomeRef}>
        <DoomFlameBackground />
        <div className={styles['open-file-tree-button']} onClick={() => setOpenDrawer(!openDrawer)}>
          {t('AIChatWelcome.expandResources')}
          <YakitButton type="text2" icon={<OutlineOpenIcon />} />
        </div>

        <YakitDrawer
          width={298}
          visible={openDrawer}
          getContainer={false}
          className={styles['drawer']}
          mask={false}
          placement="left"
          style={{ transform: 'translateX(0)' }}
          onClose={() => setOpenDrawer(false)}
          closable={false}
          title={
            <div className={styles['drawer-title']}>
              <span>{t('AIChatWelcome.expandResources')}</span>
              <YakitButton onClick={() => setOpenDrawer(false)} type="text2" icon={<OutlineCloseIcon />} />
            </div>
          }
        >
          <SplitView
            isVertical
            elements={[
              { element: <FileTreeList /> },
              { element: <Tabs items={items} activeKey={tabActiveKey} onChange={handleTabChange} /> },
            ]}
            sashClassName={styles['split-view-line']}
          />
        </YakitDrawer>
        <div className={styles['input-wrapper']}>
          <div className={styles['input-heard']}>
            <ColorsMemfitIcon className={styles['memfit-icon']} />
            <div className={styles['title']}>Memfit AI Agent</div>
            <div className={styles['subtitle']}>{t('AIChatWelcome.WelcomeHomeSubTitle')}</div>
          </div>
          <div className={styles['input-body-wrapper']}>
            <AIChatWelcomeIntroTips onSetInputValue={onSetInputValue} />
            <div className={styles['input-panel']}>
              <AIChatWelcomeSettingCard ref={settingCardRef} />
              <AIChatTextarea
                ref={aiChatTextareaRef}
                onSubmit={handleTriageSubmit}
                chatDataStoreKey="aiChatDataStore"
                className={styles['ai-text-wrapper']}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }),
)

export default AIChatWelcome

const welcomeTips = [
  { text: '收集目标 example.com 的开放端口与服务指纹信息' },
  { text: '枚举 target.com 的子域名并整理有效 Web 资产' },
  { text: '对当前目标执行常见漏洞扫描' },
  { text: '对当前目标执行 SQL 注入测试并验证利用点' },
  { text: '解读这份扫描报告，标记高危项并给出复现思路' },
  { text: '审计这段代码，识别 SQL 注入、XSS 等常见 Web 漏洞' },
  { text: '审计当前代码库中硬编码密钥、Token 等敏感信息泄露' },
  { text: '识别目标登录入口，分析可尝试的认证绕过或弱口令风险' },
  { text: '验证目标是否存在未授权访问、越权访问' },
  { text: '规划从入口到域控的完整攻击链路' },
]

const pickRandomWelcomeTips = (list: typeof welcomeTips) => {
  const copied = [...list]
  for (let i = copied.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copied[i], copied[j]] = [copied[j], copied[i]]
  }
  const count = 5 + Math.floor(Math.random() * 2)
  return copied.slice(0, Math.min(count, copied.length))
}

const AIChatWelcomeIntroTips: FC<AIChatWelcomeIntroTipsProps> = memo(({ onSetInputValue }) => {
  const introTipsRef = useRef<HTMLDivElement>(null)
  const [inViewport = true] = useInViewport(introTipsRef)
  const [randomWelcomeTips, setRandomWelcomeTips] = useState(() => pickRandomWelcomeTips(welcomeTips))

  useEffect(() => {
    if (inViewport) {
      setRandomWelcomeTips(pickRandomWelcomeTips(welcomeTips))
    }
  }, [inViewport])

  return (
    <div className={styles['intro-tips']} ref={introTipsRef}>
      {randomWelcomeTips.map((item) => {
        return (
          <div
            key={item.text}
            className={classNames(styles['intro-tip-item'])}
            onClick={() => onSetInputValue(item.text)}
          >
            <div className={styles['intro-tip-content']}>
              <OutlineChatIcon className={styles['intro-tip-icon']} />
              <ColorsChatIcon className={styles['intro-tip-color-icon']} />
              <span className={styles['intro-tip-text']}>{item.text}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
})

const getIconByName = (name: string) => {
  switch (name) {
    case 'code-review': //'代码审计'
      return <ColorsPreViewMDIcon className={styles['code-icon']} />
    case 'security-engineering': //'安全领域'
      return <OutlineShieldexclamationIcon className={styles['shield-icon']} />
    case 'pentest-task-design': //"渗透测试"
      return <OutlileHistoryIcon className={styles['history-icon']} />
    default:
      return <OutlineWrenchIcon className={styles['default-icon']} />
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
              {isSelect ? <OutlineCheckIcon className={styles['select-icon']} /> : getIconByName(item.Name)}
              <div className={styles['card-content']}>
                <div>{displayName}</div>
              </div>
              <OutlinePencilaltIcon onClick={(e) => onEdit(e, item)} className={styles['pencilalt-icon']} />
            </div>
          )
        })}
        <YakitModal
          visible={editVisible}
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
          destroyOnClose
        >
          <div className={styles['edit-skill-modal']}>
            <YakitEditor type="markdown" value={editContent} setValue={setEditContent} noMiniMap noLineNumber />
          </div>
        </YakitModal>
      </div>
    )
  }),
)

export const SideSettingButton: React.FC<SideSettingButtonProps> = React.memo((props) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const [isAutoHidden, setIsAutoHidden] = useState<boolean>(true)
  useEffect(() => {
    onGetSideSetting()
  }, [])
  const onGetSideSetting = useMemoizedFn(() => {
    getRemoteValue(RemoteAIAgentGV.AIAgentSideShowMode)
      .then((res) => {
        setIsAutoHidden(res !== 'false')
      })
      .catch(() => {})
  })
  const onSideSetting = useDebounceFn(
    useMemoizedFn((e) => {
      e.stopPropagation()
      const checked = !isAutoHidden
      setIsAutoHidden(checked)
      setRemoteValue(RemoteAIAgentGV.AIAgentSideShowMode, `${checked}`)
      emiter.emit('switchSideHiddenMode', `${checked}`)
    }),
    { wait: 200, leading: true },
  ).run
  return (
    <Tooltip title={!isAutoHidden ? t('SideSettingButton.pinMenuOn') : t('SideSettingButton.pinMenuOff')}>
      <YakitButton
        type={isAutoHidden ? 'text2' : 'outline1'}
        icon={isAutoHidden ? <OutlinePinOffIcon /> : <OutlinePinIcon />}
        onClick={onSideSetting}
        {...props}
      />
    </Tooltip>
  )
})
