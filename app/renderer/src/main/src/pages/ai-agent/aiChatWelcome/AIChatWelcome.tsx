import React, { forwardRef, useEffect, useId, useImperativeHandle, useMemo, useRef, useState } from 'react'
import {
  AIChatWelcomeProps,
  AIMaterialsData,
  AIRecommendItemProps,
  AIRecommendProps,
  SideSettingButtonProps,
} from './type'
import styles from './AIChatWelcome.module.scss'
import { AIChatTextarea } from '../template/template'
import { useCreation, useDebounceFn, useInViewport, useMemoizedFn, useUpdateEffect } from 'ahooks'
import { AIChatTextareaRefProps, AIChatTextareaSubmit } from '../template/type'

import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import {
  OutlineArrowrightIcon,
  OutlineCloseIcon,
  OutlineExportIcon,
  OutlineImportIcon,
  OutlineInformationcircleIcon,
  OutlineOpenIcon,
  OutlinePinIcon,
  OutlinePinOffIcon,
  OutlinePluscircleIcon,
  OutlineRefreshIcon,
} from '@/assets/icon/outline'
import { AIDownAngleLeftIcon, AIDownAngleRightIcon, AIUpAngleLeftIcon, AIUpAngleRightIcon } from './icon'
import { Tooltip } from 'antd'
import ReactResizeDetector from 'react-resize-detector'
import emiter from '@/utils/eventBus/eventBus'
import { YakitRoute } from '@/enums/yakitRoute'
import { randomString } from '@/utils/randomUtil'
import classNames from 'classnames'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'

import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import FileTreeList from './FileTreeList/FileTreeList'
import { RemoteAIAgentGV } from '@/enums/aiAgent'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import KnowledgeSidebarList, { KnowledgeModalRef } from './KnowledgeSidebarList/KnowledgeSidebarList'
import { YakitDrawer } from '@/components/yakitUI/YakitDrawer/YakitDrawer'
import Tabs from './Tabs/Tabs'
import ForgeName, { ForgeNameRef } from '../forgeName/ForgeName'
import AIToolList from '../aiToolList/AIToolList'
import { SplitView } from '@/pages/yakRunner/SplitView/SplitView'
import { InstallPluginModal } from '@/pages/KnowledgeBase/compoment/InstallPluginModal/InstallPluginModal'
import { reseultKnowledgePlugin, useCheckKnowledgePlugin } from '@/pages/KnowledgeBase/hooks/useCheckKnowledgePlugin'
import useGetAIMaterialsData, { getAIRecommendIconByType } from '@/pages/ai-re-act/hooks/useGetAIMaterialsData'
import { AIMentionCommandParams } from '../components/aiMilkdownInput/aiMilkdownMention/aiMentionPlugin'

// const sideberRadioOptions = [
//     {
//         value: "fileTree",
//         label: "文件树"
//     },
//     {
//         value: "knoledge",
//         label: "知识库"
//     }
// ]

// const getRandomItems = (array, count = 3) => {
//   const shuffled = [...array].sort(() => 0.5 - Math.random())
//   return shuffled.slice(0, count)
// }

const randomAIMaterialsDataIsEmpty = (randObj) => {
  try {
    return (
      randObj.tools.data.length === 0 && randObj.forges.data.length === 0 && randObj.knowledgeBases.data.length === 0
    )
  } catch (error) {
    return true
  }
}

enum AIChatWelcomeTabKeyEnum {
  Knowledge = 'knowledge',
  Skills = 'skills',
  Tools = 'tools',
}

const AIChatWelcome: React.FC<AIChatWelcomeProps> = React.memo(
  forwardRef((props, ref) => {
    const { t, i18n } = useI18nNamespaces(['aiAgent'])
    const { onTriageSubmit, onSetReAct, streams, api } = props

    const aiChatTextareaRef = useRef<AIChatTextareaRefProps>({
      setMention: () => {},
      setValue: () => {},
      getValue: () => {},
    })

    useImperativeHandle(
      ref,
      () => {
        return {
          ...aiChatTextareaRef.current,
          handleStart: () => {},
        }
      },
      [],
    )

    const [{ randomAIMaterials, randomAIMaterialsData, loadingAIMaterials }, { onRefresh }] = useGetAIMaterialsData()
    // #region 问题相关逻辑

    const [lineStartDOMRect, setLineStartDOMRect] = useState<DOMRect>()
    // 控制下拉菜单
    const [openDrawer, setOpenDrawer] = useState<boolean>(true)
    const [tabActiveKey, setTabActiveKey] = useState<AIChatWelcomeTabKeyEnum>(AIChatWelcomeTabKeyEnum.Knowledge)

    const lineStartRef = useRef<HTMLDivElement>(null)
    const welcomeRef = useRef<HTMLDivElement>(null)
    const [inViewPort = true] = useInViewport(welcomeRef)

    useUpdateEffect(() => {
      if (inViewPort) {
        onRefresh()
      }
    }, [inViewPort])

    const onSetQuestion = useMemoizedFn((value: string) => {
      aiChatTextareaRef.current?.setValue(value ?? '')
    })

    const resizeUpdate = useMemoizedFn(() => {
      if (!lineStartRef.current) return
      const lineStartRect = lineStartRef.current.getBoundingClientRect()
      setLineStartDOMRect(lineStartRect) // 确定初始定位点位置
    })
    const handleTriageSubmit = useMemoizedFn((value: AIChatTextareaSubmit) => {
      onTriageSubmit(value)
      onSetQuestion('')
    })
    const onMore = useMemoizedFn((item: string) => {
      switch (item) {
        case '技能':
          setTabActiveKey(AIChatWelcomeTabKeyEnum.Skills)
          setOpenDrawer(true)
          break
        case '知识库':
          emiter.emit('menuOpenPage', JSON.stringify({ route: YakitRoute.AI_REPOSITORY }))
          break
        case '工具':
          setTabActiveKey(AIChatWelcomeTabKeyEnum.Tools)
          setOpenDrawer(true)
          break
        default:
          break
      }
    })
    const handleTabChange = useMemoizedFn((key: string) => {
      setTabActiveKey(key as AIChatWelcomeTabKeyEnum)
    })

    const onCheckItem = useMemoizedFn(
      (item: AIRecommendItemProps['item'], mentionType: AIMentionCommandParams['mentionType']) => {
        aiChatTextareaRef.current?.setMention({
          mentionId: randomString(8),
          mentionType: mentionType,
          mentionName: item.name,
        })
      },
    )

    const isEmptyAIMaterials = useCreation(() => {
      return randomAIMaterialsDataIsEmpty(randomAIMaterialsData)
    }, [randomAIMaterials])

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
                emiter.emit('menuOpenPage', JSON.stringify({ route: YakitRoute.AddAITool }))
              }}
              type="text2"
              icon={<OutlinePluscircleIcon />}
            />,
          ],
        },
      ]
    }, [api, streams, installPlug, i18n.language, isSelectForgeName])

    return (
      <div className={styles['ai-chat-welcome-wrapper']} ref={welcomeRef}>
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
        <div className={styles['content']}>
          <div className={styles['content-absolute']}>
            <div className={styles['input-wrapper']}>
              <div className={styles['input-heard']}>
                <div className={styles['title']}>Memfit AI Agent</div>
                <div className={styles['subtitle']}>{t('AIChatWelcome.WelcomeHomeSubTitle')}</div>
              </div>
              <div className={classNames(styles['input-body-wrapper'])}>
                <ReactResizeDetector
                  onResize={(_, height) => {
                    if (!height) return
                    resizeUpdate()
                  }}
                  handleWidth={false}
                  handleHeight={true}
                  refreshMode={'debounce'}
                  refreshRate={50}
                />
                <AIChatTextarea
                  ref={aiChatTextareaRef}
                  onSubmit={handleTriageSubmit}
                  className={classNames({
                    [styles['input-body']]: !isEmptyAIMaterials,
                  })}
                >
                  {/* svg 定位点1/left */}
                  <div className={styles['line']} ref={lineStartRef} />
                </AIChatTextarea>
              </div>
            </div>
            {!isEmptyAIMaterials && (
              <div className={styles['recommend-wrapper']}>
                <AIDownAngleLeftIcon className={styles['recommend-down-left']} />
                <AIDownAngleRightIcon className={styles['recommend-down-right']} />
                <AIUpAngleLeftIcon className={styles['recommend-up-left']} />
                <AIUpAngleRightIcon className={styles['recommend-up-right']} />
                <div className={styles['recommend-heard']}>
                  <div className={styles['title']}>{t('AIChatWelcome.homeRecommend')}</div>
                  <YakitButton
                    icon={<OutlineRefreshIcon />}
                    size="small"
                    type="text"
                    className={styles['line2-btn']}
                    onClick={onRefresh}
                  >
                    {t('AIChatWelcome.refresh')}
                  </YakitButton>
                </div>
                <YakitSpin spinning={loadingAIMaterials}>
                  <div className={styles['recommend-body']}>
                    {Object.keys(randomAIMaterialsData).map((key) => {
                      const aiItem: AIMaterialsData = randomAIMaterialsData[key as keyof typeof randomAIMaterialsData]
                      return aiItem.data.length > 0 ? (
                        <AIRecommend
                          key={aiItem.type}
                          title={aiItem.type}
                          data={aiItem.data}
                          lineStartDOMRect={lineStartDOMRect}
                          onMore={() => onMore(aiItem.type)}
                          onCheckItem={(v) => onCheckItem(v, aiItem.mentionType)}
                        />
                      ) : (
                        <React.Fragment key={aiItem.type}></React.Fragment>
                      )
                    })}
                  </div>
                </YakitSpin>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }),
)

export default AIChatWelcome

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

const AIRecommend: React.FC<AIRecommendProps> = React.memo((props) => {
  const { t } = useI18nNamespaces(['yakitUi'])
  const { title, data, lineStartDOMRect, onMore, onCheckItem } = props
  const icons = useCreation(() => {
    return getAIRecommendIconByType(title)
  }, [title])
  return (
    <div className={styles['recommend-list-wrapper']}>
      <AIDownAngleLeftIcon className={styles['down-left']} />
      <AIDownAngleRightIcon className={styles['down-right']} />
      <AIUpAngleLeftIcon className={styles['up-left']} />
      <AIUpAngleRightIcon className={styles['up-right']} />
      <div className={styles['recommend-list-heard']}>
        <div className={styles['title']}>
          <div className={styles['icon']}>{icons.icon}</div>
          <div className={styles['hover-icon']}>{icons.hoverIcon}</div>
          {title}
        </div>
        <YakitButton className={styles['more-btn']} type="text" size="small" onClick={onMore}>
          {t('YakitButton.more')}
          <OutlineArrowrightIcon />
        </YakitButton>
      </div>
      <div className={styles['recommend-list']}>
        {data.map((item, index) => (
          <AIRecommendItem
            key={index} //不需要缓存，每次刷新重新渲染
            item={item}
            lineStartDOMRect={lineStartDOMRect}
            onCheckItem={onCheckItem}
          />
        ))}
      </div>
    </div>
  )
})

const AIRecommendItem: React.FC<AIRecommendItemProps> = React.memo((props) => {
  const { item, lineStartDOMRect, onCheckItem } = props
  const [svgBox, setSvgBox] = useState({ width: 0, height: 0, isUp: true })
  const dotRef = useRef<HTMLDivElement>(null)
  const colorLineIconId = useId()

  useEffect(() => {
    const linePointLeft = lineStartDOMRect
    const linePointRight = dotRef.current?.getBoundingClientRect()
    if (!linePointLeft || !linePointRight) return
    const isUp = (linePointRight.y || 0) < (linePointLeft.y || 0)
    const svgWidth = Math.abs(linePointRight.left - linePointLeft.right) - 4
    const svgHeight = isUp
      ? Math.abs(linePointRight.top - linePointLeft.bottom)
      : Math.abs(linePointRight.top - linePointLeft.bottom) + 3

    setSvgBox({ width: svgWidth, height: svgHeight, isUp })
  }, [lineStartDOMRect])
  const generatePath = useMemoizedFn(() => {
    const height = svgBox.height
    const width = svgBox.width
    const curvature = 0.8

    if (svgBox.isUp) {
      const startX = -2
      const startY = height
      const endX = width
      const endY = 0

      const control1X = width * curvature
      const control1Y = height

      const control2X = width * (1 - curvature)
      const control2Y = 0

      return `M ${startX} ${startY}
                C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${endX} ${endY}`
    } else {
      const startX = 0
      const startY = 0
      const endX = width
      const endY = height

      // 控制点1：向右下方弯曲
      const control1X = width * curvature
      const control1Y = 0

      // 控制点2：向左下方弯曲（形成S形）
      const control2X = width * (1 - curvature)
      const control2Y = height

      return `M ${startX} ${startY}
                    C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${endX} ${endY}`
    }
  })
  const svgStyle = useCreation(() => {
    return {
      top: svgBox.isUp ? `calc(50%)` : undefined,
      bottom: svgBox.isUp ? undefined : `calc(50% - 3px)`,
      left: `calc(${-svgBox.width}px + -16px)`,
    }
  }, [svgBox.isUp, svgBox.width])

  const colorLineIcon = useCreation(() => {
    return (
      <svg
        width={svgBox.width}
        height={svgBox.height}
        style={svgStyle}
        viewBox={`0 0 ${svgBox.width} ${svgBox.height}`}
        xmlns="http://www.w3.org/2000/svg"
        className={styles['color-line-svg']}
      >
        <path d={generatePath()} stroke={`url(#${colorLineIconId})`} strokeLinecap="round" />
        <defs>
          <linearGradient
            id={colorLineIconId}
            x1="0.5"
            y1="0.5"
            x2="64.6787"
            y2="8.55444"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#DC5CDF" />
            <stop offset="0.639423" stopColor="#8862F8" />
            <stop offset="1" stopColor="#4493FF" />
          </linearGradient>
        </defs>
      </svg>
    )
  }, [svgBox.width, svgBox.height, svgStyle])
  const lineIcon = useCreation(() => {
    return (
      <svg
        width={svgBox.width}
        height={svgBox.height}
        style={svgStyle}
        viewBox={`0 0 ${svgBox.width} ${svgBox.height}`}
        xmlns="http://www.w3.org/2000/svg"
        className={styles['line-svg']}
      >
        <path d={generatePath()} stroke="var(--Colors-Use-Neutral-Border)" strokeLinecap="round" />
      </svg>
    )
  }, [svgBox.width, svgBox.height, svgStyle])
  return (
    <div className={styles['recommend-list-item']} onClick={() => onCheckItem(item)}>
      <div className={styles['line-container']} onClick={(e) => e.stopPropagation()}>
        {lineIcon}
        {colorLineIcon}
      </div>
      <div className={styles['line-dot']} onClick={(e) => e.stopPropagation()}>
        {/* svg 定位点2/right */}
        <div className={styles['line-end']} ref={dotRef} />
      </div>
      <span className={styles['text']}>{item.name}</span>
      <Tooltip title={item.description}>
        <OutlineInformationcircleIcon className={styles['info-icon']} />
      </Tooltip>
    </div>
  )
})
