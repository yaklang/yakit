import React, { useMemo, useRef, useState } from 'react'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { BinaryFuzztagEntry, bytesToHex } from './binaryFuzztag'
import { BinaryFuzztagHexEditor } from './BinaryFuzztagHexEditor'
import { BinaryFuzztagSubmitResult } from './BinaryFuzztagHexModal'
import styles from './BinaryFuzztagModal.module.scss'

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

const utf8ByteLength = (text: string): number => {
  let len = 0
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code <= 0x7f) {
      len += 1
    } else if (code <= 0x7ff) {
      len += 2
    } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const next = text.charCodeAt(i + 1)
      if (next >= 0xdc00 && next <= 0xdfff) {
        len += 4
        i += 1
      } else {
        len += 3
      }
    } else {
      len += 3
    }
  }
  return len
}

const encodeTextHead = (text: string, maxBytes: number): Uint8Array => {
  if (!text) {
    return new Uint8Array()
  }
  const head = Array.from(text).slice(0, maxBytes).join('')
  return encodeText(head).slice(0, maxBytes)
}

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

  const bytePreview = useMemo(() => {
    if (editorType === 'text') {
      return {
        byteLen: utf8ByteLength(text),
        previewHex: bytesToHex(encodeTextHead(text, 8)),
      }
    }
    return {
      byteLen: dataRef.current.length,
      previewHex: bytesToHex(dataRef.current.slice(0, 8)),
    }
  }, [editorType, text, hostVersion])

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
    <div className={styles['modal-root']}>
      <div className={styles['modal-header']}>
        <span>{`${kindLabel}: {{${entry.tagName}(...)}}`}</span>
        <span>{`Bytes: ${bytePreview.byteLen}`}</span>
        <span>{`Head: 0x${bytePreview.previewHex}`}</span>
        <span className={styles['mode-switcher']}>
          <span className={styles['mode-label']}>编辑器:</span>
          {typeBtn('text', '文本')}
          {typeBtn('hex', 'HEX')}
        </span>
        {readOnly && <span className={styles['read-only']}>read-only</span>}
      </div>

      <div className={styles['modal-body-column']}>
        {editorType === 'text' ? (
          <div className={styles['text-pane']}>
            <YakitInput.TextArea
              className={styles['text-area']}
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

      <div className={styles['modal-footer']}>
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
