import React, { MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import HexEditor from 'react-hex-editor'
import oneDarkPro from 'react-hex-editor/themes/oneDarkPro'
import { useTheme } from '@/hook/useTheme'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { showYakitModal } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import { warn } from '@/utils/notification'
import styles from './BinaryFuzztagModal.module.scss'

type EditMode = 'insert' | 'replace'
type InputFormat = 'hex' | 'ascii'

export interface BinaryFuzztagHexEditorProps {
  // 共享字节缓冲：编辑直接原地修改它，宿主据此提交。多模式(文本/HEX)间靠它共享同一份数据
  dataRef: MutableRefObject<Uint8Array>
  readOnly?: boolean
  // 数据发生任何修改后通知宿主（用于刷新头部预览、标记"被修改"）
  onChange?: () => void
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

// 可复用的二进制 HEX 编辑体：支持 原地覆盖(键盘) + 插入/替换 双模式(面板)
// 关键词: binary fuzztag, hex editor, insert mode, replace mode, 复用编辑器
// 被 BinaryFuzztagHexModal(Binary/unquote) 与 Base64HexFuzztagModal(base64/hex 的 HEX 模式) 共用
export const BinaryFuzztagHexEditor: React.FC<BinaryFuzztagHexEditorProps> = (props) => {
  const { dataRef, readOnly = false, onChange } = props
  const { theme } = useTheme()

  // version 触发长度刷新，nonce 触发 react-hex-editor 原地刷新
  const [, setVersion] = useState<number>(0)
  const [nonce, setNonce] = useState<number>(0)

  const [mode, setMode] = useState<EditMode>('replace')
  const [inputFormat, setInputFormat] = useState<InputFormat>('hex')
  const [inputValue, setInputValue] = useState<string>('')

  // 选区（通过 DOM data-offset 读取，闭区间）
  const selStartRef = useRef<number | null>(null)
  const selEndRef = useRef<number | null>(null)
  const draggingRef = useRef<boolean>(false)
  const selDisplayRafRef = useRef<number | null>(null)
  const [selDisplay, setSelDisplay] = useState<string>('')

  const refreshSelDisplay = useCallback(() => {
    const s = selStartRef.current
    const e = selEndRef.current
    if (s == null || e == null) {
      setSelDisplay((prev) => (prev === '' ? prev : ''))
      return
    }
    const lo = Math.min(s, e)
    const hi = Math.max(s, e)
    const next = `0x${lo.toString(16)} - 0x${hi.toString(16)} (len ${hi - lo + 1})`
    setSelDisplay((prev) => (prev === next ? prev : next))
  }, [])

  const scheduleSelDisplay = useCallback(() => {
    if (selDisplayRafRef.current !== null) {
      return
    }
    selDisplayRafRef.current = requestAnimationFrame(() => {
      selDisplayRafRef.current = null
      refreshSelDisplay()
    })
  }, [refreshSelDisplay])

  useEffect(() => {
    return () => {
      if (selDisplayRafRef.current !== null) {
        cancelAnimationFrame(selDisplayRafRef.current)
      }
    }
  }, [])

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

  const handleHexMouseDown = (e: React.MouseEvent) => {
    const off = getOffsetFromEvent(e)
    if (off == null) {
      return
    }
    selStartRef.current = off
    selEndRef.current = off
    draggingRef.current = true
    refreshSelDisplay()
  }
  const handleHexMouseMove = (e: React.MouseEvent) => {
    if (!draggingRef.current) {
      return
    }
    const off = getOffsetFromEvent(e)
    if (off == null) {
      return
    }
    if (selEndRef.current === off) {
      return
    }
    selEndRef.current = off
    scheduleSelDisplay()
  }
  const handleHexMouseUp = (e: React.MouseEvent) => {
    if (!draggingRef.current) {
      return
    }
    const off = getOffsetFromEvent(e)
    if (off != null) {
      selEndRef.current = off
    }
    draggingRef.current = false
    refreshSelDisplay()
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

  const parseInput = (): Uint8Array | null => {
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

  const applyEdit = async () => {
    if (readOnly) {
      return
    }
    const input = parseInput()
    if (!input) {
      return
    }
    if (input.length === 0) {
      warn('input is empty')
      return
    }
    if (mode === 'insert') {
      const pos =
        selStartRef.current == null
          ? dataRef.current.length
          : Math.min(selStartRef.current, selEndRef.current ?? selStartRef.current)
      spliceData(pos, 0, input)
      setInputValue('')
      return
    }
    // replace
    if (selStartRef.current == null || selEndRef.current == null) {
      warn('please select bytes to replace in the hex view first')
      return
    }
    const lo = Math.min(selStartRef.current, selEndRef.current)
    const hi = Math.max(selStartRef.current, selEndRef.current)
    const selLen = hi - lo + 1
    if (input.length > selLen) {
      const choice = await askOverflow()
      if (choice === 'cancel') {
        return
      }
      if (choice === 'append') {
        spliceData(lo, selLen, input)
      } else {
        spliceData(lo, selLen, input.slice(0, selLen))
      }
    } else {
      spliceData(lo, selLen, input)
    }
    setInputValue('')
  }

  const targetHexTheme = useMemo(() => {
    return theme === 'dark' ? { hexEditor: oneDarkPro } : undefined
  }, [theme])

  const modeBtn = (m: EditMode, label: string) => (
    <YakitButton type={mode === m ? 'primary' : 'outline2'} size="small" onClick={() => setMode(m)}>
      {label}
    </YakitButton>
  )
  const fmtBtn = (f: InputFormat, label: string) => (
    <YakitButton type={inputFormat === f ? 'primary' : 'outline2'} size="small" onClick={() => setInputFormat(f)}>
      {label}
    </YakitButton>
  )

  return (
    <div className={styles['hex-editor-root']}>
      {!readOnly && (
        <div className={styles['hex-toolbar']}>
          <span className={styles['hex-toolbar-label']}>模式:</span>
          {modeBtn('insert', '插入')}
          {modeBtn('replace', '替换')}
          <span className={`${styles['hex-toolbar-label']} ${styles['hex-toolbar-label-spaced']}`}>输入:</span>
          {fmtBtn('hex', 'HEX')}
          {fmtBtn('ascii', 'ASCII')}
          <YakitInput
            className={styles['hex-input']}
            size="small"
            value={inputValue}
            placeholder={inputFormat === 'hex' ? '如 ffd8ff..(偶数位hex)' : '直接输入文本'}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <YakitButton type="primary" size="small" onClick={applyEdit}>
            应用
          </YakitButton>
          <span className={styles['hex-hint']}>
            {mode === 'replace'
              ? selDisplay
                ? `选区: ${selDisplay}`
                : '请在下方选中要替换的字节'
              : selDisplay
                ? `插入位置: 0x${Math.min(selStartRef.current ?? 0, selEndRef.current ?? 0).toString(16)}`
                : '插入到末尾(可在下方点击定位)'}
          </span>
        </div>
      )}

      <div
        className={styles['hex-body']}
        onMouseDownCapture={handleHexMouseDown}
        onMouseMoveCapture={handleHexMouseMove}
        onMouseUpCapture={handleHexMouseUp}
      >
        <HexEditor
          columns={16}
          data={dataRef.current}
          nonce={nonce}
          readOnly={readOnly}
          onSetValue={handleSetValue}
          overscanCount={0x03}
          showAscii={true}
          showColumnLabels={true}
          showRowLabels={true}
          highlightColumn={true}
          theme={targetHexTheme}
        />
      </div>
    </div>
  )
}
