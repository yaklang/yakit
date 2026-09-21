import React, { type ReactNode, useEffect, useState } from 'react'
import { useControllableValue, useMemoizedFn } from 'ahooks'
import { AiAgentTabList, AIAgentTabListEnum, SwitchAIAgentTabEventEnum } from './defaultConstant'
import type { AIAgentSideListProps, AIAgentTriggerEventInfo } from './aiAgentType'
import emiter from '@/utils/eventBus/eventBus'

import classNames from 'classnames'
import styles from './AIAgentSideList.module.scss'
import { YakitSideTab } from '@/components/yakitSideTab/YakitSideTab'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import FileTreeList from './aiChatWelcome/FileTreeList/FileTreeList'
import { isSideAutoHidden } from './store/sideHiddenModeStore'
import type { FileNodeProps } from '@/pages/yakRunner/FileTree/FileTreeType'
import { BrowserInstancesPanel } from './browserInstances/BrowserInstancesPanel'

const AIMCP = React.lazy(() => import('./aiMCP/AIMCP'))
const AIScheduledTasks = React.lazy(() => import('./aiScheduledTasks/AIScheduledTasks'))

export const AIAgentSideList: React.FC<AIAgentSideListProps> = (props) => {
  const { t, i18nRefresh } = useI18nNamespaces(['aiAgent'])
  const [active, setActive] = useState<AIAgentTabListEnum>(AIAgentTabListEnum.File)
  const [show, setShow] = useControllableValue<boolean>(props, {
    defaultValue: false,
    valuePropName: 'show',
    trigger: 'setShow',
  })
  const handleSetActive = useMemoizedFn((value: AIAgentTabListEnum) => {
    setActive(value)
  })

  const onSwitchAIAgentTab = useMemoizedFn((data: string) => {
    let info: Omit<AIAgentTriggerEventInfo, 'type'> & { type: `${SwitchAIAgentTabEventEnum}` }
    try {
      info = JSON.parse(data)
    } catch {
      return
    }
    if (!info?.params) return
    const { type, params } = info
    switch (type) {
      case SwitchAIAgentTabEventEnum.SET_TAB_ACTIVE: {
        const nextActive = params.active as AIAgentTabListEnum
        if (params.toggle && show && active === nextActive) {
          setShow(false)
          break
        }
        setActive(nextActive)
        setShow(params.show !== false)
        break
      }
      case SwitchAIAgentTabEventEnum.SET_TAB_SHOW:
        if (params.show === false && !isSideAutoHidden()) return
        setShow(params.show !== false)
        break
      default:
        break
    }
  })
  useEffect(() => {
    emiter.on('switchAIAgentTab', onSwitchAIAgentTab)
    return () => {
      emiter.off('switchAIAgentTab', onSwitchAIAgentTab)
    }
  }, [onSwitchAIAgentTab])

  const [filePreviewData, setFilePreviewData] = useState<FileNodeProps>()
  const renderTabContent = (key: AIAgentTabListEnum) => {
    let content: ReactNode = <></>
    switch (key) {
      case AIAgentTabListEnum.File:
        content = (
          <div className={styles['file-pane']}>
            <FileTreeList selected={filePreviewData} setSelected={setFilePreviewData} onClose={() => setShow(false)} />
          </div>
        )
        break
      case AIAgentTabListEnum.Scheduled:
        content = (
          <React.Suspense fallback={<div>Loading...</div>}>
            <AIScheduledTasks visible={show} />
          </React.Suspense>
        )
        break
      case AIAgentTabListEnum.MCP:
        content = (
          <React.Suspense fallback={<div>Loading...</div>}>
            <AIMCP />
          </React.Suspense>
        )
        break
      case AIAgentTabListEnum.Browser:
        content = <BrowserInstancesPanel />
        break
      default:
        break
    }
    return content
  }
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
