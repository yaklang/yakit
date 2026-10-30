import type React from 'react'
import classNames from 'classnames'
import { IconSolidAIIcon } from '@yakit-libs/yakit-ui-icons/oldicon/IconSolidAIIcon'
import { IconSolidCodeIcon } from '@yakit-libs/yakit-ui-icons/oldicon/IconSolidCodeIcon'
import { IconSolidSparklesIcon } from '@yakit-libs/yakit-ui-icons/oldicon/IconSolidSparklesIcon'
import { IconSolidTagIcon } from '@yakit-libs/yakit-ui-icons/oldicon/IconSolidTagIcon'
import { execAutoDecode } from '@/utils/encodec'
import { useI18nNamespaces, type TFunction } from '@/i18n/useI18nNamespaces'
import type { QueryFuzzerLabelResponseProps } from './StringFuzzer'
import { type CountDirectionProps, type EditorDetailInfoProps } from './fuzzerEditorMenuLayout'
import {
  FuzzerEditorMenuBar,
  useFuzzerEditorMenuAutoClose,
  type FuzzerEditorMenuGroup,
  type FuzzerEditorMenuItem,
} from './fuzzerEditorMenuBar'
import {
  AIPluginComponent,
  type AIPluginComponentProps,
  CodecMenuList,
  type CodecMenuAction,
  DECODE_MENU_ACTIONS,
  ENCODE_MENU_ACTIONS,
  InsertTagPanel,
} from './fuzzerEditorMenuItems'
import styles from './HTTPFuzzerEditorMenu.module.scss'

export type { CountDirectionProps, EditorDetailInfoProps, FuzzerEditorMenuGroup, FuzzerEditorMenuItem }
export type {
  AIPluginComponentProps,
  DecodeComponentProps,
  SmartDecodeAnchorRect,
  SmartDecodeFloatPanelProps,
} from './fuzzerEditorMenuItems'
export {
  AIPluginComponent,
  DecodeComponent,
  DecodeCopyReplace,
  FUZZER_LABEL_LIST_NUMBER,
  SmartDecodeFloatPanel,
  snapshotRect,
} from './fuzzerEditorMenuItems'

export interface LabelDataProps {
  DefaultDescription: string
  Description?: string
  DescriptionUi?: string
  Label?: string
}

export interface HTTPFuzzerClickEditorMenuProps {
  close: () => void
  editorInfo?: EditorDetailInfoProps
  insert: (v: QueryFuzzerLabelResponseProps) => void
  addLabel: () => void
  className?: string
  // 是否开启关闭倒计时
  fizzSelectTimeoutId?: { current?: ReturnType<typeof setTimeout> }
  closeTimeout?: boolean
  toOpenAiChat?: AIPluginComponentProps['toOpenAiChat']
  /** 选区工具条测量后决定是否显示文案，未传时按编辑器宽度自行判断 */
  showMenuLabel?: boolean
}

export const buildClickEditorMenuItems = (
  t: TFunction,
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
    renderPanel: ({ maxWidth, onReady, onDraggingChange }) => (
      <InsertTagPanel
        editorInfo={options.editorInfo}
        insert={options.insert}
        addLabel={options.addLabel}
        maxWidth={maxWidth}
        onReady={onReady}
        onDraggingChange={onDraggingChange}
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
  } = props
  const { t, i18n } = useI18nNamespaces(['webFuzzer', 'yakitUi'])
  const { boxHidden, onMouseEnter, onMouseLeave, setPanelDragging } = useFuzzerEditorMenuAutoClose(
    close,
    fizzSelectTimeoutId,
    closeTimeout && !!fizzSelectTimeoutId,
  )

  const groups: FuzzerEditorMenuGroup[] = [
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
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onPanelDragging={setPanelDragging}
    />
  )
}

/** Range 左侧点击区专用，不必整包塞 HTTPFuzzerClickEditorMenuProps */
export interface HTTPFuzzerRangeClickMenuProps {
  insert: (v: QueryFuzzerLabelResponseProps) => void
  addLabel: () => void
  toOpenAiChat?: AIPluginComponentProps['toOpenAiChat']
  className?: string
}

export interface HTTPFuzzerRangeEditorMenuProps {
  close: () => void
  editorInfo?: EditorDetailInfoProps
  insert: (apply: CodecMenuAction['apply']) => void
  rangeValue: string
  /** 传入后左侧拼上插入标签 / AI；不传则只有编解码 */
  clickMenu?: HTTPFuzzerRangeClickMenuProps
  fizzRangeTimeoutId?: { current?: ReturnType<typeof setTimeout> }
  onOpenSmartDecode?: (rangeValue: string, anchorRect?: DOMRect) => void
}

export const buildRangeCodecMenuItems = (
  t: TFunction,
  options: {
    insert: (apply: CodecMenuAction['apply']) => void
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
  const { close, editorInfo, insert, rangeValue, clickMenu, fizzRangeTimeoutId, onOpenSmartDecode } = props
  const { t, i18n } = useI18nNamespaces(['webFuzzer'])
  const { boxHidden, onMouseEnter, onMouseLeave, setPanelDragging } = useFuzzerEditorMenuAutoClose(
    close,
    fizzRangeTimeoutId,
  )

  const clickItems = clickMenu
    ? buildClickEditorMenuItems(t, {
        editorInfo,
        insert: clickMenu.insert,
        addLabel: clickMenu.addLabel,
        toOpenAiChat: clickMenu.toOpenAiChat,
      })
    : []
  const groups: FuzzerEditorMenuGroup[] = [
    ...(clickItems.length
      ? [
          {
            id: 'click',
            className: styles['http-fuzzer-click-editor'],
            simpleClassName: classNames(
              styles['http-fuzzer-click-editor-simple'],
              styles['range-click-editor-menu'],
              clickMenu?.className,
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
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onPanelDragging={setPanelDragging}
    />
  )
}

export interface HTTPFuzzerRangeReadOnlyEditorMenuProps {
  editorInfo?: EditorDetailInfoProps
  rangeValue: string
  fizzRangeTimeoutId?: { current?: ReturnType<typeof setTimeout> }
  close: () => void
  // 外部接管解码后的操作 现用于history编解码呼出
  execAutoDecodeCallback?: () => void
}

export const buildRangeReadOnlyMenuItems = (
  t: TFunction,
  options: {
    rangeValue: string
    execAutoDecodeCallback?: () => void
  },
): FuzzerEditorMenuItem[] => [
  {
    id: 'smart-decode',
    label: t('HTTPFuzzerRangeReadOnlyEditorMenu.decode'),
    icon: <IconSolidSparklesIcon />,
    className: styles['decode-box'],
    onClick: () => {
      if (options.execAutoDecodeCallback) options.execAutoDecodeCallback()
      else execAutoDecode(options.rangeValue)
    },
  },
]

export const HTTPFuzzerRangeReadOnlyEditorMenu: React.FC<HTTPFuzzerRangeReadOnlyEditorMenuProps> = (props) => {
  const { editorInfo, rangeValue, fizzRangeTimeoutId, close, execAutoDecodeCallback } = props
  const { t, i18n } = useI18nNamespaces(['webFuzzer'])
  const { boxHidden, onMouseEnter, onMouseLeave } = useFuzzerEditorMenuAutoClose(close, fizzRangeTimeoutId)

  const groups: FuzzerEditorMenuGroup[] = [
    {
      id: 'readonly',
      simpleClassName: styles['http-fuzzer-read-editor-simple'],
      items: buildRangeReadOnlyMenuItems(t, { rangeValue, execAutoDecodeCallback }),
    },
  ]

  return (
    <FuzzerEditorMenuBar
      groups={groups}
      editorInfo={editorInfo}
      lang={i18n.language}
      className={classNames(styles['http-fuzzer-read-editor'], {
        [styles['box-hidden']]: boxHidden,
      })}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    />
  )
}
