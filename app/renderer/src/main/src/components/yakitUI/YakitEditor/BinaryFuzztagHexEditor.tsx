import type React from 'react'
import { type MutableRefObject, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import HexEditor from 'react-hex-editor'
import oneDarkPro from 'react-hex-editor/themes/oneDarkPro'
import Draggable from 'react-draggable'
import type { TextAreaRef } from 'antd/lib/input/TextArea'
import { useTheme } from '@/hook/useTheme'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitRadioButtons } from '@/components/yakitUI/YakitRadioButtons/YakitRadioButtons'
import { showYakitModal } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import { warn } from '@/utils/notification'
import styles from './BinaryFuzztagModal.module.scss'

type EditMode = 'insert' | 'replace'
type InputFormat = 'hex' | 'ascii'

const INPUT_PLACEHOLDER: Record<InputFormat, string> = {
  hex: '如 ffd8ff..(偶数位hex)',
  ascii: '直接输入文本',
}

const HEX_BYTE_WIDTH = 20
const HEX_ASCII_WIDTH = 10
const HEX_GUTTER_WIDTH = 8
const HEX_LABEL_WIDTH = 64
const HEX_ROW_HEIGHT = 24
const HEX_INLINE_STYLES = {
  byte: { width: HEX_BYTE_WIDTH, height: HEX_ROW_HEIGHT, overflow: 'hidden' },
  ascii: { width: HEX_ASCII_WIDTH, height: HEX_ROW_HEIGHT, overflow: 'hidden' },
  gutter: { width: HEX_GUTTER_WIDTH, height: HEX_ROW_HEIGHT, overflow: 'hidden' },
  offsetLabel: { width: HEX_LABEL_WIDTH, height: HEX_ROW_HEIGHT, overflow: 'hidden' },
  row: { height: HEX_ROW_HEIGHT, overflow: 'hidden' },
}

export interface BinaryFuzztagHexEditorProps {
  // 共享字节缓冲：编辑直接原地修改它，宿主据此提交。多模式(文本/HEX)间靠它共享同一份数据
  dataRef: MutableRefObject<Uint8Array>
  readOnly?: boolean
  // 数据发生任何修改后通知宿主（用于刷新头部预览、标记"被修改"）
  onChange?: () => void
  // 挂载后应用的初始选区（字节闭区间；文字→HEX 切换时带入并自动弹出编辑面板）
  initialSelection?: [number, number]
}

// 询问超出选区时的处理方式
const askOverflow = (): Promise<'append' | 'discard' | 'cancel'> =>
  new Promise((resolve) => {
    const m = showYakitModal({
      title: '内容超出替换部分',
      width: 460,
      footer: null,
      onCancel: () => {
        resolve('cancel')
        m.destroy()
      },
      content: (
        <div className={styles['overflow-content']}>
          <div className={styles['overflow-message']}>
            输入内容超过所选字节范围，应该继续追加多余部分，还是放弃多余部分？
          </div>
          <div className={styles['overflow-actions']}>
            <YakitButton
              type="outline2"
              onClick={() => {
                resolve('cancel')
                m.destroy()
              }}
            >
              取消
            </YakitButton>
            <YakitButton
              type="outline1"
              onClick={() => {
                resolve('discard')
                m.destroy()
              }}
            >
              放弃多余
            </YakitButton>
            <YakitButton
              type="primary"
              onClick={() => {
                resolve('append')
                m.destroy()
              }}
            >
              继续追加
            </YakitButton>
          </div>
        </div>
      ),
    })
  })

// 可复用的二进制 HEX 编辑体：支持 原地覆盖(键盘) + 选中/右键弹出可拖拽编辑面板
// 面板定位在选区末字节的正下方（不遮挡选区），Draggable nodeRef 可拖拽（React 19 兼容）
// 关键词: binary fuzztag, hex editor, insert mode, replace mode, 复用编辑器
// 被 BinaryFuzztagHexModal(Binary/unquote) 与 Base64HexFuzztagModal(base64/hex 的 HEX 模式) 共用
export const BinaryFuzztagHexEditor: React.FC<BinaryFuzztagHexEditorProps> = (props) => {
  const { dataRef, readOnly = false, onChange, initialSelection } = props
  const { theme } = useTheme()

  type HexEditorHandle = React.ComponentRef<typeof HexEditor>
  const editorRef = useRef<HexEditorHandle | null>(null)
  // 编辑面板的文本框：切换 HEX/ASCII 时直接改原生 placeholder（面板非受控，不触发重渲染）
  const panelInputRef = useRef<TextAreaRef>(null)
  // 面板输入值（非受控，onChange 写入此对象；applyEdit 时读取）
  const panelRef = useRef({ format: 'hex' as InputFormat, value: '' })
  // hex-body 容器 ref：面板的定位基准
  const bodyRef = useRef<HTMLDivElement>(null)
  // Draggable nodeRef（React 19 必须传，否则调已删除的 findDOMNode）
  const popRef = useRef<HTMLDivElement>(null)

  // version 触发长度刷新，nonce 触发 react-hex-editor 原地刷新
  const [, setVersion] = useState<number>(0)
  const [nonce, setNonce] = useState<number>(0)

  // 面板显示位置（相对 hex-body 像素坐标）+ 选区首字节 top + 选区提示文本快照；null = 关闭
  const [panel, setPanel] = useState<{ x: number; y: number; selTop: number | null; hint: string } | null>(null)

  // 选区（通过 DOM data-offset 读取，闭区间）
  const selStartRef = useRef<number | null>(null)
  const selEndRef = useRef<number | null>(null)
  const draggingRef = useRef<boolean>(false)

  const getOffsetFromEvent = (e: React.MouseEvent): number | null => {
    const el = (e.target as HTMLElement)?.closest?.('[data-offset]')
    if (!el) {
      return null
    }
    const v = el.getAttribute('data-offset')
    if (v == null) {
      return null
    }
    const n = parseInt(v, 10)
    return Number.isNaN(n) ? null : n
  }

  const applySelection = (lo: number, hi: number) => {
    selStartRef.current = lo
    selEndRef.current = hi
    requestAnimationFrame(() => {
      editorRef.current?.setSelectionRange(lo, hi + 1, null, false)
    })
  }

  // 打开编辑面板：初始放在选区末字节下方，选区提示一次性算快照；渲染后由 layout effect 按实测高度做三分支校正
  const openPanel = (lastEl: Element, firstEl: Element | null) => {
    const body = bodyRef.current
    if (!body) {
      return
    }
    const bodyRect = body.getBoundingClientRect()
    const r = lastEl.getBoundingClientRect()
    // 选区首字节 top（翻到上方时以此为准，面板完全在选区之上不挡内容）
    const selTop = firstEl ? firstEl.getBoundingClientRect().top - bodyRect.top : null
    // x 轴限制在容器内（面板固定宽 360）
    const x = Math.max(4, Math.min(r.left - bodyRect.left, bodyRect.width - 364))
    // 选区提示快照（面板打开后选区不会再变，无需响应式 state）
    const s = selStartRef.current
    const e = selEndRef.current
    const hint =
      s != null && e != null
        ? `选区: 0x${Math.min(s, e).toString(16)} - 0x${Math.max(s, e).toString(16)} (len ${Math.abs(e - s) + 1})`
        : '请先选中要替换的字节'
    panelRef.current = { format: 'hex', value: '' }
    setPanel({ x, y: r.bottom - bodyRect.top + 4, selTop, hint })
  }

  // 面板渲染后校正 y（参考 showByRightContext genY 三分支，用实测高度不靠估算）：
  // 1. 下方放得下 → 保持下方；2. 下方溢出且选区上方够 → 翻到选区首字节上方（不挡选区内容）；
  // 3. 上下都放不下 → 贴容器底部
  useLayoutEffect(() => {
    if (!panel || !popRef.current || !bodyRef.current) {
      return
    }
    const popH = popRef.current.offsetHeight
    const maxY = bodyRef.current.clientHeight - popH - 4
    if (panel.y <= maxY) {
      return // 下方放得下
    }
    const aboveY = panel.selTop != null ? panel.selTop - popH - 4 : null
    const nextY = aboveY != null && aboveY >= 4 ? aboveY : Math.max(4, maxY)
    if (nextY !== panel.y) {
      setPanel({ ...panel, y: nextY })
    }
  }, [panel])

  // 从当前选区定位打开面板（rAF 等选区渲染到 DOM 后取末字节与首字节 rect）
  const openPanelAtSelection = () => {
    const lo = selStartRef.current != null ? Math.min(selStartRef.current, selEndRef.current ?? 0) : null
    const hi = selStartRef.current != null ? Math.max(selStartRef.current, selEndRef.current ?? 0) : null
    requestAnimationFrame(() => {
      const last = hi != null ? bodyRef.current?.querySelector(`[data-offset="${hi}"]`) : null
      if (last) {
        const first = lo != null ? bodyRef.current?.querySelector(`[data-offset="${lo}"]`) : null
        openPanel(last, first ?? null)
      }
    })
  }

  // 键盘原地覆盖
  const handleSetValue = useCallback(
    (offset: number, value: number) => {
      if (readOnly) {
        return
      }
      dataRef.current[offset] = value
      setNonce((v) => v + 1)
      onChange?.()
    },
    [readOnly, dataRef, onChange],
  )

  const spliceData = (start: number, deleteCount: number, insert: Uint8Array) => {
    const cur = dataRef.current
    const next = new Uint8Array(cur.length - deleteCount + insert.length)
    next.set(cur.slice(0, start), 0)
    next.set(insert, start)
    next.set(cur.slice(start + deleteCount), start + insert.length)
    dataRef.current = next
    setVersion((v) => v + 1)
    setNonce((v) => v + 1)
    onChange?.()
  }

  const parseInput = (inputFormat: InputFormat, inputValue: string): Uint8Array | null => {
    if (inputFormat === 'hex') {
      const hex = inputValue.replace(/\s+/g, '')
      if (hex.length === 0) {
        return new Uint8Array()
      }
      if (hex.length % 2 !== 0 || /[^0-9a-fA-F]/.test(hex)) {
        warn('invalid hex input, expect even-length hex string')
        return null
      }
      const arr = new Uint8Array(hex.length / 2)
      for (let i = 0; i < arr.length; i++) {
        arr[i] = parseInt(hex.substr(i * 2, 2), 16)
      }
      return arr
    }
    return new TextEncoder().encode(inputValue)
  }

  const applyEdit = async (mode: EditMode): Promise<boolean> => {
    if (readOnly) {
      return false
    }
    const input = parseInput(panelRef.current.format, panelRef.current.value)
    if (!input) {
      return false
    }
    if (input.length === 0) {
      warn('input is empty')
      return false
    }
    if (mode === 'insert') {
      const pos =
        selStartRef.current == null
          ? dataRef.current.length
          : Math.min(selStartRef.current, selEndRef.current ?? selStartRef.current)
      spliceData(pos, 0, input)
      setPanel(null)
      return true
    }
    // replace
    if (selStartRef.current == null || selEndRef.current == null) {
      warn('please select bytes to replace in the hex view first')
      return false
    }
    const lo = Math.min(selStartRef.current, selEndRef.current)
    const hi = Math.max(selStartRef.current, selEndRef.current)
    const selLen = hi - lo + 1
    if (input.length > selLen) {
      const choice = await askOverflow()
      if (choice === 'cancel') {
        return false
      }
      if (choice === 'append') {
        spliceData(lo, selLen, input)
      } else {
        spliceData(lo, selLen, input.slice(0, selLen))
      }
    } else {
      spliceData(lo, selLen, input)
    }
    setPanel(null)
    return true
  }

  const handleHexMouseDown = (e: React.MouseEvent) => {
    // 点击面板外关闭（面板自身 stopPropagation 不冒泡到这）
    if (panel && !(e.target as HTMLElement)?.closest?.(`.${styles['hex-edit-pop']}`)) {
      setPanel(null)
    }
    const off = getOffsetFromEvent(e)
    if (off == null) {
      return
    }
    e.preventDefault()
    if (e.button !== 0 || e.ctrlKey) return
    selStartRef.current = off
    selEndRef.current = off
    draggingRef.current = true
  }
  const handleHexMouseMove = (e: React.MouseEvent) => {
    if (!draggingRef.current) {
      return
    }
    const off = getOffsetFromEvent(e)
    if (off == null) {
      return
    }
    e.preventDefault()
    if (selEndRef.current === off) {
      return
    }
    selEndRef.current = off
  }
  const handleHexMouseUp = (e: React.MouseEvent) => {
    if (!draggingRef.current) {
      return
    }
    const off = getOffsetFromEvent(e)
    if (off != null) {
      e.preventDefault()
      selEndRef.current = off
    }
    draggingRef.current = false
    // 选中结束弹出编辑面板（定位在选区末字节下方）
    if (!readOnly) {
      openPanelAtSelection()
    }
  }

  // 右键：无选区时先以右键命中的字节为锚点选中，再弹编辑面板
  const handleHexContextMenu = (e: React.MouseEvent) => {
    if (readOnly) {
      return
    }
    e.preventDefault()
    const off = getOffsetFromEvent(e)
    if (off != null && (selStartRef.current == null || selEndRef.current == null)) {
      applySelection(off, off)
    }
    openPanelAtSelection()
  }

  // 文字→HEX 切换（携带 initialSelection）时：应用选区并弹出编辑面板（仅一次）
  useEffect(() => {
    if (!initialSelection) {
      return
    }
    applySelection(initialSelection[0], initialSelection[1])
    openPanelAtSelection()
  }, [])

  const targetHexTheme = useMemo(() => {
    return theme === 'dark' ? { hexEditor: oneDarkPro } : undefined
  }, [theme])

  return (
    <div className={styles['hex-editor-root']}>
      <div
        ref={bodyRef}
        className={styles['hex-body']}
        onMouseDownCapture={handleHexMouseDown}
        onMouseMoveCapture={handleHexMouseMove}
        onMouseUpCapture={handleHexMouseUp}
        onContextMenu={handleHexContextMenu}
        onDragStart={(e) => e.preventDefault()}
      >
        <div className={styles['hex-editor-surface']}>
          <HexEditor
            ref={editorRef}
            data={dataRef.current}
            nonce={nonce}
            readOnly={readOnly}
            onSetValue={handleSetValue}
            byteWidth={HEX_BYTE_WIDTH}
            asciiWidth={HEX_ASCII_WIDTH}
            gutterWidth={HEX_GUTTER_WIDTH}
            labelWidth={HEX_LABEL_WIDTH}
            rowHeight={HEX_ROW_HEIGHT}
            inlineStyles={HEX_INLINE_STYLES}
            overscanCount={0x08}
            showAscii={true}
            showColumnLabels={true}
            showRowLabels={true}
            highlightColumn={true}
            theme={targetHexTheme}
          />
        </div>
        {/* 可拖拽编辑面板：绝对定位在 hex-body 内选区末字节下方；nodeRef 兼容 React 19，bounds 限制在容器内 */}
        {panel && (
          <Draggable nodeRef={popRef} bounds="parent" handle={`.${styles['hex-edit-pop-drag']}`}>
            <div
              ref={popRef}
              className={styles['hex-edit-pop']}
              style={{ left: panel.x, top: panel.y }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className={styles['hex-edit-pop-drag']} />
              <YakitRadioButtons
                buttonStyle="solid"
                defaultValue="hex"
                onChange={(e) => {
                  panelRef.current.format = e.target.value as InputFormat
                  const el = panelInputRef.current?.resizableTextArea?.textArea
                  if (el) {
                    el.placeholder = INPUT_PLACEHOLDER[panelRef.current.format]
                  }
                }}
                options={[
                  { label: 'HEX', value: 'hex' },
                  { label: 'ASCII', value: 'ascii' },
                ]}
              />
              <YakitInput.TextArea
                ref={panelInputRef}
                className={styles['hex-panel-input']}
                rows={1}
                autoFocus
                placeholder={INPUT_PLACEHOLDER.hex}
                onChange={(e) => {
                  panelRef.current.value = e.target.value
                }}
                onPressEnter={() => applyEdit('replace')}
              />
              <div className={styles['hex-hint']}>{panel.hint}</div>
              <div className={styles['hex-panel-footer']}>
                <YakitButton type="outline2" size="small" onClick={() => applyEdit('insert')}>
                  插入
                </YakitButton>
                <YakitButton type="primary" size="small" onClick={() => applyEdit('replace')}>
                  替换
                </YakitButton>
              </div>
            </div>
          </Draggable>
        )}
      </div>
    </div>
  )
}
