import React, { type ReactNode, useEffect, useState } from 'react'
import { useControllableValue, useMemoizedFn } from 'ahooks'
import { AiAgentTabList, AIAgentTabListEnum, SwitchAIAgentTabEventEnum } from './defaultConstant'
import type { AIAgentSideListProps, AIAgentTriggerEventInfo } from './aiAgentType'
import emiter from '@/utils/eventBus/eventBus'

import classNames from 'classnames'
import styles from './AIAgentSideList.module.scss'
import { YakitSideTab } from '@/components/yakitSideTab/YakitSideTab'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import ChatSessionPane from './ChatSessionPane/ChatSessionPane'
import { SplitView } from '../yakRunner/SplitView/SplitView'
import FileTreeList from './aiChatWelcome/FileTreeList/FileTreeList'
import type { FileNodeProps } from '@/pages/yakRunner/FileTree/FileTreeType'

const AIChatSetting = React.lazy(() => import('./AIChatSetting/AIChatSetting'))
const AIModelList = React.lazy(() => import('./aiModelList/AIModelList'))
const AIMCP = React.lazy(() => import('./aiMCP/AIMCP'))

export const AIAgentSideList: React.FC<AIAgentSideListProps> = (props) => {
  const { t, i18nRefresh } = useI18nNamespaces(['aiAgent'])
  const [active, setActive] = useState<AIAgentTabListEnum>(AIAgentTabListEnum.Session)
  const [show, setShow] = useControllableValue<boolean>(props, {
    defaultValue: false,
    valuePropName: 'show',
    trigger: 'setShow',
  })
  const handleSetActive = useMemoizedFn((value: AIAgentTabListEnum) => {
    setActive(value)
  })

  useEffect(() => {
    emiter.on('switchAIAgentTab', onSwitchAIAgentTab)
    return () => {
      emiter.off('switchAIAgentTab', onSwitchAIAgentTab)
    }
  }, [])

  const onSwitchAIAgentTab = useMemoizedFn((data: string) => {
    try {
      const info: Omit<AIAgentTriggerEventInfo, 'type'> & { type: `${SwitchAIAgentTabEventEnum}` } = JSON.parse(data)
      const { type, params } = info
      if (!params) return
      switch (type) {
        case SwitchAIAgentTabEventEnum.SET_TAB_ACTIVE:
          setActive((params.active === 'history' ? AIAgentTabListEnum.Session : params.active) as AIAgentTabListEnum)
          setShow(params.show !== false)
          break
        case SwitchAIAgentTabEventEnum.SET_TAB_SHOW:
          setShow(params.show !== false)
          break
        default:
          break
      }
    } catch (error) {}
  })
  const [filePreviewData, setFilePreviewData] = useState<FileNodeProps>()
  const renderTabContent = useMemoizedFn((key: AIAgentTabListEnum) => {
    let content: ReactNode = <></>
    switch (key) {
      case AIAgentTabListEnum.Session:
        content = (
          <div className={styles['session-pane']}>
            <SplitView
              isVertical
              className={styles['session-split']}
              elements={[
                { element: <ChatSessionPane /> },
                { element: <FileTreeList selected={filePreviewData} setSelected={setFilePreviewData} /> },
              ]}
            />
          </div>
        )
        break
      case AIAgentTabListEnum.Setting:
        content = (
          <React.Suspense>
            <AIChatSetting />
          </React.Suspense>
        )
        break
      // case AIAgentTabListEnum.Forge_Name:
      //     content = (
      //         <React.Suspense>
      //             <ForgeName />
      //         </React.Suspense>
      //     )
      //     break
      // case AIAgentTabListEnum.Tool:
      //     content = (
      //         <React.Suspense>
      //             <AIToolList />
      //         </React.Suspense>
      //     )
      //     break
      case AIAgentTabListEnum.AI_Model:
        content = (
          <React.Suspense>
            <AIModelList />
          </React.Suspense>
        )
        break
      case AIAgentTabListEnum.MCP:
        content = (
          <React.Suspense>
            <AIMCP />
          </React.Suspense>
        )
        break
      default:
        break
    }
    return content
  })
  return (
    <div className={styles['ai-agent-side-list']}>
      <YakitSideTab
        key={i18nRefresh}
        type="vertical"
        yakitTabs={AiAgentTabList}
        activeKey={active}
        onActiveKey={(v) => handleSetActive(v as AIAgentTabListEnum)}
        className={styles['tab-wrap']}
        show={show}
        setShow={setShow}
        t={t}
      >
        <div
          className={classNames(styles['tab-content'], {
            [styles['tab-content-hidden']]: !show,
          })}
        >
          {renderTabContent(active)}
        </div>
      </YakitSideTab>
    </div>
  )
}
