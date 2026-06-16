import React, { useMemo, useRef, useState } from 'react'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { BinaryFuzztagEntry, bytesToHex } from './binaryFuzztag'
import { BinaryFuzztagHexEditor } from './BinaryFuzztagHexEditor'
import styles from './BinaryFuzztagModal.module.scss'

// 提交结果：只记录是否被修改（不再携带增删改细节）
export interface BinaryFuzztagSubmitResult {
  changed: boolean
}

export interface BinaryFuzztagHexModalProps {
  entry: BinaryFuzztagEntry
  initialData: Uint8Array
  readOnly?: boolean
  onSubmit: (bytes: Uint8Array, result: BinaryFuzztagSubmitResult) => void
  onCancel: () => void
}

// 二进制 Fuzztag HEX 编辑弹窗：用于 Binary(unquote) 标签的字节级编辑
// 关键词: binary fuzztag, hex editor, unquote 编辑
// 编辑主体复用 BinaryFuzztagHexEditor（与 base64/hex 的 HEX 模式共用）
export const BinaryFuzztagHexModal: React.FC<BinaryFuzztagHexModalProps> = (props) => {
  const { entry, initialData, readOnly = false, onSubmit, onCancel } = props

  // 共享字节缓冲（交给可复用编辑器原地修改）
  const dataRef = useRef<Uint8Array>(initialData)
  // 是否发生过修改：编辑器任一编辑动作即置为 true
  const changedRef = useRef<boolean>(false)
  // 数据变更后用它刷新头部预览
  const [hostVersion, setHostVersion] = useState<number>(0)

  const previewHex = useMemo(() => bytesToHex(dataRef.current.slice(0, 8)), [hostVersion])
  const byteLen = useMemo(() => dataRef.current.length, [hostVersion])

  return (
    <div className={styles['modal-root']}>
      <div className={styles['modal-header']}>
        <span>{`Tag: {{${entry.tagName}(...)}}`}</span>
        <span>{`Bytes: ${byteLen}`}</span>
        <span>{`Head: 0x${previewHex}`}</span>
        {readOnly && <span className={styles['read-only']}>read-only</span>}
      </div>

      <div className={styles['modal-body']}>
        <BinaryFuzztagHexEditor
          dataRef={dataRef}
          readOnly={readOnly}
          onChange={() => {
            changedRef.current = true
            setHostVersion((v) => v + 1)
          }}
        />
      </div>

      <div className={styles['modal-footer']}>
        <YakitButton type="outline2" onClick={onCancel}>
          取消
        </YakitButton>
        {!readOnly && (
          <YakitButton
            type="primary"
            onClick={() => {
              onSubmit(dataRef.current, { changed: changedRef.current })
            }}
          >
            提交
          </YakitButton>
        )}
      </div>
    </div>
  )
}
