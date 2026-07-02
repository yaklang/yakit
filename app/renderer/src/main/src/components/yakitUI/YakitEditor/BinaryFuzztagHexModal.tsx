import React, { useCallback, useMemo, useRef, useState } from 'react'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { BinaryFuzztagEntry, bytesToHex, encodeBytesToTag } from './binaryFuzztag'
import { BinaryFuzztagHexEditor } from './BinaryFuzztagHexEditor'
import styles from './BinaryFuzztagModal.module.scss'
import { YakitDropdownMenu } from '../YakitDropdownMenu/YakitDropdownMenu'
import { DocumentDuplicateSvgIcon } from '@/assets/newIcon'
import { OutlineExportIcon } from '@/assets/icon/outline'
import { setClipboardText } from '@/utils/clipboard'
import { yakitNotify } from '@/utils/notification'
import { Uint8ArrayToString } from '@/utils/str'
import { saveABSFileToOpen } from '@/utils/openWebsite'

const { ipcRenderer } = window.require('electron')

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
  const handleCopyMenuClick = async ({ key }: { key: string }) => {
    try {
      switch (key) {
        case 'copy-raw': {
          setClipboardText(Uint8ArrayToString(dataRef.current, 'latin1'))
          return
        }
        case 'copy-base64': {
          const res = await ipcRenderer.invoke('BytesToBase64', { Bytes: dataRef.current })
          const base64 = res?.Base64 || ''
          if (!base64) {
            yakitNotify('error', 'Base64 编码失败')
            return
          }
          setClipboardText(base64)
          return
        }
        case 'copy-hex': {
          const hex = bytesToHex(dataRef.current)
          if (!hex) {
            yakitNotify('error', 'HEX 编码失败')
            return
          }
          setClipboardText(hex)
          return
        }
        default:
          return
      }
    } catch (error) {
      yakitNotify('error', `${error}`)
    }
  }
  const copyMenu = useMemo(
    () => ({
      data: [
        { key: 'copy-raw', label: '复制原始数据' },
        { key: 'copy-base64', label: '复制 Base64 编码后的内容' },
        { key: 'copy-hex', label: '复制HEX编码后内容' },
      ],
      onClick: handleCopyMenuClick,
    }),
    [],
  )
  const handleExportMenuClick = useCallback(
    async ({ key }: { key: string }) => {
      try {
        const timestamp = Date.now()
        switch (key) {
          case 'export-raw': {
            saveABSFileToOpen(`binary-${entry.tagName}-${timestamp}.bin`, dataRef.current)
            return
          }
          case 'export-fuzztag': {
            const tagText = await encodeBytesToTag(entry.kind, entry.tagName, dataRef.current)
            saveABSFileToOpen(`fuzztag-${entry.tagName}-${timestamp}.txt`, tagText)
            return
          }
          default:
            return
        }
      } catch (error) {
        yakitNotify('error', `${error}`)
      }
    },
    [entry.kind, entry.tagName],
  )
  const exportMenu = useMemo(
    () => ({
      data: [
        { key: 'export-raw', label: '导出原始数据' },
        { key: 'export-fuzztag', label: '导出带FuzzTag的数据' },
      ],
      onClick: handleExportMenuClick,
    }),
    [handleExportMenuClick],
  )

  return (
    <div className={styles['modal-root']}>
      <div className={styles['modal-header']}>
        <div>
          <span>{`Tag: {{${entry.tagName}(...)}}`}</span>
          <span>{`Bytes: ${byteLen}`}</span>
          <span>{`Head: 0x${previewHex}`}</span>
          {readOnly && <span className={styles['read-only']}>read-only</span>}
        </div>
        <div className={styles['header-actions']}>
          <YakitDropdownMenu menu={copyMenu}>
            <YakitButton type="outline2" icon={<DocumentDuplicateSvgIcon />}>
              复制
            </YakitButton>
          </YakitDropdownMenu>
          <YakitDropdownMenu menu={exportMenu}>
            <YakitButton type="outline2" icon={<OutlineExportIcon />}>
              导出
            </YakitButton>
          </YakitDropdownMenu>
        </div>
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
