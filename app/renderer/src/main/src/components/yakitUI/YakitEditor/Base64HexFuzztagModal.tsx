import React, { useMemo, useRef, useState } from 'react'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { BinaryFuzztagEntry, bytesToHex } from './binaryFuzztag'
import { BinaryFuzztagHexEditor } from './BinaryFuzztagHexEditor'
import { BinaryFuzztagSubmitResult } from './BinaryFuzztagHexModal'

export interface Base64HexFuzztagModalProps {
  // 仅用于 base64 / hex 两类可编辑标签
  entry: BinaryFuzztagEntry
  initialData: Uint8Array
  readOnly?: boolean
  onSubmit: (bytes: Uint8Array, result: BinaryFuzztagSubmitResult) => void
  onCancel: () => void
}

type EditorType = 'text' | 'hex'

const decodeText = (bytes: Uint8Array): string => {
  try {
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes)
  } catch (e) {
    return ''
  }
}

const encodeText = (text: string): Uint8Array => new TextEncoder().encode(text)

// 字节是否相等：用于判定"是否被修改"（只记是否改过，不记细节）
const bytesEqual = (a: Uint8Array, b: Uint8Array): boolean => {
  if (a.length !== b.length) {
    return false
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false
    }
  }
  return true
}

// Base64 / HexString 公共编辑弹窗：可在 文本 / HEX 两种编辑器间切换，默认文本编辑器
// 关键词: base64 fuzztag, hex fuzztag, text editor, hex editor, 公共编辑组件
// - 文本模式：直接输入修改解码后的内容（最常用）
// - HEX 模式：进入字节级 HEX 编辑器（复用 BinaryFuzztagHexEditor）
// 两模式共享同一份字节缓冲 dataRef，切换时双向同步；提交时按字节 diff 统计改动
export const Base64HexFuzztagModal: React.FC<Base64HexFuzztagModalProps> = (props) => {
  const { entry, initialData, readOnly = false, onSubmit, onCancel } = props

  // 原始字节（用于提交时计算改动），不修改
  const originalRef = useRef<Uint8Array>(initialData)
  // 工作字节缓冲（HEX 模式原地编辑它）；复制一份避免污染原始数据
  const dataRef = useRef<Uint8Array>(new Uint8Array(initialData))

  // 默认文本编辑器；但内容不可打印(无 previewText)时默认 HEX，避免文本模式 UTF-8 往返损坏二进制数据
  const [editorType, setEditorType] = useState<EditorType>(() => (entry.previewText ? 'text' : 'hex'))
  const [text, setText] = useState<string>(() => decodeText(initialData))
  // HEX 编辑器挂载 key：每次切到 HEX 时自增，强制以最新 dataRef.current 重新挂载
  const [hexMountKey, setHexMountKey] = useState<number>(0)
  const [hostVersion, setHostVersion] = useState<number>(0)

  // 当前字节（随模式不同来源不同），用于头部预览
  const curBytes = useMemo<Uint8Array>(() => {
    return editorType === 'text' ? encodeText(text) : dataRef.current
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorType, text, hostVersion])

  const previewHex = useMemo(() => bytesToHex(curBytes.slice(0, 8)), [curBytes])

  const switchTo = (type: EditorType) => {
    if (type === editorType) {
      return
    }
    if (type === 'hex') {
      // 文本 -> HEX：先把文本编码进字节缓冲，再重新挂载 HEX 编辑器
      dataRef.current = encodeText(text)
      setHexMountKey((k) => k + 1)
    } else {
      // HEX -> 文本：把字节缓冲解码回文本
      setText(decodeText(dataRef.current))
    }
    setEditorType(type)
  }

  const handleSubmit = () => {
    const finalBytes = editorType === 'text' ? encodeText(text) : dataRef.current
    onSubmit(finalBytes, { changed: !bytesEqual(originalRef.current, finalBytes) })
  }

  const kindLabel = entry.kind === 'base64' ? 'Base64' : 'HexString'

  const typeBtn = (type: EditorType, label: string) => (
    <YakitButton type={editorType === type ? 'primary' : 'outline2'} size="small" onClick={() => switchTo(type)}>
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
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <span>{`${kindLabel}: {{${entry.tagName}(...)}}`}</span>
        <span>{`Bytes: ${curBytes.length}`}</span>
        <span>{`Head: 0x${previewHex}`}</span>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12 }}>编辑器:</span>
          {typeBtn('text', '文本')}
          {typeBtn('hex', 'HEX')}
        </span>
        {readOnly && <span style={{ color: 'var(--Colors-Use-Yellow-Text)' }}>read-only</span>}
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {editorType === 'text' ? (
          <div style={{ flex: 1, minHeight: 0, padding: 12 }}>
            <YakitInput.TextArea
              style={{ height: '100%', resize: 'none', fontFamily: 'monospace' }}
              value={text}
              readOnly={readOnly}
              placeholder="直接输入要修改的内容（文本将按 UTF-8 编码）"
              onChange={(e) => setText(e.target.value)}
            />
          </div>
        ) : (
          <BinaryFuzztagHexEditor
            key={hexMountKey}
            dataRef={dataRef}
            readOnly={readOnly}
            onChange={() => setHostVersion((v) => v + 1)}
          />
        )}
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
          <YakitButton type="primary" onClick={handleSubmit}>
            提交
          </YakitButton>
        )}
      </div>
    </div>
  )
}
