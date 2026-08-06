import type React from 'react'
import { useEffect, useState } from 'react'
import { CheckOutlined, FileTextOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import { executeBrowserExtensionTask } from './browserExtensionClient'
import type {
  AuthorizationCaseID,
  BrowserAuthorizationEvidenceBundle,
  BrowserAuthorizationEvidenceDiff,
  BrowserAuthorizationEvidencePacket,
  BrowserAuthorizationEvidenceValidation,
  BrowserAuthorizationWorkspaceResult,
} from './browserAuthorizationTypes'
import styles from './BrowserAuthorizationWorkspace.module.scss'

function formatAuthorizationDuration(value?: number): string {
  if (value === undefined || !Number.isFinite(value)) return '—'
  if (value < 1) return `${value.toFixed(2)} ms`
  if (value < 100) return `${value.toFixed(1)} ms`
  return `${Math.round(value)} ms`
}

function decodeAuthorizationPacket(packetBase64: string): string {
  const binary = atob(packetBase64)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function formatResponseAnalysis(response?: BrowserAuthorizationEvidenceBundle['cases'][number]['response']): string {
  if (!response) return ''
  if (response.analysisState === 'encoded-unavailable') return ' · 编码正文不可分析'
  if (response.analysisRepresentation === 'binary') return ' · 二进制摘要'
  if (response.decoded) {
    const encoding = response.contentEncoding || '压缩内容'
    const representation = response.analysisRepresentation?.toUpperCase() || '正文'
    return ` · ${encoding} → ${representation}`
  }
  return ''
}

export const AuthorizationEvidenceWorkbench: React.FC<{
  deviceId: string
  workspace: BrowserAuthorizationWorkspaceResult
  onWorkspaceChange: (workspace: BrowserAuthorizationWorkspaceResult) => void
}> = ({ deviceId, workspace, onWorkspaceChange }) => {
  const execution = workspace.execution!
  const [bundle, setBundle] = useState<BrowserAuthorizationEvidenceBundle>()
  const [comparisonId, setComparisonId] = useState('')
  const [diff, setDiff] = useState<BrowserAuthorizationEvidenceDiff>()
  const [packet, setPacket] = useState<BrowserAuthorizationEvidencePacket>()
  const [packetTitle, setPacketTitle] = useState('')
  const [view, setView] = useState<'redacted' | 'raw'>('redacted')
  const [showVolatile, setShowVolatile] = useState(false)
  const [loading, setLoading] = useState(false)
  const [validatingPath, setValidatingPath] = useState('')
  const [validationMessage, setValidationMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let disposed = false
    setLoading(true)
    setError('')
    setBundle(undefined)
    setDiff(undefined)
    setPacket(undefined)
    void executeBrowserExtensionTask<BrowserAuthorizationEvidenceBundle>(
      deviceId,
      'authorization.evidence.inspect',
      { workspaceId: workspace.id, executionId: execution.id },
      30_000,
    )
      .then((next) => {
        if (disposed) return
        setBundle(next)
        const preferred = next.comparisons.find((item) => item.purpose === 'authorization') || next.comparisons[0]
        setComparisonId(preferred?.id || '')
      })
      .catch((cause) => {
        if (!disposed) setError(cause instanceof Error ? cause.message : `${cause}`)
      })
      .finally(() => {
        if (!disposed) setLoading(false)
      })
    return () => {
      disposed = true
    }
  }, [deviceId, execution.id, workspace.id])

  const comparison = bundle?.comparisons.find((item) => item.id === comparisonId)
  const comparisonCases = comparison
    ? bundle?.cases.filter((item) => item.id === comparison.leftCaseId || item.id === comparison.rightCaseId) || []
    : []
  const comparisonTruncated = comparisonCases.some((item) => item.response?.truncated)
  const comparisonEncodedUnavailable = comparisonCases.some(
    (item) => item.response?.analysisState === 'encoded-unavailable',
  )
  const rawDiffEntries = diff?.entries
  const diffEntries = Array.isArray(rawDiffEntries) ? rawDiffEntries : []
  const diffRepresentationLabel =
    diff?.representation === 'structured'
      ? '结构化字段差异'
      : diffEntries.some((entry) => entry.path.includes('.body.binary.'))
        ? '二进制摘要差异'
        : diffEntries.some((entry) => entry.path.includes('.body.encoded.'))
          ? '编码正文元数据差异'
          : '原始文本差异'
  const volatileCount = diffEntries.filter((entry) => entry.volatile).length
  const visibleEntries = diffEntries.filter((entry) => showVolatile || !entry.volatile)
  const executionEvidence = Array.isArray(execution.evidence) ? execution.evidence : []
  const validationDirections: BrowserAuthorizationEvidenceValidation['direction'][] =
    comparison?.id === 'controls'
      ? ['a-to-b', 'b-to-a']
      : comparison?.id === 'a-to-b'
        ? ['a-to-b']
        : comparison?.id === 'b-to-a'
          ? ['b-to-a']
          : comparison?.id === 'low-vs-privileged' || comparison?.id === 'probe-vs-privileged'
            ? ['low-to-privileged']
            : comparison?.id === 'post-state'
              ? ['post-state']
              : []

  useEffect(() => {
    if (!comparison) return
    let disposed = false
    setLoading(true)
    setError('')
    setPacket(undefined)
    void executeBrowserExtensionTask<BrowserAuthorizationEvidenceDiff>(
      deviceId,
      'authorization.evidence.diff',
      {
        workspaceId: workspace.id,
        executionId: execution.id,
        leftCaseId: comparison.leftCaseId,
        rightCaseId: comparison.rightCaseId,
        scope: 'response',
        view,
      },
      30_000,
    )
      .then((next) => {
        if (!disposed) setDiff(next)
      })
      .catch((cause) => {
        if (!disposed) setError(cause instanceof Error ? cause.message : `${cause}`)
      })
      .finally(() => {
        if (!disposed) setLoading(false)
      })
    return () => {
      disposed = true
    }
  }, [comparison, deviceId, execution.id, view, workspace.id])

  const changeView = (next: 'redacted' | 'raw') => {
    if (
      next === 'raw' &&
      !window.confirm('原始证据可能包含 Cookie、Authorization 与业务敏感值。仅在当前授权测试确有需要时显示。')
    )
      return
    setView(next)
    setPacket(undefined)
  }

  const openPacket = async (caseId: AuthorizationCaseID, side: 'request' | 'response', label: string) => {
    setLoading(true)
    setError('')
    try {
      const next = await executeBrowserExtensionTask<BrowserAuthorizationEvidencePacket>(
        deviceId,
        'authorization.evidence.packet',
        {
          workspaceId: workspace.id,
          executionId: execution.id,
          caseId,
          side,
          view,
        },
        30_000,
      )
      setPacket(next)
      setPacketTitle(`${label} · ${side === 'request' ? '请求报文' : '响应报文'}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `${cause}`)
    } finally {
      setLoading(false)
    }
  }

  const validatePath = async (path: string, direction: BrowserAuthorizationEvidenceValidation['direction']) => {
    const validationKey = `${direction}:${path}`
    setValidatingPath(validationKey)
    setValidationMessage('')
    setError('')
    try {
      const validation = await executeBrowserExtensionTask<BrowserAuthorizationEvidenceValidation>(
        deviceId,
        'authorization.evidence.validate',
        {
          workspaceId: workspace.id,
          executionId: execution.id,
          direction,
          paths: [path],
        },
        30_000,
      )
      setValidationMessage(validation.reason)
      const validationEvidence = Array.isArray(validation.evidence) ? validation.evidence : []
      const additions = validationEvidence.filter(
        (candidate) =>
          !executionEvidence.some(
            (current) =>
              current.direction === candidate.direction &&
              current.path === candidate.path &&
              current.source === candidate.source,
          ),
      )
      onWorkspaceChange({
        ...workspace,
        execution: {
          ...execution,
          verdict: validation.verdict,
          confidence: validation.confidence,
          evidence: [...executionEvidence, ...additions],
          reasons: validation.verdictChanged ? [...execution.reasons, validation.reason] : execution.reasons,
        },
      })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `${cause}`)
    } finally {
      setValidatingPath('')
    }
  }

  return (
    <section className={styles['authorization-evidence']}>
      <header>
        <span>
          <SafetyCertificateOutlined />
        </span>
        <div>
          <strong>可复核证据</strong>
          <small>
            请求顺序、原始报文、结构化差异与业务归属来自同一次执行，不写入 HTTPFlow。
            {bundle ? ` · 保留至 ${new Date(bundle.expiresAt).toLocaleTimeString()}` : ''}
          </small>
        </div>
        <nav>
          <button className={view === 'redacted' ? styles.active : ''} onClick={() => changeView('redacted')}>
            脱敏
          </button>
          <button className={`${view === 'raw' ? styles.active : ''} ${styles.raw}`} onClick={() => changeView('raw')}>
            原始值
          </button>
        </nav>
      </header>

      {bundle && (
        <div className={styles['authorization-evidence-trace']}>
          {bundle.cases.map((item, index) => (
            <article key={item.id}>
              <i>{String(index + 1).padStart(2, '0')}</i>
              <strong>{item.label}</strong>
              <small>
                {item.status || '—'} · {formatAuthorizationDuration(item.timing.totalMs)}
                {item.timing.ttfbMs > 0 ? ` · 首字节 ${formatAuthorizationDuration(item.timing.ttfbMs)}` : ''}
                {formatResponseAnalysis(item.response)}
              </small>
              <span>
                <button
                  disabled={!item.requestAvailable || loading}
                  onClick={() => void openPacket(item.id, 'request', item.label)}
                >
                  请求
                </button>
                <button
                  disabled={!item.responseAvailable || loading}
                  onClick={() => void openPacket(item.id, 'response', item.label)}
                >
                  响应
                </button>
              </span>
            </article>
          ))}
        </div>
      )}

      <div className={styles['authorization-evidence-inspector']}>
        <aside>
          <span>比较关系</span>
          {bundle?.comparisons.map((item) => (
            <button
              key={item.id}
              className={item.id === comparisonId ? styles.active : ''}
              onClick={() => {
                setComparisonId(item.id)
                setPacket(undefined)
              }}
            >
              <i>{item.purpose === 'authorization' ? '关键' : item.purpose === 'state-change' ? '状态' : '对照'}</i>
              <strong>{item.label}</strong>
            </button>
          ))}
        </aside>
        <main>
          <header>
            <span>
              <FileTextOutlined />
            </span>
            <div>
              <strong>{packet ? packetTitle : comparison?.label || '响应差异'}</strong>
              <small>
                {packet
                  ? `${packet.view === 'raw' ? '原始' : '脱敏'}报文${packet.truncated ? ' · 已截断' : ''}`
                  : diffRepresentationLabel}
              </small>
            </div>
            {packet ? (
              <button onClick={() => setPacket(undefined)}>返回差异</button>
            ) : (
              volatileCount > 0 && (
                <button onClick={() => setShowVolatile((current) => !current)}>
                  {showVolatile ? '隐藏' : '显示'}动态噪声 · {volatileCount}
                </button>
              )
            )}
          </header>

          {loading && <div className={styles['authorization-evidence-empty']}>正在读取证据…</div>}
          {!loading && error && (
            <div className={`${styles['authorization-evidence-empty']} ${styles.error}`}>{error}</div>
          )}
          {!loading && !error && packet && <pre>{decodeAuthorizationPacket(packet.packetBase64)}</pre>}
          {!loading && !error && !packet && diff?.equal && (
            <div className={styles['authorization-evidence-empty']}>
              {comparison?.purpose === 'authorization'
                ? comparisonTruncated
                  ? '两项响应已捕获部分一致，但至少一项已截断，不能据此判断资源归属。'
                  : comparisonEncodedUnavailable
                    ? '两项线上编码正文指纹一致，但正文未能在预算内解码，不能据此提升授权结论。'
                    : '交叉响应与目标身份响应完全一致；如结论尚未确认，请切换到“身份 A 自有资源 ↔ 身份 B 自有资源”，选择稳定业务字段验证。'
                : comparison?.purpose === 'state-change'
                  ? '操作前后的稳定业务字段没有变化。'
                  : '双方正常响应完全一致，当前对照没有可用于区分资源归属的字段。'}
            </div>
          )}
          {!loading &&
            !error &&
            !packet &&
            diff &&
            !diff.equal &&
            visibleEntries.length === 0 &&
            volatileCount > 0 &&
            !showVolatile && (
              <div className={styles['authorization-evidence-empty']}>
                当前差异只有 {volatileCount} 项动态噪声，已默认折叠。
              </div>
            )}
          {!packet && validationMessage && (
            <div className={styles['authorization-evidence-validation']}>
              <CheckOutlined />
              {validationMessage}
            </div>
          )}
          {!loading && !error && !packet && diff && !diff.equal && visibleEntries.length > 0 && (
            <div className={styles['authorization-diff-list']}>
              {visibleEntries.slice(0, 100).map((entry) => {
                const pendingDirections = validationDirections.filter(
                  (direction) =>
                    !executionEvidence.some((item) => item.path === entry.path && item.direction === direction),
                )
                const alreadyVerified = pendingDirections.length < validationDirections.length
                const canValidate = Boolean(
                  pendingDirections.length &&
                  diff.scope === 'response' &&
                  entry.path.startsWith('body.') &&
                  !entry.volatile &&
                  !entry.sensitive,
                )
                return (
                  <article
                    key={`${entry.path}-${entry.kind}`}
                    className={`${entry.semantic || alreadyVerified ? styles.semantic : ''} ${
                      entry.volatile ? styles.volatile : ''
                    }`}
                  >
                    <header>
                      <code>{entry.path}</code>
                      <span>
                        {alreadyVerified
                          ? pendingDirections.length
                            ? '部分已验证'
                            : '已验证'
                          : entry.semantic
                            ? '归属候选'
                            : entry.volatile
                              ? '动态噪声'
                              : entry.sensitive
                                ? '敏感字段'
                                : entry.kind}
                      </span>
                      {canValidate &&
                        pendingDirections.map((direction) => {
                          const validationKey = `${direction}:${entry.path}`
                          const label =
                            direction === 'a-to-b'
                              ? '验证 A→B'
                              : direction === 'b-to-a'
                                ? '验证 B→A'
                                : direction === 'post-state'
                                  ? '验证状态变化'
                                  : '核对低权探测'
                          return (
                            <button
                              key={direction}
                              disabled={Boolean(validatingPath)}
                              onClick={() => void validatePath(entry.path, direction)}
                            >
                              {validatingPath === validationKey ? '验证中…' : label}
                            </button>
                          )
                        })}
                    </header>
                    <div>
                      <p>
                        <b>左</b>
                        <span title={entry.left}>{entry.left || '—'}</span>
                      </p>
                      <i>→</i>
                      <p>
                        <b>右</b>
                        <span title={entry.right}>{entry.right || '—'}</span>
                      </p>
                    </div>
                  </article>
                )
              })}
              {(visibleEntries.length > 100 || diff.omitted > 0) && (
                <small className={styles['authorization-diff-omitted']}>
                  当前展示前 100 项，另有 {Math.max(0, visibleEntries.length - 100) + diff.omitted} 项未展开
                </small>
              )}
            </div>
          )}
        </main>
      </div>
    </section>
  )
}
