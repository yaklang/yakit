import React from 'react'
import { ExperimentOutlined, ThunderboltOutlined, WarningOutlined } from '@ant-design/icons'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import type { DirectionName, TransformExecution } from './browserTransformTypes'
import styles from './BrowserTransformWorkspace.module.scss'

function base64ToUtf8(value: string): string {
  try {
    const binary = atob(value)
    return new TextDecoder().decode(Uint8Array.from(binary, (item) => item.charCodeAt(0)))
  } catch {
    return value
  }
}

interface BrowserTransformReplayPanelProps {
  direction: DirectionName
  method: string
  url: string
  headers: string
  body: string
  sample?: { body: string; label: string }
  result?: TransformExecution
  error: string
  canExecute: boolean
  onMethodChange: (value: string) => void
  onURLChange: (value: string) => void
  onHeadersChange: (value: string) => void
  onBodyChange: (value: string) => void
  onExecute: () => void
  footer?: React.ReactNode
}

export const BrowserTransformReplayPanel: React.FC<BrowserTransformReplayPanelProps> = ({
  direction,
  method,
  url,
  headers,
  body,
  sample,
  result,
  error,
  canExecute,
  onMethodChange,
  onURLChange,
  onHeadersChange,
  onBodyChange,
  onExecute,
  footer,
}) => (
  <aside className={styles['test-pane']}>
    <header>
      <span>
        <ExperimentOutlined />
        <strong>本地回放</strong>
      </span>
      {result && <i>{result.durationMs.toFixed(1)} ms</i>}
    </header>
    <label>
      <span>方法与 URL</span>
      <div>
        <YakitInput value={method} onChange={(event) => onMethodChange(event.target.value.toUpperCase())} />
        <YakitInput value={url} onChange={(event) => onURLChange(event.target.value)} />
      </div>
    </label>
    <label>
      <span>Headers JSON</span>
      <textarea rows={4} value={headers} onChange={(event) => onHeadersChange(event.target.value)} />
    </label>
    <div className={styles['test-body-field']}>
      <div>
        <span>{direction === 'request' ? '明文 Body' : '线上响应 Body'}</span>
        {sample &&
          (body === sample.body ? (
            <em title={sample.label}>短时样本</em>
          ) : (
            <button type="button" onClick={() => onBodyChange(sample.body)}>
              恢复短时样本
            </button>
          ))}
      </div>
      <textarea
        className={styles['test-body']}
        rows={9}
        value={body}
        onChange={(event) => onBodyChange(event.target.value)}
      />
    </div>
    <YakitButton icon={<ThunderboltOutlined />} disabled={!canExecute} onClick={onExecute}>
      执行 Pipeline
    </YakitButton>
    {error && (
      <div className={styles['test-error']}>
        <WarningOutlined />
        <span>{error}</span>
      </div>
    )}
    {result && (
      <section className={styles['test-result']}>
        <header>
          <strong>转换结果</strong>
          <span>{result.nodeDurations.length} 节点</span>
        </header>
        <div>
          <code>URL</code>
          <span>{result.url}</span>
        </div>
        {result.setHeaders.map((header) => (
          <div key={header.name}>
            <code>{header.name}</code>
            <span>{header.value}</span>
          </div>
        ))}
        <pre>{base64ToUtf8(result.bodyBase64)}</pre>
        <pre>{JSON.stringify(result.logicalOutput, null, 2)}</pre>
      </section>
    )}
    {footer}
  </aside>
)
