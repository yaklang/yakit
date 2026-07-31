import React, { ReactElement, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import MonacoEditor, { monaco } from 'react-monaco-editor'
import * as monacoEditor from 'monaco-editor/esm/vs/editor/editor.api'
import HexEditor from 'react-hex-editor'
import oneDarkPro from 'react-hex-editor/themes/oneDarkPro'
// yak register
import './monacoSpec/theme'
import './monacoSpec/fuzzHTTPMonacoSpec'
import './monacoSpec/yakEditor'
import './monacoSpec/html'
import { Card, Form, Tooltip } from 'antd'
import { EnterOutlined, FullscreenOutlined, SettingOutlined, ThunderboltFilled } from '@ant-design/icons'
import { HTTPFlowBodyByIdRequest, HTTPPacketFuzzable } from '../components/HTTPHistory'
import ReactResizeDetector from 'react-resize-detector'

import { useControllableValue, useDebounceFn, useMemoizedFn, useSize, useUpdateEffect } from 'ahooks'
import { Buffer } from 'buffer'
import { StringToUint8Array, Uint8ArrayToString } from './str'
import { getRemoteValue } from '@/utils/kv'
import { editor, IPosition, IRange } from 'monaco-editor'
import { ConvertYakStaticAnalyzeErrorToMarker, YakStaticAnalyzeErrorResult } from '@/utils/editorMarkers'
import ITextModel = editor.ITextModel
import { YAK_FORMATTER_COMMAND_ID, setEditorContext } from '@/utils/monacoSpec/yakEditor'
import IModelDecoration = editor.IModelDecoration
import {
  HighLightText,
  OperationRecordRes,
  OtherMenuListProps,
  YakitEditorProps,
  YakitIMonacoEditor,
} from '@/components/yakitUI/YakitEditor/YakitEditorType'
import { HTTPPacketYakitEditor } from '@/components/yakitUI/YakitEditor/extraYakitEditor'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { formatPacketRender, prettifyPacketCode, prettifyPacketRender } from './prettifyPacket'
import styles from './editors.module.scss'
import classNames from 'classnames'
import { YakitCheckableTag } from '@/components/yakitUI/YakitTag/YakitCheckableTag'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import { OutlineDotsverticalIcon } from '@/assets/icon/outline'
import { showYakitModal } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import { DataCompareModal } from '@/pages/compare/DataCompare'
import emiter from './eventBus/eventBus'
import { v4 as uuidv4 } from 'uuid'
import { GetPluginLanguage } from '@/pages/plugins/builtInData'
import { Selection } from '@/pages/yakRunner/RunnerTabs/RunnerTabsType'
import { showYakitDrawer } from '@/components/yakitUI/YakitDrawer/YakitDrawer'
import { YakitPopover } from '@/components/yakitUI/YakitPopover/YakitPopover'
import { Theme, useTheme } from '@/hook/useTheme'
import { applyYakitMonacoTheme } from './monacoSpec/theme'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { fontSizeOptions, useEditorFontSize } from '@/store/editorFontSize'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import { newWebFuzzerTab } from '@/pages/fuzzer/HTTPFuzzerPage'
import { JSONParseLog } from './tool'
import { yakitEditorTools } from '@/services/electronBridge'
import { openLargeContentViewer } from '@/utils/openWebsite'

// 大内容降级阈值：超过此体积进入 lite 模式（关 minimap/换行/二进制折叠等），弱 CPU 下减少 Monaco 渲染开销
const PREVIEW_LITE_THRESHOLD = 128 * 1024 // 128KB
// 超大内容/二进制阈值：超过此体积或命中二进制类型时强制 plaintext，跳过 HTTP 高亮与装饰
const PREVIEW_PLAINTEXT_THRESHOLD = 512 * 1024 // 512KB
// 截断阈值：只读场景超过此体积在 Monaco 只预览头部，提供"加载全部"按钮在新窗口用轻量查看器看全文
const PREVIEW_TRUNCATE_THRESHOLD = 512 * 1024 // 512KB

/** 从完整 HTTP 包文本（含响应头/请求头）解析 Content-Type */
function parseContentTypeFromPacket(packet: string): string {
  if (!packet) return ''
  const m = /\nContent-Type:\s*([^\r\n]+)/i.exec(packet)
  return m ? m[1].trim() : ''
}

/** 判断是否为二进制/无需 HTTP 语法高亮的类型（.map / octet-stream / 字体 / 压缩包 / 图片 / pdf 等） */
function isBinaryLikeContentType(ct: string, url?: string): boolean {
  const lower = (ct || '').toLowerCase()
  if (lower.includes('octet-stream')) return true
  if (lower.includes('application/x-')) return true // x-gzip x-tar 等
  if (url) {
    if (/\.map(\?|$)/i.test(url)) return true // source map
    if (/\.(woff2?|ttf|otf|eot|zip|gz|tar|7z|rar|exe|dll|so|dylib|png|jpe?g|gif|webp|ico|pdf)(\?|$)/i.test(url))
      return true
  }
  return false
}

export type IMonacoActionDescriptor = monaco.editor.IActionDescriptor

export type IMonacoEditor = monacoEditor.editor.IStandaloneCodeEditor
export type IMonacoCodeEditor = monacoEditor.editor.ICodeEditor

export interface EditorProps {
  loading?: boolean
  value?: string
  bytes?: boolean
  valueBytes?: Uint8Array
  setValue?: (e: string) => any
  readOnly?: boolean
  editorDidMount?: (editor: IMonacoEditor) => any
  type?: 'html' | 'http' | 'yak' | string
  theme?: string
  fontSize?: number

  // 自动换行？ true 应该不换行，false 换行
  noWordWrap?: boolean
  /**@name 是否显示换行符 */
  showLineBreaks?: boolean

  noMiniMap?: boolean
  noLineNumber?: boolean
  lineNumbersMinChars?: number

  actions?: IMonacoActionDescriptor[]
  triggerId?: any

  full?: boolean

  // 弹窗 / 抽屉类独立在 root 节点外的盒模型，需外部传入颜色主题
  propsTheme?: Theme
}

export const YakEditor: React.FC<EditorProps> = (props) => {
  const { t, i18n } = useI18nNamespaces(['utils'])
  const [editor, setEditor] = useState<IMonacoEditor>()
  const [reload, setReload] = useState(false)
  const [triggerId, setTrigger] = useState<any>()
  // 高度缓存
  const [prevHeight, setPrevHeight] = useState(0)
  const [preWidth, setPreWidth] = useState(0)
  // const [editorHeight, setEditorHeight] = useState(0);
  const outterContainer = useRef(null)
  const [loading, setLoading] = useState(true)

  const { theme: themeGlobal } = useTheme()
  const { fontSize: globalFontSize } = useEditorFontSize()

  useLayoutEffect(() => {
    applyYakitMonacoTheme(props?.propsTheme ?? themeGlobal)
  }, [themeGlobal, editor, props?.propsTheme])

  /** 编辑器语言 */
  const language = useMemo(() => {
    return GetPluginLanguage(props.type || 'http')
  }, [props.type])

  useMemo(() => {
    if (editor) {
      setEditorContext(editor, 'plugin', props.type || '')
    }
  }, [props.type, editor])

  useEffect(() => {
    if (props.triggerId !== triggerId) {
      setTrigger(props.triggerId)
      setReload(true)
    }
  }, [props.triggerId])

  const triggerReload = useMemoizedFn(() => {
    setReload(true)
  })

  useEffect(() => {
    if (!reload) {
      return
    }
    setTimeout(() => setReload(false), 100)
  }, [reload])

  useEffect(() => {
    if (!editor) {
      return
    }

    setTimeout(() => {
      setLoading(false)
    }, 200)

    const model = editor.getModel()
    if (!model) {
      return
    }

    if (props.type === 'http') {
      if (!model) {
        return
      }
      let current: string[] = []

      const applyContentLength = () => {
        const text = model.getValue()
        const match = /\nContent-Length:\s*?\d+/.exec(text)
        if (!match) {
          return
        }
        const start = model.getPositionAt(match.index)
        const end = model.getPositionAt(match.index + match[0].indexOf(':'))
        current = model.deltaDecorations(current, [
          {
            id: 'keyword' + match.index,
            ownerId: 0,
            range: new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
            options: { afterContentClassName: 'content-length' },
          } as IModelDecoration,
        ])
      }
      const applyUnicodeDecode = () => {
        const text = model.getValue()
        let match
        const regex = /(\\u[\dabcdef]{4})+/gi

        while ((match = regex.exec(text)) !== null) {
          const start = model.getPositionAt(match.index)
          const end = model.getPositionAt(match.index + match[0].length)
          const decoded = match[0]
            .split('\\u')
            .filter(Boolean)
            .map((hex) => String.fromCharCode(parseInt(hex, 16)))
            .join('')
          current = model.deltaDecorations(current, [
            {
              id: 'decode' + match.index,
              ownerId: 0,
              range: new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
              options: {
                className: 'unicode-decode',
                hoverMessage: { value: decoded },
                afterContentClassName: 'unicode-decode',
                after: { content: decoded, inlineClassName: 'unicode-decode-after' },
              },
            } as IModelDecoration,
          ])
        }
      }
      const applyKeywordDecoration = () => {
        const text = model.getValue()
        const keywordRegExp = /\r?\n/g
        const decorations: IModelDecoration[] = []
        let match

        while ((match = keywordRegExp.exec(text)) !== null) {
          const start = model.getPositionAt(match.index)
          const className: 'crlf' | 'lf' = match[0] === '\r\n' ? 'crlf' : 'lf'
          const end = model.getPositionAt(match.index + match[0].length)
          decorations.push({
            id: 'keyword' + match.index,
            ownerId: 2,
            range: new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
            options: { beforeContentClassName: className },
          } as IModelDecoration)
        }
        // 使用 deltaDecorations 应用装饰
        current = model.deltaDecorations(current, decorations)
      }
      model.onDidChangeContent((e) => {
        applyContentLength()
        applyUnicodeDecode()
        applyKeywordDecoration()
      })
      applyContentLength()
      applyUnicodeDecode()
      applyKeywordDecoration()
    }

    if (language === 'yak') {
      editor.addAction({
        contextMenuGroupId: 'yaklang',
        id: YAK_FORMATTER_COMMAND_ID,
        label: t('YakEditor.yakFormat'),
        run: () => {
          yakCompileAndFormat.run(editor, model)
          return undefined
        },
      })
    }

    if (props.actions) {
      // 注册右键菜单
      props.actions.forEach((e) => {
        editor.addAction(e)
      })
    }
  }, [editor])

  const handleEditorMount = (editor: IMonacoEditor, monaco: any) => {
    editor.onDidChangeModelDecorations(() => {
      updateEditorHeight() // typing
      requestAnimationFrame(updateEditorHeight) // folding
    })

    const updateEditorHeight = () => {
      const editorElement = editor.getDomNode()

      if (!editorElement) {
        return
      }

      const padding = 40

      const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight)
      const lineCount = editor.getModel()?.getLineCount() || 1
      const height = editor.getTopForLineNumber(lineCount + 1) + lineHeight + padding

      if (prevHeight !== height) {
        setPrevHeight(height)
        editorElement.style.height = `${height}px`
        editor.layout()
      }
    }
  }

  const fixContextMenu = useMemoizedFn((editor: IMonacoEditor) => {
    editor.onContextMenu((e) => {
      if (!outterContainer) {
        return
      }
      if (!outterContainer.current) {
        return
      }

      // 注入右键菜单的样式
      const divElement = outterContainer.current as HTMLDivElement
      const host = divElement.querySelector('.shadow-root-host')
      // adds the custom stylesheet once per editor
      if (host && host.shadowRoot && !host.shadowRoot.querySelector('.custom')) {
        const style = document.createElement('style')

        style.setAttribute('class', 'custom')
        style.innerHTML = `
.context-view.monaco-menu-container > .monaco-scrollable-element {
    margin-left: 2px;
}
`
        host.shadowRoot.prepend(style)
      }
    })
  })

  const yakCompileAndFormat = useDebounceFn(
    useMemoizedFn((editor: IMonacoEditor, model: ITextModel) => {
      const allContent = model.getValue()
      yakitEditorTools
        .compileAndFormat({ Code: allContent })
        .then((e: { Errors: YakStaticAnalyzeErrorResult[]; Code: string }) => {
          console.info(e)
          if (e.Code !== '') {
            model.setValue(e.Code)
            triggerReload()
          }

          if (e && e.Errors.length > 0) {
            const markers = e.Errors.map(ConvertYakStaticAnalyzeErrorToMarker)
            monaco.editor.setModelMarkers(model, 'owner', markers)
          } else {
            monaco.editor.setModelMarkers(model, 'owner', [])
          }
        })
        .catch((e) => {
          console.info(e)
        })
    }),
    { wait: 500 },
  )

  const AnalyzeSessionIDRef = useRef<string>(uuidv4())
  const yakStaticAnalyze = useDebounceFn(
    useMemoizedFn((editor: IMonacoEditor, model: ITextModel) => {
      const allContent = model.getValue()
      const type = props.type || ''
      if (language === 'yak') {
        yakitEditorTools
          .staticAnalyze({
            Code: StringToUint8Array(allContent),
            PluginType: type,
            SessionID: AnalyzeSessionIDRef.current,
          })
          .then((e: { Result: YakStaticAnalyzeErrorResult[] }) => {
            if (e && e.Result.length > 0) {
              const markers = e.Result.map(ConvertYakStaticAnalyzeErrorToMarker)
              monaco.editor.setModelMarkers(model, 'owner', markers)
            } else {
              monaco.editor.setModelMarkers(model, 'owner', [])
            }
          })
      }
    }),
    { wait: 300 },
  )

  return (
    <>
      {!reload && (
        <div style={{ height: '100%', width: '100%', overflow: 'hidden' }} ref={outterContainer}>
          <ReactResizeDetector
            onResize={(width, height) => {
              if (props.full) {
                return
              }
              if (!width || !height) {
                return
              }

              if (editor) {
                editor.layout({ height, width })
              }
              setPrevHeight(height)
              setPreWidth(width)
            }}
            handleWidth={true}
            handleHeight={true}
            refreshMode={'debounce'}
            refreshRate={30}
          >
            <div
              className={classNames({
                [styles['monaco-editor-style']]: !props.showLineBreaks,
              })}
              style={{ height: '100%', width: '100%', overflow: 'hidden' }}
            >
              <MonacoEditor
                theme={props.theme || 'kurior'}
                value={props.bytes ? new Buffer((props.valueBytes || []) as Uint8Array).toString() : props.value}
                onChange={props.setValue}
                language={language || 'http'}
                height={100}
                editorDidMount={(editor: IMonacoEditor, monaco: any) => {
                  setEditor(editor)
                  editor.setSelection({
                    startColumn: 0,
                    startLineNumber: 0,
                    endColumn: 0,
                    endLineNumber: 0,
                  })

                  if (editor) {
                    const model = editor.getModel()
                    if (model) {
                      yakStaticAnalyze.run(editor, model)
                      model.onDidChangeContent(() => {
                        yakStaticAnalyze.run(editor, model)
                      })
                    }
                  }

                  fixContextMenu(editor)
                  if (props.full) {
                    handleEditorMount(editor, monaco)
                  }
                  if (props.editorDidMount) props.editorDidMount(editor)
                }}
                options={{
                  readOnly: props.readOnly,
                  scrollBeyondLastLine: false,
                  fontWeight: '500',
                  fontSize: globalFontSize,
                  showFoldingControls: 'always',
                  showUnused: true,
                  wordWrap: props.noWordWrap ? 'off' : 'on',
                  renderLineHighlight: 'line',
                  lineNumbers: props.noLineNumber ? 'off' : 'on',
                  minimap: props.noMiniMap ? { enabled: false } : undefined,
                  lineNumbersMinChars: props.lineNumbersMinChars || 5,
                  renderWhitespace: 'all',
                  bracketPairColorization: {
                    enabled: true,
                    independentColorPoolPerBracketType: true,
                  },
                  fixedOverflowWidgets: true,
                }}
              />
            </div>
          </ReactResizeDetector>
        </div>
      )}
    </>
  )
}
/**@name 字体大小 */
export const HTTP_PACKET_EDITOR_FONT_SIZE = 'HTTP_PACKET_EDITOR_FONT_SIZE'
/**@name 获取换行符是否显示 */
export const HTTP_PACKET_EDITOR_Line_Breaks = 'HTTP_PACKET_EDITOR_Line_Breaks'
/**@name 是否显示响应信息 */
export const HTTP_PACKET_EDITOR_Response_Info = 'HTTP_PACKET_EDITOR_Response_Info'

interface DataCompareProps {
  rightCode: string
  /** 当存在leftCode时则使用leftCode，否则使用编辑器showValue */
  leftCode?: string
  leftTitle?: string
  rightTitle?: string
}

export interface NewHTTPPacketEditorProp extends HTTPPacketFuzzable {
  /** yakit-editor组件基础属性 */
  disabled?: boolean
  readOnly?: boolean
  contextMenu?: OtherMenuListProps
  noLineNumber?: boolean
  lineNumbersMinChars?: number
  noMinimap?: boolean
  onAddOverlayWidget?: (editor: IMonacoEditor, isShow?: boolean) => any
  extraEditorProps?: YakitEditorProps | any
  /** 是否启用二进制 Fuzztag 折叠（unquote/hexdecode/base64decode/file 折叠为小块，点击 HEX 编辑） */
  foldBinaryFuzztag?: boolean

  highLightText?: HighLightText[] | Selection[]
  highLightFind?: HighLightText[] | Selection[]
  highLightFindClass?: string
  // 是否定位高亮光标位置
  isPositionHighLightCursor?: boolean

  /** 扩展属性 */
  originValue: string
  // 接口返回原始包
  originalPackage?: Uint8Array
  onChange?: (i: string) => any
  disableFullscreen?: boolean
  defaultHeight?: number
  bordered?: boolean
  onEditor?: (editor: IMonacoEditor) => any
  extra?: React.ReactNode
  extraEnd?: React.ReactNode
  emptyOr?: React.ReactNode

  refreshTrigger?: boolean | any
  noHeader?: boolean
  loading?: boolean

  noPacketModifier?: boolean
  noOpenPacketNewWindow?: boolean
  noTitle?: boolean
  title?: React.ReactNode
  titleStyle?: React.CSSProperties

  // lang
  language?: 'html' | 'http' | 'yak' | any

  isResponse?: boolean
  utf8?: boolean
  theme?: string

  defaultSearchKeyword?: string

  isWebSocket?: boolean
  webSocketValue?: string
  webSocketToServer?: string

  /**@name 外部控制换行状态 */
  noWordWrapState?: boolean
  /**@name 外部控制字体大小 */
  fontSizeState?: number
  /**@name 是否显示换行符 */
  showLineBreaksState?: boolean
  /**@name 是否增加OverlayWidget */
  isAddOverlayWidget?: boolean
  /**@name 外部控制是否记录操作(拥有此项可记录字体大小及换行符) */
  editorOperationRecord?: string
  /**@name 外部控制WebFuzzer数据 */
  webFuzzerValue?: string
  /**@name 打开WebFuzzer的回调 */
  webFuzzerCallBack?: () => void
  /**@name 是否显示美化/hex/渲染TYPE(默认显示) 这里的美化渲染hex只试用与只读的编辑器，可编辑编辑器的美化按钮请外部用按钮自行实现 */
  isShowBeautifyRender?: boolean
  // 外部单独控制hex编辑器是否显示，如果是采用内部type控制是否显示，此字段不需要传
  noShowHex?: boolean
  // 外部单独控制渲染html是否显示，如果是采用内部type控制是否显示，此字段不需要传
  renderHtml?: React.ReactNode
  // 是否由外部接管children的渲染，如果是由外部接管children的渲染，则编辑器组件不再对children进行任何处理，完全由外部控制，适用于一些特殊场景，比如内嵌入一些特殊组件等
  children?: React.ReactNode
  /**@name 是否显示显示Extra默认项 */
  showDefaultExtra?: boolean
  /**@name 是否显示配置编辑器（默认显示） */
  noSetIngEditor?: boolean
  /**@name 数据对比(默认无对比) */
  dataCompare?: DataCompareProps
  /**默认选中美化或渲染 */
  typeOptionVal?: RenderTypeOptionVal
  onTypeOptionVal?: (s?: RenderTypeOptionVal) => void
  /** 编码按钮 */
  AfterBeautifyRenderBtn?: ReactElement
  url?: string
  downbodyParams?: HTTPFlowBodyByIdRequest
  onlyBasicMenu?: boolean
  showDownBodyMenu?: boolean
  onClickUrlMenu?: () => void
  onClickUrlWithoutQueryMenu?: () => void
  onClickOpenBrowserMenu?: () => void
  onClickOpenPacketNewWindowMenu?: () => void

  fixContentType?: string
  originalContentType?: string
  fixContentTypeHoverMessage?: string

  keepSearchName?: string
  noSendToComparer?: boolean
  /** 是否来自 MITM 页面 */
  fromMITM?: boolean
}

export type RenderTypeOptionVal = 'beautify' | 'render' | 'hex'

interface TypeOptionsProps {
  value: RenderTypeOptionVal
  label: string
}

interface RefreshEditorOperationRecordProps extends OperationRecordRes {
  editorId: string
}

export const NewHTTPPacketEditor: React.FC<NewHTTPPacketEditorProp> = React.memo((props: NewHTTPPacketEditorProp) => {
  const isResponse = props.isResponse
  const {
    keepSearchName,
    originValue,
    originalPackage,
    isShowBeautifyRender = true,
    showDefaultExtra = true,
    dataCompare,
    editorOperationRecord,
    highLightText,
    highLightFind,
    highLightFindClass,
    isPositionHighLightCursor,
    downstreamProxyStr = '',
    noShowHex = true,
  } = props
  const { t, i18n } = useI18nNamespaces(['history', 'yakitUi'])
  const [strValue, setStrValue] = useState(originValue)
  const [hexValue, setHexValue] = useState<Uint8Array>(new Uint8Array()) // 只有切换到hex时才会用这个值，目前切换得时候会把最新得编辑器中得值赋值到该变量里面
  const [monacoEditor, setMonacoEditor] = useState<IMonacoEditor>()
  const { fontSize, setFontSize, initFontSize } = useEditorFontSize()
  const [showLineBreaks, setShowLineBreaks] = useState<boolean>(true)
  const [noWordwrap, setNoWordwrap] = useState(false)
  const [popoverVisible, setPopoverVisible] = useState<boolean>(false)
  const editorCardRef = useRef<HTMLDivElement>(null)
  const editorCardSize = useSize(editorCardRef)
  const isCompactTypeOptions = +(editorCardSize?.width || 0) < 580

  const [type, setType] = useControllableValue<RenderTypeOptionVal | undefined>(props, {
    defaultValue: undefined,
    valuePropName: 'typeOptionVal',
    trigger: 'onTypeOptionVal',
  })

  const editorHighLightText = useMemo(() => {
    return type === undefined ? highLightText || [] : []
  }, [type, highLightText])
  const editorHighLightFind = useMemo(() => {
    return type === undefined ? highLightFind || [] : []
  }, [type, highLightFind])

  const [typeOptions, setTypeOptions] = useState<TypeOptionsProps[]>([])
  const [showValue, setShowValue] = useState<string>(originValue)
  const [renderHtml, setRenderHTML] = useState<React.ReactNode>()
  const { theme } = useTheme()

  // 对比loading
  const [compareLoading, setCompareLoading] = useState<boolean>(false)

  // 编辑器Id 用于区分每个编辑器
  const [editorId, setEditorId] = useState<string>(uuidv4())

  useEffect(() => {
    initFontSize()
  }, [])

  // 读取上次选择的字体大小/换行符
  const onRefreshEditorOperationRecord = useMemoizedFn((v) => {
    try {
      const obj: RefreshEditorOperationRecordProps = JSONParseLog(v, {
        page: 'editors',
        fun: 'onRefreshEditorOperationRecord',
      })
      if (obj.editorId === editorId) {
        if (obj?.fontSize) {
          setFontSize(obj.fontSize)
        } else {
          setShowLineBreaks(obj.showBreak || false)
        }
      }
    } catch (error) {}
  })

  const targetHexTheme = useMemo(() => {
    return theme === 'dark' ? { hexEditor: oneDarkPro } : undefined
  }, [theme])

  useEffect(() => {
    if (editorOperationRecord) {
      getRemoteValue(editorOperationRecord).then((data) => {
        try {
          if (!data) return
          let obj: OperationRecordRes = JSONParseLog(data, { page: 'editors' })
          if (typeof obj?.showBreak === 'boolean') {
            setShowLineBreaks(obj?.showBreak)
          }
          if (typeof obj?.noWordWrap === 'boolean') {
            setNoWordwrap(obj?.noWordWrap)
          }
        } catch (error) {
          fail(error + '')
        }
      })
    }
  }, [])

  useEffect(() => {
    emiter.on('refreshEditorOperationRecord', onRefreshEditorOperationRecord)
    return () => {
      emiter.off('refreshEditorOperationRecord', onRefreshEditorOperationRecord)
    }
  }, [])

  useUpdateEffect(() => {
    setNoWordwrap(props.noWordWrapState || false)
  }, [props.noWordWrapState])
  useUpdateEffect(() => {
    if (!props.fontSizeState) return
    setFontSize(props.fontSizeState)
  }, [props.fontSizeState])
  useUpdateEffect(() => {
    setShowLineBreaks(props.showLineBreaksState || false)
  }, [props.showLineBreaksState])

  useEffect(() => {
    getRemoteValue(HTTP_PACKET_EDITOR_Line_Breaks)
      .then((data) => {
        setShowLineBreaks(data === 'true')
      })
      .catch(() => {
        setShowLineBreaks(true)
      })
  }, [])

  /*如何实现 monaco editor 高亮？*/
  // https://microsoft.github.io/monaco-editor/playground.html#interacting-with-the-editor-line-and-inline-decorations

  // hex editor
  const [nonce, setNonce] = useState(0)
  // The callback facilitates updates to the source data.
  const handleSetValue = React.useCallback(
    (offset, value) => {
      hexValue[offset] = value
      setNonce((v) => v + 1)
      setHexValue(value)
    },
    [hexValue],
  )
  useEffect(() => {
    if (!noShowHex) {
      setHexValue(originalPackage ? originalPackage : StringToUint8Array(originValue))
    }
  }, [noShowHex, originValue, originalPackage])

  const openCompareModal = useMemoizedFn((dataCompare: DataCompareProps) => {
    setCompareLoading(true)
    setTimeout(() => {
      const m = showYakitModal({
        title: null,
        content: (
          <DataCompareModal
            onClose={() => m.destroy()}
            rightTitle={dataCompare.rightTitle}
            leftTitle={dataCompare.leftTitle}
            leftCode={dataCompare.leftCode ? dataCompare.leftCode : showValue}
            rightCode={dataCompare.rightCode}
            loadCallBack={() => setCompareLoading(false)}
          />
        ),
        onCancel: () => {
          m.destroy()
        },
        width: 1200,
        footer: null,
        closable: false,
        hiddenHeader: true,
      })
    }, 500)
  })

  useEffect(() => {
    if (monacoEditor) {
      props.onEditor && props.onEditor(monacoEditor)
      monacoEditor.setSelection({ startColumn: 0, startLineNumber: 0, endLineNumber: 0, endColumn: 0 })
    }
  }, [monacoEditor])
  useEffect(() => {
    if (monacoEditor) {
      props.onAddOverlayWidget && props.onAddOverlayWidget(monacoEditor, props.isAddOverlayWidget)
    }
  }, [monacoEditor, props.isAddOverlayWidget])

  useEffect(() => {
    if (props.readOnly) {
      setStrValue(showValue)
      if (monacoEditor) {
        monacoEditor.setSelection({ startColumn: 0, startLineNumber: 0, endLineNumber: 0, endColumn: 0 })
      }
    }
  }, [
    showValue,
    props.readOnly,
    // monacoEditor
  ])
  useEffect(() => {
    if (!props.readOnly) {
      setStrValue(originValue)
      if (monacoEditor) {
        monacoEditor.setSelection({ startColumn: 0, startLineNumber: 0, endLineNumber: 0, endColumn: 0 })
      }
    }
  }, [props.refreshTrigger, props.readOnly])

  useEffect(() => {
    props.onChange && props.onChange(strValue)
  }, [strValue])

  const empty = !!props.emptyOr && originValue.length == 0

  // 如果这个不为空的话，默认直接打开搜索功能
  useEffect(() => {
    if (!props.defaultSearchKeyword) {
      return
    }

    if (!monacoEditor) {
      return
    }

    try {
      const model = monacoEditor.getModel()
      // @ts-ignore
      const range: IRange = model.findNextMatch(
        props.defaultSearchKeyword,
        { lineNumber: 0, column: 0 } as IPosition,
        false,
        false,
        null,
        false,
      ).range
      monacoEditor.setSelection(range)
      monacoEditor.revealRangeNearTop(range)
      monacoEditor.trigger('', 'actions.find', undefined)
    } catch (e) {
      console.info('加载默认搜索字符串失败', props.defaultSearchKeyword)
    }
  }, [props.defaultSearchKeyword, monacoEditor])

  // 大内容/二进制降级：不截断、不改可见内容，只让底层 Monaco 用更轻的方式渲染同样全文
  const editorDowngradeProps = useMemo(() => {
    // 用字符数 O(1) 近似字节阈值，避免对 4.9MB 字符串做 TextEncoder.encode（主线程 O(n) 编码）。
    // UTF-8 字节 ≈ 字符数 × 1~3，用 length 判断偏保守（降级更早），对性能有利且不会漏判大内容。
    const size = (originValue ?? '').length
    const ct = parseContentTypeFromPacket(originValue ?? '')
    const binary = isBinaryLikeContentType(ct, props.url)
    const isLite = size > PREVIEW_LITE_THRESHOLD
    const isPlaintext = size > PREVIEW_PLAINTEXT_THRESHOLD || binary
    return {
      // 大体积/二进制：强制 plaintext，跳过 HTTP 高亮与装饰器全文扫描（.map 等本就不需要 HTTP 高亮）
      language: isPlaintext ? 'plaintext' : props.language || 'http',
      // 大体积：关 minimap（整篇缩略图绘制在弱 CPU 上极重）
      noMinimap: isLite ? true : props.noMinimap,
      // 大体积：关自动换行（超长行 wrap 在弱 CPU 极卡）
      noWordWrap: isLite ? true : undefined,
      // 大体积/二进制：跳过 unicode 自动解码装饰（全文 \u 正则扫描）
      disableUnicodeDecode: isLite || binary ? true : undefined,
      // 大体积：关二进制 fuzztag 折叠（折叠本身在大包上要扫描全文）
      foldBinaryFuzztag: isLite ? false : props.foldBinaryFuzztag,
    }
  }, [originValue, props.url, props.language, props.noMinimap, props.foldBinaryFuzztag])

  // 大内容截断：只读场景超过阈值时，Monaco 只预览头部，提供"加载全部"在新窗口用轻量查看器看全文。
  // 编辑场景不截断，保证可编辑性。原始全文存 ref 供"加载全部"传给新窗口。
  const fullOriginValueRef = useRef(originValue)
  fullOriginValueRef.current = originValue
  const isTruncated = !!props.readOnly && originValue.length > PREVIEW_TRUNCATE_THRESHOLD
  // 传给 Monaco 的值：截断时用头部 + 提示，否则用原文
  const monacoOriginValue = useMemo(() => {
    if (!isTruncated) return originValue
    const head = originValue.slice(0, PREVIEW_TRUNCATE_THRESHOLD)
    const totalKB = (originValue.length / 1024).toFixed(0)
    return `${head}\n...[内容已截断,共 ${totalKB}KB,点击工具栏"加载全部"在新窗口查看完整内容]...\n\n`
  }, [isTruncated, originValue])

  const setTypeOptionFn = useMemoizedFn(() => {
    if (originValue.length > 0) {
      // 大内容早退：跳过 formatPacketRender（IPC + 可能的 Uint8ArrayToString/DOMPurify/prettier 主线程解析）
      // 和 TextEncoder.encode（4.9MB 主线程 O(n) 编码），直接只给 HEX 选项。
      // 弱 CPU 上大内容美化/渲染本就不可用，且配合 Monaco 大内容降级已足够。
      if (originValue.length > PREVIEW_LITE_THRESHOLD) {
        setTypeOptions([
          {
            value: 'hex',
            label: 'HEX',
          },
        ])
        return
      }
      // 默认展示 originValue
      const encoder = new TextEncoder()
      const bytes = encoder.encode(originValue)
      const mb = bytes.length / 1024 / 1024
      // 0.5mb 及以下内容才可美化
      if (isResponse) {
        formatPacketRender(originalPackage || StringToUint8Array(originValue), (packet) => {
          if (packet) {
            if (mb > 0.5) {
              setTypeOptions([
                {
                  value: 'hex',
                  label: 'HEX',
                },
                {
                  value: 'render',
                  label: t('NewHTTPPacketEditor.render'),
                },
              ])
            } else {
              setTypeOptions([
                {
                  value: 'beautify',
                  label: t('YakitButton.beautify'),
                },
                {
                  value: 'hex',
                  label: 'HEX',
                },
                {
                  value: 'render',
                  label: t('NewHTTPPacketEditor.render'),
                },
              ])
            }
          } else {
            if (mb > 0.5) {
              setTypeOptions([
                {
                  value: 'hex',
                  label: 'HEX',
                },
              ])
            } else {
              setTypeOptions([
                {
                  value: 'beautify',
                  label: t('YakitButton.beautify'),
                },
                {
                  value: 'hex',
                  label: 'HEX',
                },
              ])
            }
          }
        })
      } else {
        if (mb > 0.5) {
          setTypeOptions([
            {
              value: 'hex',
              label: 'HEX',
            },
          ])
        } else {
          setTypeOptions([
            {
              value: 'beautify',
              label: t('YakitButton.beautify'),
            },
            {
              value: 'hex',
              label: 'HEX',
            },
          ])
        }
      }
    } else {
      setTypeOptions([])
    }
  })

  useEffect(() => {
    setRenderHTML(undefined)
    setTypeOptionFn()
  }, [originValue, setTypeOptionFn])

  const beautifyCode = useDebounceFn(
    useMemoizedFn(async () => {
      if (!isShowBeautifyRender || typeOptions.findIndex((i) => i.value === 'beautify') === -1) {
        setType(undefined)
        return
      }
      setRenderHTML(undefined)
      let beautifyValue = await prettifyPacketCode(originValue)
      setShowValue(Uint8ArrayToString(beautifyValue as Uint8Array))
    }),
    {
      wait: 300,
    },
  ).run
  const renderCode = useDebounceFn(
    useMemoizedFn(async () => {
      if (!isShowBeautifyRender || typeOptions.findIndex((i) => i.value === 'render') === -1) {
        setType(undefined)
        return
      }
      let renderValue = await prettifyPacketRender(originalPackage || StringToUint8Array(originValue))
      setRenderHTML(
        <iframe srcDoc={renderValue as string} style={{ width: '100%', height: '100%', border: 'none' }} sandbox="" />,
      )
    }),
    { wait: 300 },
  ).run

  useEffect(() => {
    if (originValue) {
      if (type === undefined) {
        setRenderHTML(undefined)
        setShowValue(originValue)
      } else if (type === 'beautify') {
        beautifyCode()
      } else if (type === 'render') {
        renderCode()
      } else if (type === 'hex') {
        setRenderHTML(undefined)
        setHexValue(originalPackage ? originalPackage : StringToUint8Array(originValue))
      }
    } else {
      setShowValue('')
    }
  }, [type, originValue])

  const handleEditorMount = useMemoizedFn((editor: YakitIMonacoEditor) => {
    setMonacoEditor(editor)
  })

  // 截断场景：在 Monaco 内容末尾（截断提示行）用 ContentWidget 挂"加载全部"按钮
  useEffect(() => {
    if (!monacoEditor || !isTruncated) return
    const editor = monacoEditor
    const widgetId = 'load-all-content-widget'
    let root: ReturnType<typeof createRoot> | null = null
    const widget = {
      getId() {
        return widgetId
      },
      getDomNode() {
        const dom = document.createElement('div')
        dom.style.zIndex = '10'
        dom.style.transform = 'translateY(6px)'
        root = createRoot(dom)
        root.render(
          <YakitButton
            size="small"
            type="primary"
            onClick={() =>
              openLargeContentViewer({
                content: fullOriginValueRef.current,
                title: isResponse ? 'Response' : 'Request',
              })
            }
          >
            加载全部
          </YakitButton>,
        )
        return dom
      },
      getPosition() {
        const model = editor.getModel()
        if (!model) return null
        return {
          position: { lineNumber: model.getLineCount(), column: 1 },
          preference: [1, 2],
        }
      },
    }
    editor.addContentWidget(widget as any)
    return () => {
      try {
        editor.removeContentWidget(widget as any)
        root?.unmount()
      } catch (e) {}
    }
  }, [monacoEditor, isTruncated, isResponse])

  const onTypeOptionChange = useMemoizedFn((value: RenderTypeOptionVal, checked: boolean) => {
    setType(checked ? value : undefined)
  })

  const renderTypeOptions = () => {
    if (isCompactTypeOptions && !!typeOptions.length) {
      return (
        <YakitPopover
          trigger="click"
          content={
            <>
              {typeOptions.map((item) => (
                <div key={item.value} className={styles['type-options-popover-item']}>
                  <span>{item.label}</span>
                  <YakitSwitch
                    checked={type === item.value}
                    onChange={(checked) => onTypeOptionChange(item.value, checked)}
                  />
                </div>
              ))}
            </>
          }
        >
          <OutlineDotsverticalIcon className={styles['resize-card-icon']} />
        </YakitPopover>
      )
    }

    return (
      <div className={classNames(styles['type-options-checkable-tag'])}>
        {typeOptions.map((item) => (
          <YakitCheckableTag
            key={item.value}
            checked={type === item.value}
            onChange={(checked) => onTypeOptionChange(item.value, checked)}
          >
            {item.label}
          </YakitCheckableTag>
        ))}
      </div>
    )
  }

  return (
    <div ref={editorCardRef} style={{ height: '100%', width: '100%' }}>
      <NewHTTPCard
        loading={props.loading}
        bordered={props.bordered}
        title={
          !props.noHeader && (
            <div style={{ display: 'flex', gap: 2, ...(props.titleStyle || {}) }}>
              {!props.noTitle &&
                (!!props.title ? (
                  props.title
                ) : (
                  <span style={{ fontSize: 12 }}>{isResponse ? 'Response' : 'Request'}</span>
                ))}
            </div>
          )
        }
        extra={
          !props.noHeader && (
            <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              {props.extra}
              {isShowBeautifyRender && renderTypeOptions()}
              {props.AfterBeautifyRenderBtn}
              {dataCompare && dataCompare.rightCode.length > 0 && (
                <YakitButton
                  size={'small'}
                  type={'primary'}
                  loading={compareLoading}
                  onClick={() => {
                    openCompareModal(dataCompare)
                  }}
                >
                  {t('NewHTTPPacketEditor.compare')}
                </YakitButton>
              )}
              {props.sendToWebFuzzer && (
                <YakitButton
                  size={'small'}
                  type={'primary'}
                  icon={<ThunderboltFilled />}
                  onClick={() =>
                    newWebFuzzerTab({
                      isHttps: props.defaultHttps || false,
                      request: props.defaultPacket ? props.defaultPacket : originValue,
                      downstreamProxyStr,
                      openFlag: true,
                      fromMITM: props.fromMITM,
                    })
                  }
                >
                  FUZZ
                </YakitButton>
              )}
              {showDefaultExtra && (
                <>
                  <Tooltip title={t('NewHTTPPacketEditor.noWrap')}>
                    <YakitButton
                      size={'small'}
                      type={noWordwrap ? 'text' : 'primary'}
                      icon={<EnterOutlined />}
                      onClick={() => {
                        setNoWordwrap(!noWordwrap)
                      }}
                    />
                  </Tooltip>
                  {!props.noSetIngEditor && (
                    <YakitPopover
                      title={t('NewHTTPPacketEditor.configureEditor')}
                      content={
                        <>
                          <Form
                            onSubmitCapture={(e) => {
                              e.preventDefault()
                            }}
                            size={'small'}
                            layout={'horizontal'}
                            wrapperCol={{ span: 16 }}
                            labelCol={{ span: 8 }}
                          >
                            {(fontSize || 0) > 0 && (
                              <Form.Item label={t('NewHTTPPacketEditor.fontSize')}>
                                <div style={{ display: 'flex', width: 120, gap: 4 }}>
                                  <YakitSelect
                                    options={fontSizeOptions.map((val) => ({
                                      label: val,
                                      value: val,
                                    }))}
                                    value={fontSize}
                                    onChange={(size) => {
                                      setFontSize(size)
                                    }}
                                  />
                                  <span style={{ color: 'var(--Colors-Use-Neutral-Text-1-Title)' }}>px</span>
                                </div>
                              </Form.Item>
                            )}
                            <Form.Item label={t('NewHTTPPacketEditor.fullScreen')} style={{ marginBottom: 4 }}>
                              <YakitButton
                                size={'small'}
                                type={'text'}
                                icon={<FullscreenOutlined />}
                                disabled={props.disableFullscreen}
                                onClick={() => {
                                  showYakitDrawer({
                                    title: t('NewHTTPPacketEditor.fullScreen'),
                                    width: '100%',
                                    content: (
                                      <div
                                        style={{
                                          height: '100%',
                                          width: '100%',
                                        }}
                                      >
                                        <NewHTTPPacketEditor {...props} disableFullscreen={true} defaultHeight={670} />
                                      </div>
                                    ),
                                  })
                                  setPopoverVisible(false)
                                }}
                              />
                            </Form.Item>
                          </Form>
                        </>
                      }
                      onVisibleChange={(v) => {
                        setPopoverVisible(v)
                      }}
                      overlayInnerStyle={{ width: 350 }}
                      visible={popoverVisible}
                    >
                      <YakitButton icon={<SettingOutlined />} type={'text'} size={'small'} />
                    </YakitPopover>
                  )}
                </>
              )}
              {props.extraEnd}
            </div>
          )
        }
        children={
          <>
            {props.children ? (
              <>{props.children}</>
            ) : (
              <div style={{ flex: 1, overflow: 'hidden' }}>
                {empty && props.emptyOr}
                {props.renderHtml || renderHtml}
                {type !== 'hex' && noShowHex && !empty && !renderHtml && !props.renderHtml && (
                  <HTTPPacketYakitEditor
                    fromMITM={props.fromMITM}
                    keepSearchName={keepSearchName}
                    theme={props.theme}
                    noLineNumber={props.noLineNumber}
                    lineNumbersMinChars={props.lineNumbersMinChars}
                    noMiniMap={editorDowngradeProps.noMinimap}
                    type={editorDowngradeProps.language}
                    originValue={isTruncated ? monacoOriginValue : showValue}
                    value={
                      isTruncated ? monacoOriginValue : props.readOnly && showValue.length > 0 ? showValue : strValue
                    }
                    readOnly={props.readOnly}
                    disabled={props.disabled}
                    setValue={setStrValue}
                    noWordWrap={editorDowngradeProps.noWordWrap ?? noWordwrap}
                    fontSize={fontSize}
                    showLineBreaks={showLineBreaks}
                    contextMenu={props.contextMenu}
                    noPacketModifier={props.noPacketModifier}
                    noOpenPacketNewWindow={props.noOpenPacketNewWindow}
                    editorDidMount={handleEditorMount}
                    editorOperationRecord={editorOperationRecord}
                    defaultHttps={props.defaultHttps}
                    isWebSocket={props.isWebSocket}
                    webSocketValue={props.webSocketValue}
                    webSocketToServer={props.webSocketToServer}
                    webFuzzerValue={props.webFuzzerValue}
                    webFuzzerCallBack={props.webFuzzerCallBack}
                    editorId={editorId}
                    highLightText={editorHighLightText}
                    highLightFind={editorHighLightFind}
                    isPositionHighLightCursor={isPositionHighLightCursor}
                    highLightFindClass={highLightFindClass}
                    downstreamProxyStr={downstreamProxyStr}
                    url={props.url}
                    downbodyParams={props.downbodyParams}
                    onlyBasicMenu={props.onlyBasicMenu}
                    showDownBodyMenu={props.showDownBodyMenu}
                    noSendToComparer={props.noSendToComparer}
                    onClickUrlMenu={props.onClickUrlMenu}
                    onClickUrlWithoutQueryMenu={props.onClickUrlWithoutQueryMenu}
                    onClickOpenBrowserMenu={props.onClickOpenBrowserMenu}
                    onClickOpenPacketNewWindowMenu={props.onClickOpenPacketNewWindowMenu}
                    fixContentType={props.fixContentType}
                    originalContentType={props.originalContentType}
                    fixContentTypeHoverMessage={props.fixContentTypeHoverMessage}
                    foldBinaryFuzztag={editorDowngradeProps.foldBinaryFuzztag}
                    disableUnicodeDecode={editorDowngradeProps.disableUnicodeDecode}
                    {...props.extraEditorProps}
                  />
                )}
                {(type === 'hex' || !noShowHex) && !empty && !renderHtml && !props.renderHtml && (
                  <HexEditor
                    style={{ fontSize: (fontSize || 12) === 12 ? 16 : fontSize === 16 ? 18 : 20 }}
                    readOnly={true}
                    asciiWidth={18}
                    data={hexValue}
                    overscanCount={0x03}
                    showAscii={true}
                    showColumnLabels={false}
                    showRowLabels={true}
                    highlightColumn={true}
                    theme={targetHexTheme}
                  />
                )}
              </div>
            )}
          </>
        }
      />
    </div>
  )
})

interface NewHTTPCardProps {
  loading?: boolean
  bordered?: boolean
  title?: React.ReactNode
  extra?: React.ReactNode
  children?: React.ReactNode
}

export const NewHTTPCard: React.FC<NewHTTPCardProps> = (props) => {
  const { loading, bordered, title, extra, children } = props
  return (
    <div className={styles['new-http-packet-editor']}>
      <Card
        className={'flex-card'}
        size={'small'}
        loading={loading}
        bordered={bordered}
        style={{ height: '100%', width: '100%', backgroundColor: 'var(--Colors-Use-Basic-Background)' }}
        title={title}
        bodyStyle={{ padding: 0, width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        extra={extra}
      >
        {children}
      </Card>
    </div>
  )
}
