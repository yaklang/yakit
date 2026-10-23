import type React from 'react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Timeline } from 'antd'
import styles from './HTTPFuzzerEditorMenu.module.scss'
import { failed } from '@/utils/notification'
import classNames from 'classnames'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { XOutlined, DocumentDuplicateOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import ReactDraggable from 'react-draggable'
import { IconSolidCodeIcon } from '@yakit-libs/yakit-ui-icons/oldicon/IconSolidCodeIcon'
import { IconSolidSparklesIcon } from '@yakit-libs/yakit-ui-icons/oldicon/IconSolidSparklesIcon'
import { IconSolidTagIcon } from '@yakit-libs/yakit-ui-icons/oldicon/IconSolidTagIcon'
import { type AutoDecodeResult, execAutoDecode } from '@/utils/encodec'
import type { QueryFuzzerLabelResponseProps } from './StringFuzzer'
import { useMemoizedFn } from 'ahooks'
import { TerminalSolid } from '@yakit-libs/yakit-ui-icons/solid'
import { queryYakScriptList } from '../yakitStore/network'
import type { YakScript } from '../invoker/schema'
import { IconSolidAIIcon } from '@yakit-libs/yakit-ui-icons/oldicon/IconSolidAIIcon'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { PluginSwitchToTag } from '../pluginEditor/defaultconstants'
import { setClipboardText } from '@/utils/clipboard'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { YakParamProps } from '../plugins/pluginsType'
import { getMenuPanelStyle, type CountDirectionProps, type EditorDetailInfoProps } from './fuzzerEditorMenuLayout'
import { FuzzerEditorMenuBar, type FuzzerEditorMenuGroup, type FuzzerEditorMenuItem } from './fuzzerEditorMenuBar'
import {
  CodecMenuList,
  DECODE_MENU_ACTIONS,
  ENCODE_MENU_ACTIONS,
  FUZZER_LABEL_LIST_NUMBER,
  InsertTagPanel,
} from './fuzzerEditorMenuItems'

export type { CountDirectionProps, EditorDetailInfoProps, FuzzerEditorMenuGroup, FuzzerEditorMenuItem }
const { ipcRenderer } = window.require('electron')

export interface SmartDecodeAnchorRect {
  top: number
  left: number
  right: number
  bottom: number
  width: number
  height: number
}

export const snapshotRect = (rect: DOMRect): SmartDecodeAnchorRect => ({
  top: rect.top,
  left: rect.left,
  right: rect.right,
  bottom: rect.bottom,
  width: rect.width,
  height: rect.height,
})

export interface HTTPFuzzerClickEditorMenuProps {
  close: () => void
  editorInfo?: EditorDetailInfoProps
  insert: (v: QueryFuzzerLabelResponseProps) => void
  addLabel: () => void
  className?: string
  segmentedTypeReset?: boolean
  // 是否开启关闭倒计时
  fizzSelectTimeoutId?: any
  closeTimeout?: boolean
  toOpenAiChat?: AIPluginComponentProps['toOpenAiChat']
  onClickSegmentedType?: (v: 'insert-tag' | 'aiplugin' | undefined) => void
  /** 选区工具条测量后决定是否显示文案，未传时按编辑器宽度自行判断 */
  showMenuLabel?: boolean
  /** 不传则是插入标签、AI工具。传入后整组替换，方便以后改标签和面板 */
  menuGroups?: FuzzerEditorMenuGroup[]
}

export interface LabelDataProps {
  DefaultDescription: string
  Description?: string
  DescriptionUi?: string
  Label?: string
}

export { FUZZER_LABEL_LIST_NUMBER }

export const buildClickEditorMenuItems = (
  t: (key: string) => string,
  options: {
    editorInfo?: EditorDetailInfoProps
    insert: (v: QueryFuzzerLabelResponseProps) => void
    addLabel: () => void
    toOpenAiChat?: AIPluginComponentProps['toOpenAiChat']
  },
): FuzzerEditorMenuItem[] => [
  {
    id: 'insert-tag',
    label: t('HTTPFuzzerClickEditorMenu.insertTag'),
    icon: <IconSolidTagIcon className={styles['tag']} />,
    className: styles['insert-box'],
    panelClassName: styles['http-fuzzer-click-editor-menu'],
    waitReady: true,
    renderPanel: ({ maxWidth, onReady }) => (
      <InsertTagPanel
        editorInfo={options.editorInfo}
        insert={options.insert}
        addLabel={options.addLabel}
        maxWidth={maxWidth}
        onReady={onReady}
      />
    ),
  },
  {
    id: 'ai',
    label: t('HTTPFuzzerClickEditorMenu.aiTool'),
    icon: <IconSolidAIIcon className={styles['tag']} />,
    className: styles['aiplugin-box'],
    panelClassName: styles['http-fuzzer-click-editor-menu'],
    waitReady: true,
    renderPanel: ({ onReady }) => (
      <div className={styles['menu-content']}>
        <AIPluginComponent toOpenAiChat={options.toOpenAiChat} onReady={onReady} />
      </div>
    ),
  },
]

export const HTTPFuzzerClickEditorMenu: React.FC<HTTPFuzzerClickEditorMenuProps> = (props) => {
  const {
    close,
    editorInfo,
    insert,
    addLabel,
    className,
    fizzSelectTimeoutId,
    closeTimeout = true,
    toOpenAiChat,
    showMenuLabel,
    menuGroups,
  } = props
  const { t, i18n } = useI18nNamespaces(['webFuzzer', 'yakitUi'])
  const isMainEnter = useRef<boolean>(false)
  const [boxHidden, setBoxHidden] = useState<boolean>(true)

  useEffect(() => {
    setTimeout(() => {
      setBoxHidden(false)
    }, 300)
  }, [])

  const closeTimeoutFun = useMemoizedFn(() => {
    const closeTimeoutId = setTimeout(() => {
      close()
    }, 5 * 1000)
    return closeTimeoutId
  })
  useEffect(() => {
    if (closeTimeout && fizzSelectTimeoutId) {
      if (isMainEnter.current) {
        fizzSelectTimeoutId.current && clearTimeout(fizzSelectTimeoutId.current)
      } else {
        fizzSelectTimeoutId.current = undefined
        fizzSelectTimeoutId.current = closeTimeoutFun()
      }
    }
  }, [isMainEnter.current])

  const groups: FuzzerEditorMenuGroup[] = menuGroups ?? [
    {
      id: 'click',
      simpleClassName: classNames(styles['http-fuzzer-click-editor-simple'], className),
      items: buildClickEditorMenuItems(t, { editorInfo, insert, addLabel, toOpenAiChat }),
    },
  ]

  return (
    <FuzzerEditorMenuBar
      groups={groups}
      editorInfo={editorInfo}
      lang={i18n.language}
      showLabel={showMenuLabel}
      className={classNames(styles['http-fuzzer-click-editor'], {
        [styles['box-hidden']]: boxHidden,
      })}
      onMouseEnter={() => {
        isMainEnter.current = true
      }}
      onMouseLeave={() => {
        isMainEnter.current = false
      }}
    />
  )
}

export interface AIPluginComponentProps {
  toOpenAiChat?: (v: string, params?: YakParamProps[]) => void
  onReady?: () => void
}

export function AIPluginComponent(props: AIPluginComponentProps) {
  const { toOpenAiChat, onReady } = props
  const { t, i18n } = useI18nNamespaces(['webFuzzer'])
  const [loading, setLoading] = useState<boolean>(false)
  const [dataSource, setDataSource] = useState<{ key: string; value: string; params?: YakParamProps[] }[]>([])
  useEffect(() => {
    getData()
  }, [])

  const getData = useMemoizedFn(() => {
    setLoading(true)
    queryYakScriptList(
      'codec',
      (i: YakScript[], total) => {
        if (!total || total === 0) {
          return
        }

        const data = i
          .filter((script) => script.Tags.includes('AI工具'))
          .map((script) => {
            return {
              key: script.ScriptName,
              value: script.ScriptName,
              params: script.Params,
            }
          })

        setDataSource(
          data.length > 0
            ? data
            : [
                {
                  key: 'aiplugin-Get*plug-in',
                  value: t('AIPluginComponent.getPlugin'),
                },
              ],
        )
      },
      () => {
        setLoading(false)
        onReady?.()
      },
      10,
      undefined,
      undefined,
      undefined,
      undefined,
      [PluginSwitchToTag.PluginCodecContextMenuExecuteSwitch],
    )
  })

  return (
    <YakitSpin size="small" spinning={loading} wrapperClassName={styles['ai-plugin-list-spin']}>
      <div className={styles['ai-plugin-box']}>
        {dataSource.map((item) => (
          <div
            className={styles['ai-plugin-item']}
            key={item.key}
            onClick={() => toOpenAiChat && toOpenAiChat(item.key, item.params)}
          >
            <div className={styles['title']} title={item.value}>
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </YakitSpin>
  )
}

interface DecodeCopyReplaceProps {
  item: AutoDecodeResult
  // 是否显示边框
  isShowBorder: boolean
  index?: number
  // 是否仅可读
  isReadOnly?: boolean
  replace?: (v: string) => void
}

export const DecodeCopyReplace: React.FC<DecodeCopyReplaceProps> = (props) => {
  const { item, index, isShowBorder, isReadOnly, replace } = props
  const { t, i18n } = useI18nNamespaces(['yakitUi'])
  const itemStr: string = Buffer.from(item.Result).toString('utf8')
  return (
    <div className={styles['decode-copy-replace']}>
      <div
        className={classNames(styles['header'], {
          [styles['header-solid']]: isShowBorder,
        })}
      >
        <div className={styles['header-info']}>
          {!isShowBorder && <div className={styles['title']}>Step [{index}]</div>}
          <div className={styles['sub-title']}>{item.TypeVerbose}</div>
        </div>
        <div className={styles['header-opt']}>
          <div
            className={styles['yakit-copy']}
            onClick={() => {
              setClipboardText(itemStr)
            }}
          >
            <DocumentDuplicateOutlined size={16} className={styles['document-duplicate-svg-icon']} />
          </div>
          {!isReadOnly && (
            <YakitButton
              size="small"
              onClick={() => {
                replace && replace(itemStr)
              }}
            >
              {t('YakitButton.replace')}
            </YakitButton>
          )}
        </div>
      </div>
      <div
        className={classNames(styles['content'], {
          [styles['content-solid']]: isShowBorder,
        })}
      >
        {itemStr}
      </div>
    </div>
  )
}

export interface DecodeComponentProps {
  isReadOnly?: boolean
  rangeValue: string
  replace?: (v: string) => void
  /** 解码状态已经写入，浮层可以按最终高度显示 */
  onReady?: () => void
}

export const DecodeComponent: React.FC<DecodeComponentProps> = (props) => {
  const { isReadOnly, rangeValue, replace, onReady } = props
  const { t, i18n } = useI18nNamespaces(['webFuzzer'])
  const [status, setStatus] = useState<'none' | 'only' | 'many'>()
  const [result, setResult] = useState<AutoDecodeResult[]>([])
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady
  useEffect(() => {
    let cancelled = false
    const ready = () => {
      if (!cancelled) onReadyRef.current?.()
    }
    try {
      if (!rangeValue) {
        setStatus('none')
        ready()
        return
      }
      ipcRenderer
        .invoke('AutoDecode', { Data: rangeValue })
        .then((e: { Results: AutoDecodeResult[] }) => {
          if (cancelled) return
          // console.log("Results", e.Results)
          const { Results } = e
          const successArr: AutoDecodeResult[] = []
          const failArr: AutoDecodeResult[] = []
          Results.map((item) => {
            if (item.Type === 'No') {
              failArr.push(item)
            } else {
              successArr.push(item)
            }
          })
          setResult(successArr)
          if (successArr.length === 0) {
            setStatus('none')
          } else if (successArr.length === 1) {
            setStatus('only')
          } else {
            setStatus('many')
          }
        })
        .catch(() => {
          if (!cancelled) setStatus('none')
        })
        .finally(ready)
    } catch (e) {
      failed('editor exec auto-decode failed')
      ready()
    }
    return () => {
      cancelled = true
    }
  }, [rangeValue])

  return (
    <div className={styles['decode-box']}>
      {isReadOnly && <div className={styles['title']}>{t('DecodeComponent.smartDecode')}</div>}
      {status === 'only' && (
        <div className={styles['only-one']}>
          <DecodeCopyReplace isReadOnly={isReadOnly} item={result[0]} isShowBorder={true} replace={replace} />
        </div>
      )}
      {status === 'many' && (
        <div className={styles['timeline-box']}>
          <Timeline
            items={result.map((item, index) => {
              return {
                className: styles['timeline-item'],
                children: (
                  <DecodeCopyReplace
                    item={item}
                    index={index + 1}
                    isShowBorder={false}
                    replace={replace}
                    isReadOnly={isReadOnly}
                  />
                ),
                dot: <TerminalSolid className={styles['solid-terminal-icon']} color="currentColor" />,
              }
            })}
          />
        </div>
      )}
      {status === 'none' && <div className={styles['none-decode']}>{t('DecodeComponent.noDecodeInfo')}</div>}
    </div>
  )
}

/** 智能解码浮层：相对选区弹出，位置和拖拽都限制在挂载编辑器内。挂到 body 是为了不被编辑器 overflow 裁切 */
export interface SmartDecodeFloatPanelProps {
  rangeValue: string
  replace?: (v: string) => void
  editorInfo?: EditorDetailInfoProps
  anchorRect?: SmartDecodeAnchorRect
  /** 挂载这次浮层的编辑器根节点 */
  hostEl?: HTMLElement | null
  onClose: () => void
}
export const SmartDecodeFloatPanel: React.FC<SmartDecodeFloatPanelProps> = (props) => {
  const { rangeValue, replace, editorInfo, anchorRect, hostEl, onClose } = props
  const nodeRef = useRef<HTMLDivElement>(null)
  const draggedRef = useRef(false)
  const placedRef = useRef('')
  const [contentReady, setContentReady] = useState(false)
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({
    position: 'fixed',
    visibility: 'hidden',
    marginTop: 0,
  })
  const [dragBounds, setDragBounds] = useState({ left: 0, top: 0, bottom: 0, right: 0 })
  const menuHeight = getMenuPanelStyle(editorInfo).maxHeight as number

  const readHostRect = useMemoizedFn(() => {
    if (hostEl) {
      const rect = hostEl.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) return rect
    }
    if (!editorInfo) return null
    const width = editorInfo.right - editorInfo.left
    const height = editorInfo.bottom - editorInfo.top
    if (width <= 0 || height <= 0) return null
    return {
      left: editorInfo.left,
      top: editorInfo.top,
      right: editorInfo.right,
      bottom: editorInfo.bottom,
      width,
      height,
    }
  })

  const fitInHost = useMemoizedFn(() => {
    if (draggedRef.current) return
    const panel = nodeRef.current
    const anchor = anchorRect
    const hostRect = readHostRect()
    if (!panel || !anchor || !hostRect) return

    // 默认 360，编辑器更窄时再缩小，用光标所在一侧的空白而不是固定半高
    let width = Math.min(360, hostRect.width)
    let maxHeight = Math.min(menuHeight > 0 ? menuHeight : hostRect.height, hostRect.height)
    panel.style.position = 'fixed'
    panel.style.marginTop = '0px'
    panel.style.width = `${width}px`
    panel.style.maxHeight = `${maxHeight}px`
    let panelWidth = panel.offsetWidth
    let panelHeight = panel.offsetHeight
    if (panelWidth > hostRect.width) {
      width = Math.max(0, width - (panelWidth - hostRect.width))
      panel.style.width = `${width}px`
      panelWidth = panel.offsetWidth
    }
    if (panelHeight > hostRect.height) {
      maxHeight = Math.max(0, maxHeight - (panelHeight - hostRect.height))
      panel.style.maxHeight = `${maxHeight}px`
      panelHeight = panel.offsetHeight
    }

    const directionX = editorInfo?.direction?.x
    const alignRight = directionX === 'middle' || directionX === 'right'
    let nextLeft = alignRight ? anchor.right - panelWidth : anchor.left
    const gap = 6
    let nextTop = editorInfo?.direction?.y === 'bottom' ? anchor.top - gap - panelHeight : anchor.bottom + gap

    if (nextLeft < hostRect.left) nextLeft = hostRect.left
    if (nextLeft + panelWidth > hostRect.right) nextLeft = Math.max(hostRect.left, hostRect.right - panelWidth)
    if (nextTop < hostRect.top) nextTop = hostRect.top
    if (nextTop + panelHeight > hostRect.bottom) nextTop = Math.max(hostRect.top, hostRect.bottom - panelHeight)

    const signature = `${nextLeft}|${nextTop}|${width}|${maxHeight}`
    if (placedRef.current === signature) return
    placedRef.current = signature
    setPanelStyle({
      position: 'fixed',
      left: nextLeft,
      top: nextTop,
      width,
      maxHeight,
      marginTop: 0,
      visibility: 'visible',
    })
    setDragBounds({
      left: hostRect.left - nextLeft,
      right: hostRect.right - nextLeft - panelWidth,
      top: hostRect.top - nextTop,
      bottom: hostRect.bottom - nextTop - panelHeight,
    })
  })

  useLayoutEffect(() => {
    if (!contentReady) return
    fitInHost()
  }, [contentReady, anchorRect, hostEl, menuHeight, editorInfo])

  const onDragStart = useMemoizedFn((_e: any, uiData: { x: number; y: number }) => {
    draggedRef.current = true
    const hostRect = readHostRect()
    const panelRect = nodeRef.current?.getBoundingClientRect()
    if (!hostRect || !panelRect) return
    setDragBounds({
      left: hostRect.left - panelRect.left + uiData.x,
      right: hostRect.right - panelRect.right + uiData.x,
      top: hostRect.top - panelRect.top + uiData.y,
      bottom: hostRect.bottom - panelRect.bottom + uiData.y,
    })
  })

  return createPortal(
    <ReactDraggable
      nodeRef={nodeRef}
      handle={`.${styles['menu-drag']}`}
      cancel="button"
      bounds={dragBounds}
      onStart={onDragStart}
    >
      <div
        ref={nodeRef}
        className={classNames(styles['http-fuzzer-range-editor-menu'], styles['smart-decode-float-layer'])}
        style={panelStyle}
      >
        <div className={styles['menu-drag']}>
          <YakitButton type="text2" size="small" icon={<XOutlined color="currentColor" />} onClick={onClose} />
        </div>
        <div className={styles['menu-content']}>
          <DecodeComponent
            rangeValue={rangeValue}
            onReady={() => setContentReady(true)}
            replace={(v) => {
              replace?.(v)
              onClose()
            }}
          />
        </div>
      </div>
    </ReactDraggable>,
    document.body,
  )
}

export interface HTTPFuzzerRangeEditorMenuProps {
  close: () => void
  editorInfo?: EditorDetailInfoProps
  insert: (v: any) => void
  rangeValue: string
  replace?: (v: string) => void
  hTTPFuzzerClickEditorMenuProps?: HTTPFuzzerClickEditorMenuProps
  fizzRangeTimeoutId?: any
  onOpenSmartDecode?: (rangeValue: string, anchorRect?: DOMRect) => void
  toOpenAiChat?: AIPluginComponentProps['toOpenAiChat']
  /** 不传则是插入标签、AI工具、编码、解码、智能解码 */
  menuGroups?: FuzzerEditorMenuGroup[]
}
export const buildRangeCodecMenuItems = (
  t: (key: string) => string,
  options: {
    insert: (v: any) => void
    rangeValue: string
    onOpenSmartDecode?: (rangeValue: string, anchorRect?: DOMRect) => void
  },
): FuzzerEditorMenuItem[] => [
  {
    id: 'encode',
    label: t('HTTPFuzzerRangeEditorMenu.encode'),
    icon: <IconSolidCodeIcon className={styles['tag']} />,
    className: styles['encode-box'],
    panelClassName: styles['http-fuzzer-range-editor-menu'],
    renderPanel: () => (
      <div className={styles['menu-content']}>
        <CodecMenuList actions={ENCODE_MENU_ACTIONS} insert={options.insert} className={styles['encode-box']} />
      </div>
    ),
  },
  {
    id: 'decode',
    label: t('HTTPFuzzerRangeEditorMenu.decode'),
    icon: <IconSolidSparklesIcon />,
    className: styles['decodeLabel-box'],
    panelClassName: styles['http-fuzzer-range-editor-menu'],
    renderPanel: () => (
      <div className={styles['menu-content']}>
        <CodecMenuList actions={DECODE_MENU_ACTIONS} insert={options.insert} className={styles['decodeLabel-box']} />
      </div>
    ),
  },
  {
    id: 'smart-decode',
    label: t('HTTPFuzzerRangeEditorMenu.smartDecode'),
    icon: <IconSolidSparklesIcon />,
    className: styles['decode-box'],
    onClick: (e) => {
      const button = e.currentTarget.getBoundingClientRect()
      const bar = e.currentTarget.closest('[data-menu-bar]')?.getBoundingClientRect()
      const top = bar?.top ?? button.top
      const bottom = bar?.bottom ?? button.bottom
      options.onOpenSmartDecode?.(options.rangeValue, new DOMRect(button.left, top, button.width, bottom - top))
    },
  },
]

export const HTTPFuzzerRangeEditorMenu: React.FC<HTTPFuzzerRangeEditorMenuProps> = (props) => {
  const {
    close,
    editorInfo,
    insert,
    rangeValue,
    hTTPFuzzerClickEditorMenuProps,
    fizzRangeTimeoutId,
    onOpenSmartDecode,
    toOpenAiChat,
    menuGroups,
  } = props
  const { t, i18n } = useI18nNamespaces(['webFuzzer'])
  const [boxHidden, setBoxHidden] = useState<boolean>(true)

  const closeTimeoutFun = useMemoizedFn(() => {
    const closeTimeoutId = setTimeout(() => {
      close()
    }, 5 * 1000)
    return closeTimeoutId
  })

  useEffect(() => {
    fizzRangeTimeoutId.current = undefined
    fizzRangeTimeoutId.current = closeTimeoutFun()
    setTimeout(() => {
      setBoxHidden(false)
    }, 300)
  }, [])

  const clickItems = hTTPFuzzerClickEditorMenuProps
    ? buildClickEditorMenuItems(t, {
        editorInfo: hTTPFuzzerClickEditorMenuProps.editorInfo ?? editorInfo,
        insert: hTTPFuzzerClickEditorMenuProps.insert,
        addLabel: hTTPFuzzerClickEditorMenuProps.addLabel,
        toOpenAiChat,
      })
    : []
  const groups: FuzzerEditorMenuGroup[] = menuGroups ?? [
    ...(clickItems.length
      ? [
          {
            id: 'click',
            className: styles['http-fuzzer-click-editor'],
            simpleClassName: classNames(
              styles['http-fuzzer-click-editor-simple'],
              styles['range-click-editor-menu'],
              hTTPFuzzerClickEditorMenuProps?.className,
            ),
            items: clickItems,
          },
        ]
      : []),
    {
      id: 'codec',
      className: styles['http-fuzzer-range-editor'],
      simpleClassName: styles['http-fuzzer-range-editor-simple'],
      leadingDivider: true,
      items: buildRangeCodecMenuItems(t, { insert, rangeValue, onOpenSmartDecode }),
    },
  ]

  return (
    <FuzzerEditorMenuBar
      groups={groups}
      editorInfo={editorInfo}
      lang={i18n.language}
      className={classNames(styles['http-fuzzer-range-editor-body'], {
        [styles['box-hidden']]: boxHidden,
      })}
      onMouseEnter={() => {
        fizzRangeTimeoutId.current && clearTimeout(fizzRangeTimeoutId.current)
      }}
      onMouseLeave={() => {
        fizzRangeTimeoutId.current = undefined
        fizzRangeTimeoutId.current = closeTimeoutFun()
      }}
    />
  )
}

interface HTTPFuzzerRangeReadOnlyEditorMenuProps {
  editorInfo?: EditorDetailInfoProps
  rangeValue: string
  fizzRangeTimeoutId?: any
  close: () => void
  // 外部接管解码后的操作 现用于history编解码呼出
  execAutoDecodeCallback?: () => void
}

export const HTTPFuzzerRangeReadOnlyEditorMenu: React.FC<HTTPFuzzerRangeReadOnlyEditorMenuProps> = (props) => {
  const { editorInfo, rangeValue, fizzRangeTimeoutId, close, execAutoDecodeCallback } = props
  const { t, i18n } = useI18nNamespaces(['webFuzzer'])
  const [segmentedType, setSegmentedType] = useState<'decode'>()
  const readOnlyPanelStyle = getMenuPanelStyle(editorInfo)

  const [boxHidden, setBoxHidden] = useState<boolean>(true)
  // 0.3秒后显示
  useEffect(() => {
    fizzRangeTimeoutId.current = undefined
    fizzRangeTimeoutId.current = closeTimeoutFun()
    setTimeout(() => {
      setBoxHidden(false)
    }, 300)
  }, [])
  // 5秒无操作自动关闭
  const closeTimeoutFun = useMemoizedFn(() => {
    const closeTimeoutId = setTimeout(() => {
      close()
    }, 5 * 1000)
    // 返回timeoutId，以便稍后取消
    return closeTimeoutId
  })

  return (
    <div
      className={classNames(styles['http-fuzzer-read-editor'], {
        [styles['box-hidden']]: boxHidden,
      })}
      style={{ width: i18n.language.startsWith('zh') ? 68 : 85 }}
      onMouseEnter={() => {
        fizzRangeTimeoutId.current && clearTimeout(fizzRangeTimeoutId.current)
      }}
      onMouseLeave={() => {
        fizzRangeTimeoutId.current = undefined
        fizzRangeTimeoutId.current = closeTimeoutFun()
      }}
    >
      <div className={styles['http-fuzzer-read-editor-simple']}>
        <div className={styles['show-box']}>
          <div
            className={styles['decode-box']}
            onClick={() => (execAutoDecodeCallback ? execAutoDecodeCallback() : execAutoDecode(rangeValue))}
          >
            <IconSolidSparklesIcon className={styles['']} />
            <div className={styles['content']}>{t('HTTPFuzzerRangeReadOnlyEditorMenu.decode')}</div>
          </div>
        </div>
      </div>
      {segmentedType && (
        <div
          style={readOnlyPanelStyle}
          className={classNames(styles['http-fuzzer-range-read-only-editor-menu'])}
          onMouseLeave={() => setSegmentedType(undefined)}
        >
          <DecodeComponent rangeValue={rangeValue} isReadOnly={true} />
        </div>
      )}
    </div>
  )
}
