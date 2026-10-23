import { useEffect, useRef, useState } from 'react'
import classNames from 'classnames'
import { Avatar } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { PencilAltOutlined, TrashOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { DragSortSolid } from '@yakit-libs/yakit-ui-icons/solid'
import { DragDropContext, Draggable, Droppable, type DraggingStyle } from '@hello-pangea/dnd'
import { useMemoizedFn } from 'ahooks'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { defaultLabel } from '@/defaultConstants/HTTPFuzzerPage'
import { setRemoteValue } from '@/utils/kv'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import styles from './HTTPFuzzerEditorMenu.module.scss'
import type { QueryFuzzerLabelResponseProps } from './StringFuzzer'
import type { EditorDetailInfoProps } from './fuzzerEditorMenuLayout'

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

interface InsertTagPanelProps {
  editorInfo?: EditorDetailInfoProps
  insert: (v: QueryFuzzerLabelResponseProps) => void
  addLabel: () => void
  maxWidth: number
  /** 第一次拉到标签后再显示，避免空列表面板先在下面、变高后又翻到上面 */
  onReady?: () => void
}

/** 插入标签面板。列表来自标签数据，增删改和排序都走原来的接口。 */
export const InsertTagPanel = (props: InsertTagPanelProps) => {
  const { editorInfo, insert, addLabel, maxWidth, onReady } = props
  const { top = 0, left = 0, scrollTop = 0 } = editorInfo || {}
  const { t } = useI18nNamespaces(['webFuzzer', 'yakitUi'])
  const showPanelCount = maxWidth >= 220
  const showPanelSubTitle = maxWidth > 250
  const [labelData, setLabelData] = useState<QueryFuzzerLabelResponseProps[]>([])
  const [selectLabel, setSelectLabel] = useState<string>()
  const [inputValue, setInputValue] = useState<string>()
  const isDragging = useRef(false)

  const getData = useMemoizedFn(() => {
    return ipcRenderer.invoke('QueryFuzzerLabel').then((data: { Data: QueryFuzzerLabelResponseProps[] }) => {
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
    getData().finally(() => {
      if (active) onReady?.()
    })
    return () => {
      active = false
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
    isDragging.current = false
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
          <YakitButton type="text2" style={{ color: '#85899E' }} onClick={() => reset()}>
            {t('YakitButton.restore')}
          </YakitButton>
        </div>
      </div>
      <div className={styles['menu-list']}>
        <DragDropContext
          onDragEnd={onDragEnd}
          onBeforeDragStart={() => {
            isDragging.current = true
          }}
        >
          <Droppable droppableId="droppable-editor">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef}>
                {labelData.map((item, index) => (
                  <Draggable key={item?.Description} draggableId={`${item.Id}`} index={index}>
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
                            top:
                              isDragging.current && draggablePropsStyle?.top
                                ? draggablePropsStyle.top - top + scrollTop
                                : 'none',
                            left:
                              isDragging.current && draggablePropsStyle?.left
                                ? draggablePropsStyle.left - left - 60
                                : 'none',
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
                                      color="#85899E"
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
