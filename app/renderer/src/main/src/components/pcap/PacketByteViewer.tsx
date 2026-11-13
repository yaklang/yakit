import { useEffect, useMemo, useRef, useState } from 'react'
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { yakitClipboard } from '@/services/electronBridge'
import type { ByteRange } from './pcapUtils'
import styles from './PCAPPacketViewer.module.scss'

export const PacketByteViewer = ({ bytes, range }: { bytes: Uint8Array; range?: ByteRange }) => {
  const list = useRef<VirtuosoHandle>(null)
  const [mode, setMode] = useState<'hex' | 'text'>('hex')
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState('')
  const text = useMemo(() => (mode === 'text' ? new TextDecoder().decode(bytes) : ''), [bytes, mode])
  useEffect(() => {
    if (range) list.current?.scrollToIndex({ index: Math.floor(range[0] / 16), align: 'center' })
  }, [range, bytes, mode])
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [copied])
  const copy = async () => {
    setCopyError('')
    try {
      await yakitClipboard.setText(
        Array.from(range ? bytes.slice(...range) : bytes, (b) => b.toString(16).padStart(2, '0')).join(' '),
      )
      setCopied(true)
    } catch {
      setCopyError('复制失败，请重试')
    }
  }
  return (
    <section className={styles.bytes} aria-label="数据字节">
      <div className={styles['pane-heading']}>
        <span>
          数据字节 <small>{bytes.length.toLocaleString()} bytes</small>
        </span>
        <div className={styles.actions}>
          <YakitButton type={mode === 'hex' ? 'outline1' : 'text2'} size="small" onClick={() => setMode('hex')}>
            HEX
          </YakitButton>
          <YakitButton type={mode === 'text' ? 'outline1' : 'text2'} size="small" onClick={() => setMode('text')}>
            UTF-8
          </YakitButton>
          <YakitButton type="text2" size="small" onClick={copy}>
            {copied ? '已复制' : range ? '复制选中 HEX' : '复制 HEX'}
          </YakitButton>
        </div>
      </div>
      {mode === 'text' ? (
        <pre className={styles['text-bytes']}>{text}</pre>
      ) : (
        <div className={styles['hex-body']}>
          <div className={styles['hex-heading']}>
            <span>OFFSET</span>
            <span>00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F</span>
            <span>ASCII</span>
          </div>
          <Virtuoso
            ref={list}
            style={{ flex: 1 }}
            totalCount={Math.ceil(bytes.length / 16)}
            fixedItemHeight={25}
            itemContent={(index) => {
              const offset = index * 16
              const row = Array.from(bytes.subarray(offset, offset + 16))
              return (
                <div className={styles['hex-row']}>
                  <span className={styles.offset}>{offset.toString(16).padStart(6, '0')}</span>
                  <span className={styles['hex-values']}>
                    {row.map((byte, i) => (
                      <span
                        key={i}
                        className={range && offset + i >= range[0] && offset + i < range[1] ? styles.highlight : ''}
                      >
                        {byte.toString(16).padStart(2, '0')}
                      </span>
                    ))}
                  </span>
                  <span className={styles.ascii}>
                    {row.map((byte, i) => (
                      <span
                        key={i}
                        className={range && offset + i >= range[0] && offset + i < range[1] ? styles.highlight : ''}
                      >
                        {byte >= 32 && byte < 127 ? String.fromCharCode(byte) : '·'}
                      </span>
                    ))}
                  </span>
                </div>
              )
            }}
          />
        </div>
      )}
      <div className={styles['byte-status']}>
        {copyError ||
          (range
            ? `已选中字节 ${range[0]}–${range[1] - 1} · ${range[1] - range[0]} bytes`
            : '选择协议字段，定位对应字节 · 只读视图')}
      </div>
    </section>
  )
}
