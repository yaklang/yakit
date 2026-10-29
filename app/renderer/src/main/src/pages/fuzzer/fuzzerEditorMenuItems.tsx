import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Avatar, Timeline } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import classNames from 'classnames'
import { useMemoizedFn } from 'ahooks'
import { DragDropContext, Draggable, Droppable, type DraggingStyle } from '@hello-pangea/dnd'
import ReactDraggable from 'react-draggable'
import {
  DocumentDuplicateOutlined,
  PencilAltOutlined,
  TrashOutlined,
  XOutlined,
} from '@yakit-libs/yakit-ui-icons/outline'
import { DragSortSolid, TerminalSolid } from '@yakit-libs/yakit-ui-icons/solid'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { defaultLabel } from '@/defaultConstants/HTTPFuzzerPage'
import { setClipboardText } from '@/utils/clipboard'
import { type AutoDecodeResult } from '@/utils/encodec'
import { setRemoteValue } from '@/utils/kv'
import { failed } from '@/utils/notification'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import type { YakScript } from '../invoker/schema'
import { PluginSwitchToTag } from '../pluginEditor/defaultconstants'
import type { YakParamProps } from '../plugins/pluginsType'
import { queryYakScriptList } from '../yakitStore/network'
import type { QueryFuzzerLabelResponseProps } from './StringFuzzer'
import {
  clampTopBesideAnchor,
  getMenuPanelStyle,
  MENU_PANEL_GAP,
  pickVerticalHeightBudget,
  readEditorHostBox,
  verticalRoomsBesideAnchor,
  type EditorDetailInfoProps,
} from './fuzzerEditorMenuLayout'
import styles from './HTTPFuzzerEditorMenu.module.scss'

export const FUZZER_LABEL_LIST_NUMBER = 'fuzzer-label-list-number'

const { ipcRenderer } = window.require('electron')

const getItemStyle = (isDragging: boolean, draggableStyle) => {
  let transform: string = draggableStyle?.transform || ''
  if (isDragging) {
    const match = transform.match(/translate\((-?\d+)px, (-?\d+)px\)/)
    if (match) {
      const value2 = Number(match[2])
      transform = transform.replace(/translate\((-?\d+)px, (-?\d+)px\)/, `translate(0px, ${value2}px)`)
    }
  }
  return {
    ...draggableStyle,
    transform,
  }
}

/** overflowingContentWidgets 用视口坐标；dnd 的 top/left 已是视口值，勿再减 editorInfo/60 */
export const getInsertTagDragPosition = (
  isDragging: boolean,
  style?: Pick<DraggingStyle, 'top' | 'left'> | null,
): { top: number | 'none'; left: number | 'none' } => {
  if (!isDragging || !style) return { top: 'none', left: 'none' }
  return {
    top: typeof style.top === 'number' ? style.top : 'none',
    left: typeof style.left === 'number' ? style.left : 'none',
  }
}

interface InsertTagPanelProps {
  editorInfo?: EditorDetailInfoProps
  insert: (v: QueryFuzzerLabelResponseProps) => void
  addLabel: () => void
  maxWidth: number
  /** 第一次拉到标签后再显示，避免空列表面板先在下面、变高后又翻到上面 */
  onReady?: () => void
  /** 列表拖拽时通知外层暂停菜单自动关闭 */
  onDraggingChange?: (dragging: boolean) => void
}

/** 插入标签面板。列表来自标签数据，增删改和排序都走原来的接口。 */
export const InsertTagPanel = (props: InsertTagPanelProps) => {
  const { insert, addLabel, maxWidth, onReady, onDraggingChange } = props
  const { t } = useI18nNamespaces(['webFuzzer', 'yakitUi'])
  const showPanelCount = maxWidth >= 220
  const showPanelSubTitle = maxWidth > 250
  const [labelData, setLabelData] = useState<QueryFuzzerLabelResponseProps[]>([])
  const [selectLabel, setSelectLabel] = useState<string>()
  const [inputValue, setInputValue] = useState<string>()
  const isDragging = useRef(false)
  const listRef = useRef<HTMLDivElement | null>(null)
  const panelElRef = useRef<HTMLElement | null>(null)

  const setPanelDragging = useMemoizedFn((dragging: boolean) => {
    isDragging.current = dragging
    onDraggingChange?.(dragging)
    if (dragging) {
      const panel = listRef.current?.closest('[data-menu-panel]') as HTMLElement | null
      if (panel) {
        panelElRef.current = panel
        panel.setAttribute('data-menu-panel-dragging', '')
      }
      return
    }
    const panel = panelElRef.current || (listRef.current?.closest('[data-menu-panel]') as HTMLElement | null)
    panel?.removeAttribute('data-menu-panel-dragging')
    panelElRef.current = null
  })

  const getData = useMemoizedFn((opts?: { isActive?: () => boolean }) => {
    return ipcRenderer.invoke('QueryFuzzerLabel').then((data: { Data: QueryFuzzerLabelResponseProps[] }) => {
      if (opts?.isActive && !opts.isActive()) return
      const { Data } = data
      if (Array.isArray(Data) && Data.length > 0) {
        const defaultMap = new Map(defaultLabel.map((item) => [item.DefaultDescription, item.DescriptionUi]))
        setLabelData(
          Data.map((item) => ({
            ...item,
            DescriptionUi: defaultMap.get(item.DefaultDescription) || '',
          })),
        )
        setSelectLabel(undefined)
      }
    })
  })

  useEffect(() => {
    let active = true
    getData({ isActive: () => active }).finally(() => {
      if (active) onReady?.()
    })
    return () => {
      active = false
      // 仅在确实拖过时通知外层，避免切到 AI 面板时误开自动关闭倒计时
      if (isDragging.current) setPanelDragging(false)
    }
  }, [])

  const insertLabel = (item: QueryFuzzerLabelResponseProps) => {
    if (selectLabel === item.Hash) {
      setSelectLabel(undefined)
      return
    }
    insert(item)
  }

  const delLabel = (hash: string) => {
    ipcRenderer.invoke('DeleteFuzzerLabel', { Hash: hash }).then(() => {
      getData()
    })
  }

  const reset = () => {
    ipcRenderer.invoke('DeleteFuzzerLabel', {}).then(() => {
      setRemoteValue(FUZZER_LABEL_LIST_NUMBER, JSON.stringify({ number: defaultLabel.length }))
      ipcRenderer
        .invoke('SaveFuzzerLabel', {
          Data: defaultLabel,
        })
        .then(() => {
          getData()
        })
    })
  }

  const onDragEnd = (result) => {
    setPanelDragging(false)
    if (!result.destination) return
    const newItems = Array.from(labelData)
    const [reorderedItem] = newItems.splice(result.source.index, 1)
    newItems.splice(result.destination.index, 0, reorderedItem)
    setLabelData(newItems)
    ipcRenderer.invoke('DeleteFuzzerLabel', {}).then(() => {
      setRemoteValue(FUZZER_LABEL_LIST_NUMBER, JSON.stringify({ number: newItems.length }))
      ipcRenderer.invoke('SaveFuzzerLabel', {
        Data: [...newItems].reverse(),
      })
    })
  }

  return (
    <>
      <div className={styles['menu-header']}>
        <div className={styles['menu-header-left']} title={t('HTTPFuzzerClickEditorMenu.commonTags')}>
          {t('HTTPFuzzerClickEditorMenu.commonTags')}
          {showPanelCount && <span className={styles['menu-header-left-count']}>{labelData.length || ''}</span>}
        </div>
        <div className={styles['menu-header-opt']}>
          <YakitButton style={{ paddingLeft: 2, paddingRight: 2 }} type="text" onClick={() => addLabel()}>
            {t('YakitButton.add')} <PlusOutlined className={styles['add-icon']} />
          </YakitButton>
          <div className={styles['line']}></div>
          <YakitButton
            type="text2"
            style={{ color: 'var(--Colors-Use-Neutral-Text-3-Secondary)' }}
            onClick={() => reset()}
          >
            {t('YakitButton.restore')}
          </YakitButton>
        </div>
      </div>
      <div className={styles['menu-list']}>
        <DragDropContext
          onDragEnd={onDragEnd}
          onBeforeDragStart={() => {
            setPanelDragging(true)
          }}
        >
          <Droppable droppableId="droppable-editor">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={(el) => {
                  listRef.current = el
                  provided.innerRef(el)
                }}
              >
                {labelData.map((item, index) => (
                  <Draggable key={item.Hash || String(item.Id)} draggableId={`${item.Id}`} index={index}>
                    {(dragProvided, snapshot) => {
                      const draggablePropsStyle = dragProvided.draggableProps.style as DraggingStyle
                      return (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                          style={{
                            ...draggablePropsStyle,
                            ...getItemStyle(snapshot.isDragging, dragProvided.draggableProps.style),
                            ...getInsertTagDragPosition(isDragging.current, draggablePropsStyle),
                          }}
                        >
                          <div
                            className={classNames(styles['menu-list-item'], {
                              [styles['menu-list-item-drag']]: snapshot.isDragging,
                            })}
                            onClick={() => insertLabel(item)}
                          >
                            <div className={styles['menu-list-item-info']} style={{ overflow: 'hidden' }}>
                              <DragSortSolid size={12} className={styles['drag-sort-icon']} />
                              {selectLabel === item.Hash ? (
                                <YakitInput
                                  defaultValue={item.Description}
                                  className={styles['input']}
                                  size="small"
                                  onChange={(e) => {
                                    setInputValue(e.target.value)
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                  }}
                                />
                              ) : (
                                <>
                                  <div className={styles['title']} title={t(item.DescriptionUi || item.Description)}>
                                    {t(item.DescriptionUi || item.Description)}
                                  </div>
                                  {showPanelSubTitle && (
                                    <div
                                      className={classNames(styles['sub-title'], {
                                        [styles['sub-title-left']]: !!item.Description,
                                      })}
                                      title={item.Label}
                                    >
                                      {item.Label}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                            <div className={styles['menu-list-item-opt']}>
                              {selectLabel === item.Hash ? (
                                <YakitButton
                                  type="text"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (!inputValue) return
                                    ipcRenderer
                                      .invoke('SaveFuzzerLabel', {
                                        Data: [{ ...item, Description: inputValue }],
                                      })
                                      .then(() => {
                                        getData()
                                      })
                                  }}
                                >
                                  {t('YakitButton.confirm')}
                                </YakitButton>
                              ) : (
                                !item.DefaultDescription.endsWith('-fixed') && (
                                  <>
                                    <PencilAltOutlined
                                      size={16}
                                      className={classNames(styles['form-outlined'])}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setSelectLabel(item.Hash)
                                        setInputValue(item.Description)
                                      }}
                                    />
                                    <TrashOutlined
                                      size={16}
                                      className={classNames(styles['trash-icon'])}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        delLabel(item.Hash)
                                      }}
                                    />
                                  </>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    }}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </>
  )
}

export interface AIPluginComponentProps {
  toOpenAiChat?: (v: string, params?: YakParamProps[]) => void
  onReady?: () => void
}

export function AIPluginComponent(props: AIPluginComponentProps) {
  const { toOpenAiChat, onReady } = props
  const { t } = useI18nNamespaces(['webFuzzer'])
  const [loading, setLoading] = useState<boolean>(false)
  const [dataSource, setDataSource] = useState<{ key: string; value: string; params?: YakParamProps[] }[]>([])
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    queryYakScriptList(
      'codec',
      (i: YakScript[], total) => {
        if (cancelled) return
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
        if (cancelled) return
        setLoading(false)
        onReadyRef.current?.()
      },
      10,
      undefined,
      undefined,
      undefined,
      undefined,
      [PluginSwitchToTag.PluginCodecContextMenuExecuteSwitch],
    )
    return () => {
      cancelled = true
    }
  }, [])

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

export interface CodecMenuAction {
  key: string
  titleKey: string
  subTitle: string
  avatar: string
  color: string
  apply: (text: string) => string
}

/** 编码面板里的动作。改这里就能增减编码项。 */
export const ENCODE_MENU_ACTIONS: CodecMenuAction[] = [
  {
    key: 'md5',
    titleKey: 'EncodeComponent.md5Encode',
    subTitle: 'md5',
    avatar: 'm',
    color: 'rgba(136, 99, 247, 0.6)',
    apply: (v) => `{{md5(${v})}}`,
  },
  {
    key: 'base64enc',
    titleKey: 'EncodeComponent.base64Encode',
    subTitle: 'base64enc',
    avatar: 'b',
    color: 'rgba(74, 148, 248, 0.6)',
    apply: (v) => `{{base64enc(${v})}}`,
  },
  {
    key: 'url-base64',
    titleKey: 'EncodeComponent.base64ThenUrlEncode',
    subTitle: '{{urlenc(base64enc(xxx))}}',
    avatar: 'b',
    color: 'rgba(74, 148, 248, 0.6)',
    apply: (v) => `{{urlenc(base64enc(${v}))}}`,
  },
  {
    key: 'hexenc',
    titleKey: 'EncodeComponent.hexEncode',
    subTitle: 'hexenc',
    avatar: 'h',
    color: 'rgba(86, 201, 145, 0.6)',
    apply: (v) => `{{hexenc(${v})}}`,
  },
  {
    key: 'htmlenc',
    titleKey: 'EncodeComponent.htmlEncode',
    subTitle: 'htmlenc',
    avatar: 'h',
    color: 'rgba(244, 115, 107, 0.6)',
    apply: (v) => `{{htmlenc(${v})}}`,
  },
  {
    key: 'urlenc',
    titleKey: 'EncodeComponent.urlEncode',
    subTitle: 'urlenc',
    avatar: 'u',
    color: 'rgba(255, 182, 96, 0.6)',
    apply: (v) => `{{urlenc(${v})}}`,
  },
  {
    key: 'urlescape',
    titleKey: 'EncodeComponent.urlEncodeSpecial',
    subTitle: 'urlescape',
    avatar: 'u',
    color: 'rgba(218, 95, 221, 0.6)',
    apply: (v) => `{{urlescape(${v})}}`,
  },
]

/** 解码面板里的动作。改这里就能增减解码项。 */
export const DECODE_MENU_ACTIONS: CodecMenuAction[] = [
  {
    key: 'base64dec',
    titleKey: 'DecodeLableComponent.base64Decode',
    subTitle: 'base64dec',
    avatar: 'b',
    color: 'rgba(136, 99, 247, 0.6)',
    apply: (v) => `{{base64dec(${v})}}`,
  },
  {
    key: 'doubleurldec',
    titleKey: 'DecodeLableComponent.doubleUrlDecode',
    subTitle: 'doubleurldec',
    avatar: 'd',
    color: 'rgba(74, 148, 248, 0.6)',
    apply: (v) => `{{doubleurldec(${v})}}`,
  },
  {
    key: 'hexdec',
    titleKey: 'DecodeLableComponent.hexDecode',
    subTitle: 'hexdec',
    avatar: 'h',
    color: 'rgba(74, 148, 248, 0.6)',
    apply: (v) => `{{hexdec(${v})}}`,
  },
  {
    key: 'htmldec',
    titleKey: 'DecodeLableComponent.htmlDecode',
    subTitle: 'htmldec',
    avatar: 'h',
    color: 'rgba(86, 201, 145, 0.6)',
    apply: (v) => `{{htmldec(${v})}}`,
  },
  {
    key: 'urldec',
    titleKey: 'DecodeLableComponent.urlForceDecode',
    subTitle: 'urldec',
    avatar: 'u',
    color: 'rgba(244, 115, 107, 0.6)',
    apply: (v) => `{{urldec(${v})}}`,
  },
  {
    key: 'unicode-decode',
    titleKey: 'DecodeLableComponent.unicodeChineseDecode',
    subTitle: 'unicode:decode',
    avatar: 'u',
    color: 'rgba(255, 182, 96, 0.6)',
    apply: (v) => `{{unicode:decode(${v})}}`,
  },
]

interface CodecMenuListProps {
  actions: CodecMenuAction[]
  insert: (apply: CodecMenuAction['apply']) => void
  className: string
}

export const CodecMenuList = (props: CodecMenuListProps) => {
  const { actions, insert, className } = props
  const { t } = useI18nNamespaces(['webFuzzer'])
  return (
    <div className={className}>
      {actions.map((item) => (
        <div key={item.key} className={styles['encode-item']} onClick={() => insert(item.apply)}>
          <Avatar size={16} style={{ color: 'rgba(49, 52, 63, 1)', backgroundColor: item.color, flexShrink: 0 }}>
            {item.avatar}
          </Avatar>
          <div className={styles['title']} title={t(item.titleKey)}>
            {t(item.titleKey)}
          </div>
          <div className={styles['sub-title']}>{item.subTitle}</div>
        </div>
      ))}
    </div>
  )
}

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

interface DecodeCopyReplaceProps {
  item: AutoDecodeResult
  // 是否显示边框
  isShowBorder: boolean
  index?: number
  // 是否仅可读
  isReadOnly?: boolean
  replace?: (v: string) => void
}

export const DecodeCopyReplace = (props: DecodeCopyReplaceProps) => {
  const { item, index, isShowBorder, isReadOnly, replace } = props
  const { t } = useI18nNamespaces(['yakitUi'])
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

export const DecodeComponent = (props: DecodeComponentProps) => {
  const { isReadOnly, rangeValue, replace, onReady } = props
  const { t } = useI18nNamespaces(['webFuzzer'])
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
        setResult([])
        ready()
        return
      }
      ipcRenderer
        .invoke('AutoDecode', { Data: rangeValue })
        .then((e: { Results: AutoDecodeResult[] }) => {
          if (cancelled) return
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
  /** 编辑器根节点 ref，fitInHost / ResizeObserver 每次读 current */
  hostRef?: { current: HTMLElement | null }
  onClose: () => void
}
export const SmartDecodeFloatPanel = (props: SmartDecodeFloatPanelProps) => {
  const { rangeValue, replace, editorInfo, anchorRect, hostRef, onClose } = props
  const nodeRef = useRef<HTMLDivElement>(null)
  /** 本次拖拽会话（含 3px 内），立即挡住 fitInHost / RO 回弹 */
  const sessionDraggingRef = useRef(false)
  /** 拖过有意义距离后保持粘性，松手后也不再自动贴回锚点 */
  const draggedRef = useRef(false)
  const placedRef = useRef('')
  const dragPosRef = useRef({ x: 0, y: 0 })
  const dragOriginRef = useRef({ x: 0, y: 0 })
  const [contentReady, setContentReady] = useState(false)
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({
    position: 'fixed',
    visibility: 'hidden',
    marginTop: 0,
  })
  const [dragBounds, setDragBounds] = useState({ left: 0, top: 0, bottom: 0, right: 0 })
  /** 挂到编辑器宿主而非 body：切 tab 时宿主 display:none，浮层一起藏，不会盖住其他页 */
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null)
  const menuHeight = getMenuPanelStyle(editorInfo).maxHeight as number

  const resolveHostEl = useMemoizedFn(() => hostRef?.current ?? null)

  useLayoutEffect(() => {
    setPortalEl(resolveHostEl())
  }, [hostRef])

  const readHostRect = useMemoizedFn(() => {
    const host = resolveHostEl()
    if (host) {
      // 与下拉菜单同一套：排除 minimap / 滚动条占用
      const box = readEditorHostBox(host)
      const width = box.hostRight - box.hostLeft
      const height = box.hostBottom - box.hostTop
      if (width > 0 && height > 0) {
        return {
          left: box.hostLeft,
          top: box.hostTop,
          right: box.hostRight,
          bottom: box.hostBottom,
          width,
          height,
        }
      }
    }
    // host 量不到时退回 editorInfo（不含 minimap 修正）
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
    if (sessionDraggingRef.current || draggedRef.current) return
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
    if (nextLeft < hostRect.left) nextLeft = hostRect.left
    if (nextLeft + panelWidth > hostRect.right) nextLeft = Math.max(hostRect.left, hostRect.right - panelWidth)

    // 与下拉菜单共用 verticalRooms / pickVerticalHeightBudget / clampTopBesideAnchor
    const { spaceAbove, spaceBelow } = verticalRoomsBesideAnchor(
      hostRect.top,
      hostRect.bottom,
      anchor.top,
      anchor.bottom,
    )
    const { growUp, heightBudget } = pickVerticalHeightBudget(
      spaceAbove,
      spaceBelow,
      editorInfo?.direction?.y === 'bottom',
      panelHeight,
    )
    maxHeight = Math.min(maxHeight, heightBudget > 0 ? heightBudget : 0)
    panel.style.maxHeight = `${maxHeight}px`
    panelHeight = panel.offsetHeight

    const preferredTop = growUp ? anchor.top - MENU_PANEL_GAP - panelHeight : anchor.bottom + MENU_PANEL_GAP
    // 与 placeMenuPanel 一致：按锚点一侧夹紧，避免压住工具条
    const nextTop = clampTopBesideAnchor(
      preferredTop,
      panelHeight,
      growUp,
      hostRect.top,
      hostRect.bottom,
      anchor.top,
      anchor.bottom,
    )

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

  const updateDragBounds = useMemoizedFn(() => {
    const hostRect = readHostRect()
    const panelRect = nodeRef.current?.getBoundingClientRect()
    if (!hostRect || !panelRect) return
    const { x, y } = dragPosRef.current
    setDragBounds({
      left: hostRect.left - panelRect.left + x,
      right: hostRect.right - panelRect.right + x,
      top: hostRect.top - panelRect.top + y,
      bottom: hostRect.bottom - panelRect.bottom + y,
    })
  })

  /** 粘性拖拽后宿主缩小：先把宽高钳到 live host，再夹 fixed left/top，避免溢出与 dragBounds 倒置 */
  const clampStickyPanelIntoHost = useMemoizedFn(() => {
    const hostRect = readHostRect()
    const panel = nodeRef.current
    if (!hostRect || !panel) {
      updateDragBounds()
      return
    }
    const { x, y } = dragPosRef.current

    // 与 fitInHost 一致：先限制 width/maxHeight，再量真实尺寸，再夹位置
    let width = Math.min(360, hostRect.width)
    let maxHeight = Math.min(menuHeight > 0 ? menuHeight : hostRect.height, hostRect.height)
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

    const panelRect = panel.getBoundingClientRect()
    let visualLeft = panelRect.left
    let visualTop = panelRect.top
    if (visualLeft + panelWidth > hostRect.right) visualLeft = Math.max(hostRect.left, hostRect.right - panelWidth)
    if (visualLeft < hostRect.left) visualLeft = hostRect.left
    if (visualTop + panelHeight > hostRect.bottom) visualTop = Math.max(hostRect.top, hostRect.bottom - panelHeight)
    if (visualTop < hostRect.top) visualTop = hostRect.top
    // ReactDraggable 用 transform；CSS left/top = 可视位置 - 拖拽位移
    const nextLeft = visualLeft - x
    const nextTop = visualTop - y
    setPanelStyle((prev) => {
      if (prev.left === nextLeft && prev.top === nextTop && prev.width === width && prev.maxHeight === maxHeight) {
        return prev
      }
      return {
        ...prev,
        left: nextLeft,
        top: nextTop,
        width,
        maxHeight,
        visibility: 'visible' as const,
      }
    })
    setDragBounds({
      left: hostRect.left - visualLeft + x,
      right: hostRect.right - visualLeft - panelWidth + x,
      top: hostRect.top - visualTop + y,
      bottom: hostRect.bottom - visualTop - panelHeight + y,
    })
  })

  useLayoutEffect(() => {
    if (!contentReady) return
    // 会话拖拽中只更新 bounds，避免改 left/top 与 ReactDraggable transform 打架
    if (sessionDraggingRef.current) updateDragBounds()
    else if (draggedRef.current) clampStickyPanelIntoHost()
    else fitInHost()
  }, [contentReady, anchorRect, hostRef, menuHeight, editorInfo])

  useEffect(() => {
    if (!contentReady) return
    const host = resolveHostEl()
    if (!host || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => {
      if (sessionDraggingRef.current) updateDragBounds()
      else if (draggedRef.current) clampStickyPanelIntoHost()
      else fitInHost()
    })
    ro.observe(host)
    return () => ro.disconnect()
  }, [contentReady, hostRef])

  const onDragStart = useMemoizedFn((_e: any, uiData: { x: number; y: number }) => {
    sessionDraggingRef.current = true
    dragOriginRef.current = { x: uiData.x, y: uiData.y }
    dragPosRef.current = { x: uiData.x, y: uiData.y }
    updateDragBounds()
  })

  const onDrag = useMemoizedFn((_e: any, uiData: { x: number; y: number }) => {
    dragPosRef.current = { x: uiData.x, y: uiData.y }
    if (Math.abs(uiData.x - dragOriginRef.current.x) > 3 || Math.abs(uiData.y - dragOriginRef.current.y) > 3) {
      draggedRef.current = true
    }
  })

  const onDragStop = useMemoizedFn(() => {
    sessionDraggingRef.current = false
  })

  if (!portalEl) return null

  return createPortal(
    <ReactDraggable
      nodeRef={nodeRef}
      handle={`.${styles['menu-drag']}`}
      cancel="button"
      bounds={dragBounds}
      onStart={onDragStart}
      onDrag={onDrag}
      onStop={onDragStop}
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
    portalEl,
  )
}
