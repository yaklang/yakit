import { monaco } from 'react-monaco-editor'
import { editor as newEditor } from 'monaco-editor'
import IModelDecoration = newEditor.IModelDecoration
import {
  BinaryFuzztagEntry,
  buildChipLabel,
  findPlaceholderOffsets,
} from '../binaryFuzztag'
import { YakitIModelDecoration, YakitIMonacoEditor } from '../YakitEditorType'
import { HighLightText } from '../YakitEditorType'
import { Selection } from '@/pages/yakRunner/RunnerTabs/RunnerTabsType'
import { TFunction } from '@/i18n/useI18nNamespaces'

export interface GenerateDecorationsParams {
  model: monaco.editor.ITextModel
  editor: YakitIMonacoEditor
  type?: string
  showHostHint?: boolean
  /** 隐私模式 */
  privacy: boolean | undefined
  /** 是否禁用Unicode解码 */
  disableUnicodeDecode: boolean | undefined
  /** 高亮显示配置 */
  highLightText: (HighLightText[] | Selection[]) | (() => HighLightText[] | Selection[])
  highLightClass?: string
  highLightFind: (HighLightText[] | Selection[]) | (() => HighLightText[] | Selection[])
  highLightFindClass?: string
  /** Content-Type 修正 */
  fixContentType: string | undefined
  originalContentType: string | undefined
  fixContentTypeHoverMessage: string | undefined
  /** 二进制 Fuzztag 折叠 */
  foldBinaryEnabled: boolean
  binaryFoldEntriesRef: React.MutableRefObject<Map<string, BinaryFuzztagEntry>>
  binaryFoldRangesRef: React.MutableRefObject<{ id: string; range: monaco.Range; ordinal: number }[]>
  binaryModifiedOrdinalsRef: React.MutableRefObject<Set<number>>
  /** i18n */
  language: string
  /** i18n t function */
  t: TFunction
  /** 隐私遮挡范围更新回调（原代码直接赋值 privacyMaskRangesRef.current） */
  onPrivacyRanges?: (ranges: { id: string; range: monaco.Range }[]) => void
}

/**
 * 生成编辑器装饰器（decorations）
 *
 * 包含：
 * 1. HTTP content-length / Host 提示 / 隐私打码
 * 2. Unicode 解码提示
 * 3. Content-Type 修正提示
 * 4. 换行符可视字符
 * 5. 高亮文本/查找
 * 6. 二进制 Fuzztag 折叠小块
 */
export const generateDecorations = (params: GenerateDecorationsParams): YakitIModelDecoration[] => {
  const {
    model,
    editor,
    type,
    showHostHint,
    privacy,
    disableUnicodeDecode,
    highLightText,
    highLightClass,
    highLightFind,
    highLightFindClass,
    fixContentType,
    originalContentType,
    fixContentTypeHoverMessage,
    foldBinaryEnabled,
    binaryFoldEntriesRef,
    binaryFoldRangesRef,
    binaryModifiedOrdinalsRef,
    language,
    t,
  } = params

  const dec: YakitIModelDecoration[] = []

  const endsp = model.getPositionAt(1800)
  const text =
    endsp.lineNumber === 1
      ? model.getValueInRange({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: 1,
          endColumn: endsp.column,
        })
      : model.getValueInRange({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: endsp.lineNumber,
          endColumn: endsp.column,
        })

  if (type === 'http') {
    ;(() => {
      try {
        //http
        ;[{ regexp: /\nContent-Length:\s*?\d+/, classType: 'content-length' }].map((detail) => {
          // handle content-length
          const match = detail.regexp.exec(text)
          if (!match) {
            return
          }
          const start = model.getPositionAt(match.index)
          const end = model.getPositionAt(match.index + match[0].indexOf(':'))
          dec.push({
            id: detail.classType + match.index,
            ownerId: 0,
            range: new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
            options: {
              afterContentClassName: `${detail.classType} lang-${language}`,
            },
          } as YakitIModelDecoration)
        })
      } catch (e) {}
    })()
    ;(() => {
      try {
        if (!showHostHint) return
        const fullText = model.getValue()
        const hostRegex = /\nHost:\s*?([^\r\n]+)/
        const hostMatch = hostRegex.exec(fullText)
        if (!hostMatch) return

        const fullMatch = hostMatch[0]
        const hostColonIndex = hostMatch.index + fullMatch.indexOf(':')
        const hostLabelStart = model.getPositionAt(hostMatch.index)
        const hostLabelEnd = model.getPositionAt(hostColonIndex + 1)

        // 添加 Host 标签装饰器（? 标记）
        dec.push({
          id: `host-label-${hostMatch.index}`,
          ownerId: 0,
          range: new monaco.Range(
            hostLabelStart.lineNumber,
            hostLabelStart.column,
            hostLabelEnd.lineNumber,
            hostLabelEnd.column,
          ),
          options: {
            afterContentClassName: `host lang-${language}`,
          },
        } as YakitIModelDecoration)

        if (!privacy) return

        // 提取并处理 Host 值
        const hostValue = hostMatch[1].trim()
        if (!hostValue) return

        const colonIndex = hostValue.indexOf(':')
        const hostname = colonIndex > 0 ? hostValue.substring(0, colonIndex) : hostValue
        if (!hostname) return

        // 构建搜索模式（hostname、hostname:port、不带www的域名）
        const patterns = [hostname]
        if (colonIndex > 0) patterns.push(hostValue)
        if (hostname.toLowerCase().startsWith('www.')) {
          const withoutWww = hostname.substring(4)
          if (withoutWww) patterns.push(withoutWww)
        }

        // 使用正则一次性查找所有匹配
        const escapedPatterns = patterns.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        const searchRegex = new RegExp(escapedPatterns.join('|'), 'g')

        const matches: { index: number; length: number }[] = []
        let match: RegExpExecArray | null
        while ((match = searchRegex.exec(fullText)) !== null) {
          matches.push({ index: match.index, length: match[0].length })
        }

        // 去重重叠匹配（保留较长的）
        const filtered = matches
          .sort((a, b) => (a.index !== b.index ? a.index - b.index : b.length - a.length))
          .filter((curr, idx, arr) => idx === 0 || curr.index >= arr[idx - 1].index + arr[idx - 1].length)

        // 获取光标位置用于判断是否显示遮罩
        const cursorPos = editor.getPosition()
        const newPrivacyRanges: { id: string; range: monaco.Range }[] = []

        filtered.forEach((m, idx) => {
          const start = model.getPositionAt(m.index)
          const end = model.getPositionAt(m.index + m.length)
          const range = new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column)
          const decorationId = `host-privacy-${idx}`

          newPrivacyRanges.push({ id: decorationId, range })

          // 光标在范围内则不显示遮罩
          const isCursorIn =
            cursorPos?.lineNumber === start.lineNumber &&
            cursorPos.column >= start.column &&
            cursorPos.column <= end.column

          if (!isCursorIn) {
            dec.push({
              id: decorationId,
              ownerId: 0,
              range,
              options: {
                inlineClassName: `host-privacy-mask-hidden lang-${language}`,
                stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
              },
            } as YakitIModelDecoration)
          }
        })

        // 注意：privacyMaskRangesRef 的更新由调用方处理
        // 这里通过返回值无法直接更新 ref，所以调用方需要在外层处理
        // 但原代码是直接赋值 privacyMaskRangesRef.current = newPrivacyRanges
        // 为了保持行为一致，我们需要一个回调
        params.onPrivacyRanges?.(newPrivacyRanges)
      } catch (e) {}
    })()
  }
  const needDecode = type && ['html', 'http', 'json'].includes(type)
  if (needDecode && !disableUnicodeDecode) {
    ;(() => {
      // http html json
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
        dec.push({
          id: 'decode' + match.index,
          ownerId: 1,
          range: new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
          options: {
            className: 'unicode-decode',
            hoverMessage: { value: decoded },
            afterContentClassName: 'unicode-decode',
            after: { content: decoded, inlineClassName: 'unicode-decode-after' },
          },
        } as IModelDecoration)
      }
    })()
  }

  ;(() => {
    const targetValue = fixContentType
    if (!targetValue) return
    const text = model.getValue()
    let match

    // 匹配 Content-Type: 后面的值
    const regex = /Content-Type:\s*([^\r\n]*)/gi

    while ((match = regex.exec(text)) !== null) {
      const contentTypeValue = match[1].trim() // 获取 Content-Type 后的值并去除多余空格
      if (contentTypeValue === targetValue) {
        // 计算 Content-Type: 后具体值的起始位置，避免空格问题
        const textBeforeMatch = text.substring(match.index, regex.lastIndex) // 获取匹配到的完整文本
        const contentStartIndex = match.index + textBeforeMatch.indexOf(contentTypeValue) // 确保起始位置精确匹配

        const start = model.getPositionAt(contentStartIndex)
        const end = model.getPositionAt(match.index + match[0].length)

        dec.push({
          id: 'decode' + match.index,
          ownerId: 1,
          range: new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
          options: {
            className: 'unicode-decode',
            hoverMessage: { value: fixContentTypeHoverMessage },
            afterContentClassName: 'unicode-decode',
            after: {
              content:
                originalContentType === ''
                  ? t('YakitEditor.emptyContentTypeAutoDetected')
                  : originalContentType,
              inlineClassName: 'unicode-decode-after',
            },
          },
        } as IModelDecoration)
      }
    }
  })()
  ;(() => {
    // all
    const keywordRegExp = /\r?\n/g
    let match
    let count = 0
    while ((match = keywordRegExp.exec(text)) !== null) {
      count++
      const start = model.getPositionAt(match.index)
      const className: 'crlf' | 'lf' = match[0] === '\r\n' ? 'crlf' : 'lf'
      const end = model.getPositionAt(match.index + match[0].length)
      dec.push({
        id: 'keyword' + match.index,
        ownerId: 2,
        range: new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
        options: { beforeContentClassName: className },
      } as YakitIModelDecoration)
      if (count > 19) {
        return
      }
    }
  })()

  function highLightRange(item) {
    const { startOffset = 0, highlightLength = 0, startLineNumber, startColumn, endLineNumber, endColumn } = item
    let range = {
      startLineNumber: 0,
      startColumn: 0,
      endLineNumber: 0,
      endColumn: 0,
    }
    if (typeof startLineNumber === 'number') {
      range.startLineNumber = startLineNumber
      range.startColumn = startColumn
      range.endLineNumber = endLineNumber
      range.endColumn = endColumn
    } else {
      if (model) {
        // 获取偏移量对应的位置
        const startPosition = model.getPositionAt(Number(startOffset))
        const endPosition = model.getPositionAt(Number(startOffset) + Number(highlightLength))
        range.startLineNumber = startPosition.lineNumber
        range.startColumn = startPosition.column
        range.endLineNumber = endPosition.lineNumber
        range.endColumn = endPosition.column
      }
    }
    return range
  }

  ;(() => {
    //all
    const highLightTextArr = typeof highLightText === 'function' ? highLightText() : highLightText
    highLightTextArr.forEach((item) => {
      const range = highLightRange(item)
      // 创建装饰选项
      dec.push({
        id:
          'hight-light-text_' +
          range.startLineNumber +
          '_' +
          range.startColumn +
          '_' +
          range.endLineNumber +
          '_' +
          range.endColumn,
        ownerId: 3,
        range: new monaco.Range(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn),
        options: {
          isWholeLine: false,
          className: highLightClass ? highLightClass : 'hight-light-default-bg-color',
          hoverMessage: [{ value: item.hoverVal, isTrusted: true }],
        },
      } as IModelDecoration)
    })

    const highLightFindArr = typeof highLightFind === 'function' ? highLightFind() : highLightFind
    highLightFindArr.forEach((item) => {
      const range = highLightRange(item)
      // 创建装饰选项
      dec.push({
        id:
          'hight-light-find_' +
          range.startLineNumber +
          '_' +
          range.startColumn +
          '_' +
          range.endLineNumber +
          '_' +
          range.endColumn,
        ownerId: 3,
        range: new monaco.Range(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn),
        options: {
          isWholeLine: false,
          className: highLightFindClass ? highLightFindClass : 'hight-light-find-default-bg-color',
          hoverMessage: [{ value: '', isTrusted: true }],
        },
      } as IModelDecoration)
    })
  })()

  // 二进制 Fuzztag 折叠：为占位渲染 Binary[..]/File[..] 小块，并记录范围用于点击
  ;(() => {
    if (!foldBinaryEnabled) {
      binaryFoldRangesRef.current = []
      return
    }
    try {
      const fullText = model.getValue()
      const offsets = findPlaceholderOffsets(fullText)
      const newRanges: { id: string; range: monaco.Range; ordinal: number }[] = []
      // index 即"编辑器中第 N 个二进制标签"的序号，按文档顺序；据此判断是否被修改过
      offsets.forEach((off, index) => {
        const entry = binaryFoldEntriesRef.current.get(off.id)
        if (!entry) {
          return
        }
        const changed = binaryModifiedOrdinalsRef.current.has(index)
        const start = model.getPositionAt(off.start)
        const end = model.getPositionAt(off.end)
        const range = new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column)
        newRanges.push({ id: off.id, range, ordinal: index })
        dec.push({
          id: 'binary-fold-' + off.id + '-' + off.start,
          ownerId: 0,
          range,
          options: {
            inlineClassName: 'binary-fuzz-hidden',
            // 关键：声明该 inlineClassName 会改变字符宽度（font-size:0），
            // 强制 monaco 放弃等宽快速路径(FastRenderedViewLine)、改用 DOM 实测，
            // 否则隐藏占位仍按 charWidth*列数 占据光标/选区宽度，表现为 chip 后的可选中空白
            inlineClassNameAffectsLetterSpacing: true,
            after: {
              content: buildChipLabel(entry, changed),
              inlineClassName: changed ? 'binary-fuzz-chip binary-fuzz-chip-changed' : 'binary-fuzz-chip',
              // chip 带 padding/不同字号，宽度非等宽，同样需 DOM 实测以保证光标/选区贴合
              inlineClassNameAffectsLetterSpacing: true,
            },
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
            hoverMessage: {
              value: entry.editable
                ? 'Click to modify: open the helper editor to edit content of any size'
                : 'Click to view (read-only reference)',
            },
          },
        } as YakitIModelDecoration)
      })
      binaryFoldRangesRef.current = newRanges
    } catch (e) {}
  })()

  return dec
}