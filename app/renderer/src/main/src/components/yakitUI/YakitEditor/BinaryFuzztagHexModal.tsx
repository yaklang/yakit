import React, { useCallback, useMemo, useRef, useState } from 'react'
import HexEditor from 'react-hex-editor'
import oneDarkPro from 'react-hex-editor/themes/oneDarkPro'
import { useTheme } from '@/hook/useTheme'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { showYakitModal } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import { warn } from '@/utils/notification'
import { BinaryFuzztagEntry, BinaryChangeInfo, bytesToHex } from './binaryFuzztag'

export interface BinaryFuzztagSubmitResult {
  changed: boolean
  change: BinaryChangeInfo
}

export interface BinaryFuzztagHexModalProps {
  entry: BinaryFuzztagEntry
  initialData: Uint8Array
  readOnly?: boolean
  onSubmit: (bytes: Uint8Array, result: BinaryFuzztagSubmitResult) => void
  onCancel: () => void
}

type EditMode = 'insert' | 'replace'
type InputFormat = 'hex' | 'ascii'

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
        <div style={{ padding: 16 }}>
          <div style={{ marginBottom: 16 }}>输入内容超过所选字节范围，应该继续追加多余部分，还是放弃多余部分？</div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
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

// 二进制 Fuzztag HEX 编辑弹窗：支持 原地覆盖(键盘) + 插入/替换 双模式(面板)，提交回传修改后的字节与改动统计
// 关键词: binary fuzztag, hex editor, insert mode, replace mode, unquote 编辑
export const BinaryFuzztagHexModal: React.FC<BinaryFuzztagHexModalProps> = (props) => {
  const { entry, initialData, readOnly = false, onSubmit, onCancel } = props
  const { theme } = useTheme()

  // data 可变可替换；version 触发长度刷新，nonce 触发 react-hex-editor 原地刷新
  const dataRef = useRef<Uint8Array>(initialData)
  const [version, setVersion] = useState<number>(0)
  const [nonce, setNonce] = useState<number>(0)

  const [mode, setMode] = useState<EditMode>('replace')
  const [inputFormat, setInputFormat] = useState<InputFormat>('hex')
  const [inputValue, setInputValue] = useState<string>('')

  // 选区（通过 DOM data-offset 读取，闭区间）
  const selStartRef = useRef<number | null>(null)
  const selEndRef = useRef<number | null>(null)
  const draggingRef = useRef<boolean>(false)
  const [selDisplay, setSelDisplay] = useState<string>('')

  // 改动统计
  const addedRef = useRef<number>(0)
  const overriddenRef = useRef<number>(0)
  const removedRef = useRef<number>(0)

  const refreshSelDisplay = useCallback(() => {
    const s = selStartRef.current
    const e = selEndRef.current
    if (s == null || e == null) {
      setSelDisplay('')
      return
    }
    const lo = Math.min(s, e)
    const hi = Math.max(s, e)
    setSelDisplay(`0x${lo.toString(16)} - 0x${hi.toString(16)} (len ${hi - lo + 1})`)
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
    selEndRef.current = off
    refreshSelDisplay()
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
      overriddenRef.current += 1
      setNonce((v) => v + 1)
    },
    [readOnly],
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
      addedRef.current += input.length
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
        overriddenRef.current += selLen
        addedRef.current += input.length - selLen
      } else {
        spliceData(lo, selLen, input.slice(0, selLen))
        overriddenRef.current += selLen
      }
    } else {
      spliceData(lo, selLen, input)
      overriddenRef.current += input.length
      removedRef.current += selLen - input.length
    }
    setInputValue('')
  }

  const targetHexTheme = useMemo(() => {
    return theme === 'dark' ? { hexEditor: oneDarkPro } : undefined
  }, [theme])

  const previewHex = useMemo(() => bytesToHex(dataRef.current.slice(0, 8)), [version, nonce])
  const byteLen = useMemo(() => dataRef.current.length, [version, nonce])

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '64vh' }}>
      <div
        style={{
          padding: '8px 16px',
          fontSize: 12,
          color: 'var(--Colors-Use-Neutral-Text-3-Secondary)',
          borderBottom: '1px solid var(--Colors-Use-Neutral-Border)',
          display: 'flex',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <span>{`Tag: {{${entry.tagName}(...)}}`}</span>
        <span>{`Bytes: ${byteLen}`}</span>
        <span>{`Head: 0x${previewHex}`}</span>
        {readOnly && <span style={{ color: 'var(--Colors-Use-Yellow-Text)' }}>read-only</span>}
      </div>

      {!readOnly && (
        <div
          style={{
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
            borderBottom: '1px solid var(--Colors-Use-Neutral-Border)',
          }}
        >
          <span style={{ fontSize: 12 }}>模式:</span>
          {modeBtn('insert', '插入')}
          {modeBtn('replace', '替换')}
          <span style={{ fontSize: 12, marginLeft: 8 }}>输入:</span>
          {fmtBtn('hex', 'HEX')}
          {fmtBtn('ascii', 'ASCII')}
          <YakitInput
            style={{ flex: 1, minWidth: 160 }}
            size="small"
            value={inputValue}
            placeholder={inputFormat === 'hex' ? '如 ffd8ff..(偶数位hex)' : '直接输入文本'}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <YakitButton type="primary" size="small" onClick={applyEdit}>
            应用
          </YakitButton>
          <span style={{ fontSize: 12, color: 'var(--Colors-Use-Neutral-Text-3-Secondary)' }}>
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
        style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}
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

      <div
        style={{
          padding: '8px 16px',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 8,
          borderTop: '1px solid var(--Colors-Use-Neutral-Border)',
        }}
      >
        <YakitButton type="outline2" onClick={onCancel}>
          取消
        </YakitButton>
        {!readOnly && (
          <YakitButton
            type="primary"
            onClick={() => {
              const change: BinaryChangeInfo = {
                addedCount: addedRef.current,
                overriddenCount: overriddenRef.current,
                removedCount: removedRef.current,
              }
              const changed = change.addedCount > 0 || change.overriddenCount > 0 || change.removedCount > 0
              onSubmit(dataRef.current, { changed, change })
            }}
          >
            提交
          </YakitButton>
        )}
      </div>
    </div>
  )
}
