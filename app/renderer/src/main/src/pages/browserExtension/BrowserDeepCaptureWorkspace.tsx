import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AimOutlined,
  ApartmentOutlined,
  BugOutlined,
  CheckOutlined,
  CodeOutlined,
  CopyOutlined,
  DeleteOutlined,
  DisconnectOutlined,
  DownOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { success } from '@/utils/notification'
import type { ProfileInferenceCandidate, RecordingEvent, RunBrowserCapability } from './BrowserRecordingWorkspace'
import type { TransformPageCallable } from './browserTransformTypes'
import styles from './BrowserDeepCaptureWorkspace.module.scss'

type CaptureState = 'detached' | 'attached' | 'armed' | 'paused' | 'captured' | 'error'

type CaptureMatcher =
  | {
      kind: 'crypto'
      adapterId: string
      operation: string
      wrapperHandleId: string
      scriptUrl?: string
      frameHints?: BusinessFrameHint[]
    }
  | {
      kind: 'boundary'
      eventKind: 'beacon' | 'worker' | 'message'
      operation: string
      wrapperHandleId: string
      scriptUrl?: string
      frameHints?: BusinessFrameHint[]
    }
  | { kind: 'request'; urlPattern: string; frameHints?: BusinessFrameHint[] }

interface BusinessFrameHint {
  functionName: string
  url?: string
  support: number
  averageDepth: number
}

interface CaptureVariable {
  name: string
  type: string
  subtype?: string
  preview: string
  detail?: string
  detailTruncated?: boolean
}

interface CaptureScope {
  type: string
  name?: string
  variables: CaptureVariable[]
}

interface CaptureFrame {
  id: string
  index: number
  functionName: string
  url: string
  lineNumber: number
  columnNumber: number
  scopes: CaptureScope[]
  thisPreview: string
  sourceKind: 'page' | 'extension-hook' | 'library'
  libraryFrame: boolean
  functionInspection?: {
    resolved: boolean
    parameterCount?: number
    parameterNames?: string[]
    riskFlags: Array<'network' | 'dom' | 'navigation' | 'storage'>
    referenceExpression?: string
  }
  businessScore?: number
  businessReasons?: string[]
}

interface CaptureStatus {
  state: CaptureState
  matcher?: CaptureMatcher
  error?: string
  pause?: {
    reason: string
    pausedAt: number
    deadline: number
    collecting?: boolean
    frames: CaptureFrame[]
    recommendedFrameId?: string
    automaticCapture?: {
      state: 'ready' | 'ambiguous' | 'blocked' | 'unavailable'
      strategy?: 'selected-frame' | 'request-transaction'
      frameId?: string
      reason: string
      alternativeFrameIds?: string[]
    }
  }
}

type PageCallable = TransformPageCallable

interface CallableExecution {
  callableId: string
  type: string
  preview: string
  value: unknown
  durationMs: number
}

interface BrowserDeepCaptureWorkspaceProps {
  active: boolean
  connected: boolean
  running: boolean
  selectedEvent?: RecordingEvent
  selectedCandidate?: ProfileInferenceCandidate
  autoArmRequest?: number
  runCapability: RunBrowserCapability
  onPausedChange: (paused: boolean) => void
  onUseRecommendedCallable?: (candidate: ProfileInferenceCandidate, callable: PageCallable) => void
}

const STATUS_LABELS: Record<CaptureState, string> = {
  detached: '未附加',
  attached: '已附加',
  armed: '等待命中',
  paused: '现场已暂停',
  captured: '现场已释放',
  error: '需要处理',
}

const FRAME_SOURCE_LABELS: Record<CaptureFrame['sourceKind'], string> = {
  page: '页面函数',
  'extension-hook': '插件 Hook',
  library: '依赖库',
}

function matcherFromEvent(event?: RecordingEvent, candidate?: ProfileInferenceCandidate): CaptureMatcher | undefined {
  if (!event) return undefined
  const frameHints = candidate?.capturePlan?.matcherEventId === event.id ? candidate.capturePlan.frameHints : undefined
  if (event.kind === 'crypto' && event.crypto?.adapterId && event.wrapperHandleId) {
    return {
      kind: 'crypto',
      adapterId: event.crypto.adapterId,
      operation: event.crypto.operation,
      wrapperHandleId: event.wrapperHandleId,
      scriptUrl: event.scriptUrl,
      frameHints,
    }
  }
  if (['fetch', 'xhr', 'form'].includes(event.kind) && event.url) {
    return { kind: 'request', urlPattern: event.url, frameHints }
  }
  if (['beacon', 'worker', 'message'].includes(event.kind) && event.wrapperHandleId) {
    return {
      kind: 'boundary',
      eventKind: event.kind as 'beacon' | 'worker' | 'message',
      operation: event.operation,
      wrapperHandleId: event.wrapperHandleId,
      scriptUrl: event.scriptUrl,
      frameHints,
    }
  }
  return undefined
}

function isCaptureStatus(value: unknown): value is CaptureStatus {
  if (!value || typeof value !== 'object') return false
  const input = value as Partial<CaptureStatus>
  return (
    typeof input.state === 'string' &&
    ['detached', 'attached', 'armed', 'paused', 'captured', 'error'].includes(input.state)
  )
}

function isPageCallable(value: unknown): value is PageCallable {
  if (!value || typeof value !== 'object') return false
  const input = value as Partial<PageCallable>
  return typeof input.id === 'string' && typeof input.name === 'string' && typeof input.operation === 'string'
}

function isCallableExecution(value: unknown): value is CallableExecution {
  if (!value || typeof value !== 'object') return false
  const input = value as Partial<CallableExecution>
  return typeof input.callableId === 'string' && typeof input.durationMs === 'number'
}

function compactURL(value: string): string {
  if (!value) return '内联脚本'
  try {
    const url = new URL(value)
    return `${url.host}${url.pathname}`
  } catch {
    return value
  }
}

function validIdentifier(value: string): boolean {
  return /^[A-Za-z_$][\w$]*$/.test(value)
}

function stringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export const BrowserDeepCaptureWorkspace: React.FC<BrowserDeepCaptureWorkspaceProps> = ({
  active,
  connected,
  running,
  selectedEvent,
  selectedCandidate,
  autoArmRequest = 0,
  runCapability,
  onPausedChange,
  onUseRecommendedCallable,
}) => {
  const suggestedMatcher = useMemo(
    () => matcherFromEvent(selectedEvent, selectedCandidate),
    [selectedCandidate, selectedEvent],
  )
  const [matcherKind, setMatcherKind] = useState<'crypto' | 'boundary' | 'request'>(suggestedMatcher?.kind || 'crypto')
  const [adapterID, setAdapterID] = useState(suggestedMatcher?.kind === 'crypto' ? suggestedMatcher.adapterId : '')
  const [operation, setOperation] = useState(
    suggestedMatcher?.kind === 'crypto' || suggestedMatcher?.kind === 'boundary' ? suggestedMatcher.operation : '',
  )
  const [wrapperHandleID, setWrapperHandleID] = useState(
    suggestedMatcher?.kind === 'crypto' || suggestedMatcher?.kind === 'boundary'
      ? suggestedMatcher.wrapperHandleId
      : '',
  )
  const [boundaryEventKind, setBoundaryEventKind] = useState<'beacon' | 'worker' | 'message'>(
    suggestedMatcher?.kind === 'boundary' ? suggestedMatcher.eventKind : 'worker',
  )
  const [scriptURL, setScriptURL] = useState(
    suggestedMatcher?.kind === 'crypto' || suggestedMatcher?.kind === 'boundary'
      ? suggestedMatcher.scriptUrl || ''
      : '',
  )
  const [urlPattern, setURLPattern] = useState(suggestedMatcher?.kind === 'request' ? suggestedMatcher.urlPattern : '')
  const [status, setStatus] = useState<CaptureStatus>({ state: 'detached' })
  const [callables, setCallables] = useState<PageCallable[]>([])
  const [selectedFrameID, setSelectedFrameID] = useState('')
  const [callableName, setCallableName] = useState('')
  const [functionExpression, setFunctionExpression] = useState('')
  const [selectedCallableID, setSelectedCallableID] = useState('')
  const [callableArgs, setCallableArgs] = useState('["test"]')
  const [execution, setExecution] = useState<CallableExecution>()
  const [expandedVariableKey, setExpandedVariableKey] = useState('')
  const [error, setError] = useState('')
  const [statusLoaded, setStatusLoaded] = useState(false)
  const editorFrameID = useRef('')
  const callableLoadKey = useRef('')
  const handledAutoArmRequest = useRef(0)
  const handledAutoCapturePause = useRef(0)
  const automaticFlowRequested = useRef(false)

  const paused = status.state === 'paused' && Boolean(status.pause)
  useEffect(() => onPausedChange(active && paused), [active, onPausedChange, paused])
  useEffect(() => () => onPausedChange(false), [onPausedChange])

  useEffect(() => {
    if (!suggestedMatcher || paused || status.state === 'armed') return
    setMatcherKind(suggestedMatcher.kind)
    if (suggestedMatcher.kind === 'crypto') {
      setAdapterID(suggestedMatcher.adapterId)
      setOperation(suggestedMatcher.operation)
      setWrapperHandleID(suggestedMatcher.wrapperHandleId)
      setScriptURL(suggestedMatcher.scriptUrl || '')
    } else if (suggestedMatcher.kind === 'boundary') {
      setBoundaryEventKind(suggestedMatcher.eventKind)
      setOperation(suggestedMatcher.operation)
      setWrapperHandleID(suggestedMatcher.wrapperHandleId)
      setScriptURL(suggestedMatcher.scriptUrl || '')
    } else {
      setURLPattern(suggestedMatcher.urlPattern)
    }
  }, [paused, status.state, suggestedMatcher])

  const acceptStatus = useCallback((value: unknown) => {
    if (!isCaptureStatus(value)) {
      setStatusLoaded(true)
      setError('浏览器没有返回有效的深度捕获状态。')
      return
    }
    setStatus(value)
    setStatusLoaded(true)
    setError('')
  }, [])

  const readStatus = useCallback(
    (keepalive = false) => {
      if (!active || !connected || running) return
      runCapability(
        keepalive ? 'browser.deep_capture.keepalive' : 'browser.deep_capture.status',
        {},
        {
          silentEvents: true,
          onResult: acceptStatus,
          onError: setError,
        },
      )
    },
    [acceptStatus, active, connected, runCapability, running],
  )

  const readCallables = useCallback(() => {
    if (!active || !connected || running || paused) return
    runCapability(
      'browser.callable.list',
      {},
      {
        silentEvents: true,
        onResult: (value) => {
          if (!Array.isArray(value)) {
            setError('浏览器没有返回有效的页面函数列表。')
            return
          }
          setCallables(value.filter(isPageCallable))
          setError('')
        },
        onError: setError,
      },
    )
  }, [active, connected, paused, runCapability, running])

  useEffect(() => {
    if (!active || !connected || running) return
    if (!statusLoaded) {
      readStatus(false)
      return
    }
    if (!['armed', 'paused'].includes(status.state)) return
    const delay = status.state === 'armed' ? 850 : 1800
    const timer = window.setTimeout(() => {
      readStatus(status.state === 'paused')
    }, delay)
    return () => window.clearTimeout(timer)
  }, [active, connected, readStatus, running, status.state, statusLoaded])

  useEffect(() => {
    if (
      !autoArmRequest ||
      handledAutoArmRequest.current >= autoArmRequest ||
      !active ||
      !connected ||
      running ||
      !statusLoaded ||
      !suggestedMatcher
    )
      return
    handledAutoArmRequest.current = autoArmRequest
    if (status.state === 'armed' || status.state === 'paused') return
    setMatcherKind(suggestedMatcher.kind)
    if (suggestedMatcher.kind === 'crypto') {
      setAdapterID(suggestedMatcher.adapterId)
      setOperation(suggestedMatcher.operation)
      setWrapperHandleID(suggestedMatcher.wrapperHandleId)
      setScriptURL(suggestedMatcher.scriptUrl || '')
    } else if (suggestedMatcher.kind === 'boundary') {
      setBoundaryEventKind(suggestedMatcher.eventKind)
      setOperation(suggestedMatcher.operation)
      setWrapperHandleID(suggestedMatcher.wrapperHandleId)
      setScriptURL(suggestedMatcher.scriptUrl || '')
    } else {
      setURLPattern(suggestedMatcher.urlPattern)
    }
    setError('')
    setExecution(undefined)
    runCapability(
      'browser.deep_capture.start',
      { matcher: suggestedMatcher },
      {
        silentEvents: true,
        onResult: (value) => {
          automaticFlowRequested.current = true
          acceptStatus(value)
          success('自动分析已武装，请在浏览器中重复刚才的操作')
        },
        onError: setError,
      },
    )
  }, [
    acceptStatus,
    active,
    autoArmRequest,
    connected,
    runCapability,
    running,
    status.state,
    statusLoaded,
    suggestedMatcher,
  ])

  useEffect(() => {
    if (!active || !connected || running || paused || !statusLoaded || status.state === 'armed') return
    const loadKey = status.state
    if (callableLoadKey.current === loadKey) return
    const timer = window.setTimeout(() => {
      callableLoadKey.current = loadKey
      readCallables()
    }, 180)
    return () => window.clearTimeout(timer)
  }, [active, connected, paused, readCallables, running, status.state, statusLoaded])

  const frames = useMemo(() => status.pause?.frames || [], [status.pause?.frames])
  useEffect(() => {
    setSelectedFrameID((current) =>
      frames.some((frame) => frame.id === current)
        ? current
        : status.pause?.automaticCapture?.frameId ||
          status.pause?.recommendedFrameId ||
          frames.find((frame) => frame.sourceKind === 'page')?.id ||
          frames[0]?.id ||
          '',
    )
  }, [frames, status.pause?.automaticCapture?.frameId, status.pause?.recommendedFrameId])

  const selectedFrame = frames.find((frame) => frame.id === selectedFrameID)
  useEffect(() => {
    if (!selectedFrame || editorFrameID.current === selectedFrame.id) return
    editorFrameID.current = selectedFrame.id
    const functionName =
      selectedFrame.sourceKind === 'page' && validIdentifier(selectedFrame.functionName)
        ? selectedFrame.functionName
        : ''
    setFunctionExpression('')
    setCallableName(functionName ? `${functionName} 业务封装` : '页面业务封装')
    setExpandedVariableKey('')
  }, [selectedFrame])

  useEffect(() => {
    setSelectedCallableID((current) =>
      callables.some((callable) => callable.id === current) ? current : callables.at(-1)?.id || '',
    )
  }, [callables])

  const arm = () => {
    const frameHints = suggestedMatcher?.kind === matcherKind ? suggestedMatcher.frameHints : undefined
    const matcher: CaptureMatcher =
      matcherKind === 'crypto'
        ? {
            kind: 'crypto',
            adapterId: adapterID.trim(),
            operation: operation.trim(),
            wrapperHandleId: wrapperHandleID.trim(),
            scriptUrl: scriptURL.trim() || undefined,
            frameHints,
          }
        : matcherKind === 'boundary'
          ? {
              kind: 'boundary',
              eventKind: boundaryEventKind,
              operation: operation.trim(),
              wrapperHandleId: wrapperHandleID.trim(),
              scriptUrl: scriptURL.trim() || undefined,
              frameHints,
            }
          : { kind: 'request', urlPattern: urlPattern.trim(), frameHints }
    setError('')
    setExecution(undefined)
    automaticFlowRequested.current = false
    runCapability(
      'browser.deep_capture.start',
      { matcher },
      {
        silentEvents: true,
        onResult: (value) => {
          acceptStatus(value)
          success('深度捕获已武装，请在浏览器中重现一次操作')
        },
        onError: setError,
      },
    )
  }

  const resume = () => {
    runCapability(
      'browser.deep_capture.resume',
      {},
      {
        silentEvents: true,
        onResult: (value) => {
          acceptStatus(value)
          success('浏览器页面已恢复')
        },
        onError: setError,
      },
    )
  }

  const detach = () => {
    runCapability(
      'browser.deep_capture.detach',
      {},
      {
        silentEvents: true,
        onResult: (value) => {
          acceptStatus(value)
          success('深度捕获会话已结束')
        },
        onError: setError,
      },
    )
  }

  const createCallable = (strategy: 'selected-frame' | 'expression') => {
    if (!selectedFrame) return
    const params =
      strategy === 'expression'
        ? {
            source: 'deep-capture',
            strategy,
            callFrameId: selectedFrame.id,
            name: callableName.trim(),
            functionExpression: functionExpression.trim(),
          }
        : {
            source: 'deep-capture',
            strategy,
            callFrameId: selectedFrame.id,
            name: callableName.trim(),
          }
    runCapability('browser.callable.create', params, {
      silentEvents: true,
      onResult: (value) => {
        if (!isPageCallable(value)) {
          setError('浏览器没有返回有效的页面函数。')
          return
        }
        setCallables((current) => [...current.filter((callable) => callable.id !== value.id), value])
        setSelectedCallableID(value.id)
        setStatus((current) => ({ ...current, state: 'captured', pause: undefined }))
        setError('')
        success('业务函数已捕获，浏览器页面已恢复')
      },
      onError: setError,
    })
  }

  useEffect(() => {
    const pause = status.pause
    const automatic = pause?.automaticCapture
    if (
      !automaticFlowRequested.current ||
      !active ||
      !connected ||
      running ||
      !paused ||
      !pause ||
      pause.collecting ||
      selectedCandidate?.status !== 'capture-required' ||
      automatic?.state !== 'ready' ||
      !automatic.frameId ||
      handledAutoCapturePause.current === pause.pausedAt
    )
      return
    handledAutoCapturePause.current = pause.pausedAt
    automaticFlowRequested.current = false
    const captureStrategy = automatic.strategy || 'selected-frame'
    const frame = pause.frames.find((item) => item.id === automatic.frameId)
    const name =
      frame?.functionName && frame.functionName !== '(anonymous)'
        ? `${frame.functionName} ${captureStrategy === 'request-transaction' ? '请求事务' : '业务封装'}`
        : undefined
    const params =
      captureStrategy === 'request-transaction'
        ? {
            source: 'deep-capture',
            strategy: 'request-transaction',
            callFrameId: automatic.frameId,
            candidateId: selectedCandidate.id,
            ...(name ? { name } : {}),
          }
        : {
            source: 'deep-capture',
            strategy: 'selected-frame',
            callFrameId: automatic.frameId,
            ...(name ? { name } : {}),
          }
    runCapability('browser.callable.create', params, {
      silentEvents: true,
      onResult: (value) => {
        if (!isPageCallable(value)) {
          setError('浏览器没有返回有效的页面函数。')
          return
        }
        setCallables((current) => [...current.filter((callable) => callable.id !== value.id), value])
        setSelectedCallableID(value.id)
        setStatus((current) => ({ ...current, state: 'captured', pause: undefined }))
        setError('')
        onUseRecommendedCallable?.(selectedCandidate, value)
        success(
          captureStrategy === 'request-transaction'
            ? '已自动捕获页面请求事务，回放不会真实发送'
            : '已自动捕获完整业务函数',
        )
      },
      onError: setError,
    })
  }, [active, connected, onUseRecommendedCallable, paused, runCapability, running, selectedCandidate, status.pause])

  const executeCallable = () => {
    if (!selectedCallableID) return
    let args: unknown
    try {
      args = JSON.parse(callableArgs)
    } catch (parseError) {
      setError(`调用参数不是有效 JSON: ${parseError}`)
      return
    }
    if (!Array.isArray(args)) {
      setError('调用参数必须是 JSON 数组。')
      return
    }
    runCapability(
      'browser.callable.execute',
      { callableId: selectedCallableID, args },
      {
        silentEvents: true,
        onResult: (value) => {
          if (!isCallableExecution(value)) {
            setError('浏览器没有返回有效的页面函数执行结果。')
            return
          }
          setExecution(value)
          setError('')
          success('页面函数验证完成')
        },
        onError: setError,
      },
    )
  }

  const deleteCallable = () => {
    if (!selectedCallableID) return
    runCapability(
      'browser.callable.delete',
      { callableId: selectedCallableID },
      {
        silentEvents: true,
        onResult: (value) => {
          setCallables(Array.isArray(value) ? value.filter(isPageCallable) : [])
          setExecution(undefined)
          setError('')
        },
        onError: setError,
      },
    )
  }

  const stages = [
    { label: '目标', done: Boolean(suggestedMatcher || operation || urlPattern), current: status.state === 'detached' },
    { label: '等待命中', done: ['paused', 'captured'].includes(status.state), current: status.state === 'armed' },
    { label: '暂停现场', done: status.state === 'captured' || callables.length > 0, current: paused },
    { label: '页面函数', done: callables.length > 0, current: status.state === 'captured' && !callables.length },
    { label: '验证', done: Boolean(execution), current: Boolean(callables.length) && !execution },
  ]
  const automaticCapture = status.pause?.automaticCapture
  const selectedCaptureReady =
    selectedFrame?.sourceKind === 'page' &&
    selectedFrame.functionInspection?.resolved &&
    !selectedFrame.functionInspection.riskFlags.length

  return (
    <div className={styles['deep-capture']}>
      <div className={styles['deep-command']}>
        <div className={styles['deep-identity']}>
          <span className={`${styles['status-dot']} ${styles[status.state]}`} />
          <div>
            <strong>深度捕获</strong>
            <small>
              {STATUS_LABELS[status.state]}
              {status.matcher?.kind === 'crypto' ? ` · ${status.matcher.operation}` : ''}
            </small>
          </div>
        </div>
        <ol className={styles.stages}>
          {stages.map((stage, index) => (
            <li key={stage.label} className={`${stage.done ? styles.done : ''} ${stage.current ? styles.current : ''}`}>
              <span>{stage.done ? <CheckOutlined /> : index + 1}</span>
              <em>{stage.label}</em>
              {index < stages.length - 1 && <RightOutlined />}
            </li>
          ))}
        </ol>
        <div className={styles['command-actions']}>
          <YakitButton
            type="text"
            icon={<ReloadOutlined />}
            disabled={running}
            onClick={() => {
              callableLoadKey.current = ''
              readStatus(paused)
            }}
          />
          {status.state !== 'detached' && (
            <YakitButton type="text" icon={<DisconnectOutlined />} disabled={running} onClick={detach} />
          )}
        </div>
      </div>

      {(error || status.error) && (
        <div className={styles['deep-error']}>
          <WarningOutlined />
          <span>{error || status.error}</span>
        </div>
      )}

      {!paused ? (
        <>
          <section className={styles['arm-panel']}>
            <div className={styles['matcher-mode']}>
              <button
                className={matcherKind === 'crypto' ? styles.selected : ''}
                disabled={!adapterID || !wrapperHandleID}
                onClick={() => setMatcherKind('crypto')}
              >
                <SafetyCertificateOutlined /> 加密调用
              </button>
              <button
                className={matcherKind === 'boundary' ? styles.selected : ''}
                disabled={Boolean(adapterID) || !wrapperHandleID}
                onClick={() => setMatcherKind('boundary')}
              >
                <ApartmentOutlined /> 消息边界
              </button>
              <button
                className={matcherKind === 'request' ? styles.selected : ''}
                onClick={() => setMatcherKind('request')}
              >
                <AimOutlined /> 目标请求
              </button>
            </div>
            <div className={styles['matcher-fields']}>
              {matcherKind === 'crypto' ? (
                <>
                  <label>
                    <span>密码调用</span>
                    <YakitInput value={adapterID && operation ? `${adapterID} · ${operation}` : ''} readOnly />
                  </label>
                  <label>
                    <span>脚本过滤</span>
                    <YakitInput
                      value={scriptURL}
                      placeholder="可选"
                      onChange={(event) => setScriptURL(event.target.value)}
                    />
                  </label>
                </>
              ) : matcherKind === 'boundary' ? (
                <>
                  <label>
                    <span>消息边界</span>
                    <YakitInput value={`${boundaryEventKind} · ${operation}`} readOnly />
                  </label>
                  <label>
                    <span>脚本过滤</span>
                    <YakitInput
                      value={scriptURL}
                      placeholder="可选"
                      onChange={(event) => setScriptURL(event.target.value)}
                    />
                  </label>
                </>
              ) : (
                <label className={styles.wide}>
                  <span>URL 片段</span>
                  <YakitInput
                    value={urlPattern}
                    placeholder="/api/login"
                    onChange={(event) => setURLPattern(event.target.value)}
                  />
                </label>
              )}
            </div>
            <YakitButton
              icon={<BugOutlined />}
              disabled={
                running ||
                (matcherKind === 'crypto'
                  ? !adapterID.trim() || !operation.trim() || !wrapperHandleID.trim()
                  : matcherKind === 'boundary'
                    ? !operation.trim() || !wrapperHandleID.trim()
                    : !urlPattern.trim())
              }
              onClick={arm}
            >
              武装下一次命中
            </YakitButton>
          </section>

          {status.state === 'armed' && (
            <div className={styles.waiting}>
              <PauseCircleOutlined />
              <span>
                <strong>等待浏览器命中目标</strong>
                <small>
                  {status.matcher?.kind === 'request' ? status.matcher.urlPattern : status.matcher?.operation}
                </small>
              </span>
              <i />
            </div>
          )}

          <section className={styles['adapter-lab']}>
            <div className={styles['adapter-list']}>
              <header>
                <span>
                  <ApartmentOutlined /> 当前文档页面函数
                </span>
                <strong>{callables.length}</strong>
              </header>
              {!callables.length ? (
                <div className={styles.empty}>
                  <CodeOutlined />
                  <span>尚未捕获业务函数</span>
                </div>
              ) : (
                callables.map((callable) => (
                  <button
                    key={callable.id}
                    className={callable.id === selectedCallableID ? styles.selected : ''}
                    onClick={() => {
                      setSelectedCallableID(callable.id)
                      setExecution(undefined)
                    }}
                  >
                    <span>
                      <strong>{callable.name}</strong>
                      <small>
                        {callable.kind === 'request-transaction'
                          ? '请求事务'
                          : callable.provenance.functionName || callable.operation}
                        {callable.provenance.sourceUrl ? ` · ${compactURL(callable.provenance.sourceUrl)}` : ''}
                        {callable.provenance.lineNumber ? `:${callable.provenance.lineNumber}` : ''}
                      </small>
                    </span>
                    <RightOutlined />
                  </button>
                ))
              )}
            </div>
            <div className={styles.runner}>
              <header>
                <span>
                  <PlayCircleOutlined /> 调用验证
                </span>
                {execution && <strong>{execution.durationMs.toFixed(1)} ms</strong>}
              </header>
              <label>
                <span>参数 · JSON 数组</span>
                <YakitInput.TextArea
                  rows={5}
                  isShowResize={false}
                  value={callableArgs}
                  onChange={(event) => setCallableArgs(event.target.value)}
                />
              </label>
              <div className={styles['runner-actions']}>
                <YakitButton
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  disabled={!selectedCallableID || running}
                  onClick={deleteCallable}
                />
                <YakitButton
                  icon={<PlayCircleOutlined />}
                  disabled={!selectedCallableID || running}
                  onClick={executeCallable}
                >
                  运行
                </YakitButton>
              </div>
              {execution && <pre>{stringify(execution.value)}</pre>}
            </div>
          </section>
        </>
      ) : (
        <section className={styles['paused-workbench']}>
          <div className={styles['paused-banner']}>
            <span>
              <PauseCircleOutlined />
              <strong>{status.pause?.collecting ? '正在读取作用域' : '页面已暂停'}</strong>
            </span>
            <YakitButton type="text" icon={<PlayCircleOutlined />} disabled={running} onClick={resume}>
              仅恢复页面
            </YakitButton>
          </div>
          <div className={styles['paused-grid']}>
            <aside className={styles.stack}>
              <header>
                <BugOutlined />
                <span>调用栈</span>
                <strong>{frames.length}</strong>
              </header>
              <div>
                {frames.map((frame) => (
                  <button
                    key={frame.id}
                    className={`${frame.id === selectedFrameID ? styles.selected : ''} ${frame.sourceKind !== 'page' ? styles.library : ''}`}
                    onClick={() => setSelectedFrameID(frame.id)}
                  >
                    <i>{frame.index}</i>
                    <span>
                      <strong>{frame.functionName}</strong>
                      <small>
                        {compactURL(frame.url)}:{frame.lineNumber}
                      </small>
                    </span>
                    <em className={styles[`source-${frame.sourceKind}`]}>{FRAME_SOURCE_LABELS[frame.sourceKind]}</em>
                  </button>
                ))}
              </div>
            </aside>
            <section className={styles.scopes}>
              <header>
                <ApartmentOutlined />
                <span>作用域</span>
                <strong>
                  {selectedFrame?.scopes.reduce((count, scope) => count + scope.variables.length, 0) || 0}
                </strong>
              </header>
              <div>
                {selectedFrame?.scopes.map((scope, scopeIndex) => (
                  <section key={`${scope.type}:${scopeIndex}`}>
                    <h4>
                      <span>{scope.type}</span>
                      <small>{scope.name || `${scope.variables.length} 个变量`}</small>
                    </h4>
                    {scope.variables.map((variable) => {
                      const variableKey = `${selectedFrame.id}:${scopeIndex}:${variable.name}`
                      const expanded = expandedVariableKey === variableKey
                      const detail = variable.detail || variable.preview
                      return (
                        <div
                          className={`${styles['scope-variable']} ${expanded ? styles.expanded : ''}`}
                          key={`${scopeIndex}:${variable.name}`}
                        >
                          <button
                            type="button"
                            aria-expanded={expanded}
                            onClick={() => setExpandedVariableKey(expanded ? '' : variableKey)}
                          >
                            <code>{variable.name}</code>
                            <span>{variable.preview}</span>
                            <em>{variable.subtype || variable.type}</em>
                            <DownOutlined />
                          </button>
                          {expanded && (
                            <div className={styles['scope-variable-detail']}>
                              <header>
                                <span>
                                  {variable.type === 'function' ? '函数源码' : '值预览'}
                                  {variable.detailTruncated ? ' · 已截断' : ''}
                                </span>
                                <div>
                                  <YakitButton
                                    type="text2"
                                    icon={<CopyOutlined />}
                                    onClick={() => void navigator.clipboard.writeText(detail)}
                                  />
                                  {variable.type === 'function' && validIdentifier(variable.name) && (
                                    <YakitButton
                                      type="text"
                                      size="small"
                                      onClick={() => {
                                        setFunctionExpression(variable.name)
                                        setCallableName(`${variable.name} 页面函数`)
                                      }}
                                    >
                                      用作页面函数
                                    </YakitButton>
                                  )}
                                </div>
                              </header>
                              <pre>{detail}</pre>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </section>
                ))}
              </div>
            </section>
            <aside className={styles.editor}>
              <header>
                <CodeOutlined />
                <span>捕获业务函数</span>
              </header>
              <div className={styles['frame-summary']}>
                <strong>{selectedFrame?.functionName || '未选择调用帧'}</strong>
                <small>
                  {selectedFrame
                    ? `${compactURL(selectedFrame.url)}:${selectedFrame.lineNumber}:${selectedFrame.columnNumber}`
                    : ''}
                </small>
                <span>{selectedFrame?.thisPreview || ''}</span>
              </div>
              {automaticCapture && (
                <div className={styles['hook-notice']}>
                  {automaticCapture.state === 'ready' ? <SafetyCertificateOutlined /> : <WarningOutlined />}
                  <span>
                    <strong>
                      {automaticCapture.state === 'ready'
                        ? automaticCapture.strategy === 'request-transaction'
                          ? `已识别请求事务${selectedCandidate?.capturePlan?.transaction?.prerequisites.length ? ` · ${selectedCandidate.capturePlan.transaction.prerequisites.length} 个在线前置请求` : ''}`
                          : '已识别业务函数'
                        : '需要人工确认'}
                    </strong>
                    <small>{automaticCapture.reason}</small>
                  </span>
                </div>
              )}
              {selectedFrame?.sourceKind === 'extension-hook' && (
                <div className={styles['hook-notice']}>
                  <BugOutlined />
                  <span>
                    <strong>这是插件注入的观测帧</strong>
                    <small>它负责记录或设置断点，不是页面业务代码。请选择标记为“页面函数”的调用帧。</small>
                  </span>
                </div>
              )}
              <label>
                <span>页面函数名称</span>
                <YakitInput value={callableName} onChange={(event) => setCallableName(event.target.value)} />
              </label>
              <label>
                <span>高级：函数引用表达式</span>
                <YakitInput.TextArea
                  rows={7}
                  isShowResize={false}
                  value={functionExpression}
                  placeholder="仅在自动解析失败时填写，例如 buildLoginEnvelope"
                  onChange={(event) => setFunctionExpression(event.target.value)}
                />
              </label>
              <div className={styles['editor-actions']}>
                <YakitButton
                  icon={<CodeOutlined />}
                  disabled={running || !selectedCaptureReady || !callableName.trim()}
                  onClick={() => createCallable('selected-frame')}
                >
                  捕获选中函数
                </YakitButton>
                <YakitButton
                  type="text"
                  disabled={
                    running ||
                    !selectedFrame ||
                    selectedFrame.sourceKind !== 'page' ||
                    !callableName.trim() ||
                    !functionExpression.trim()
                  }
                  onClick={() => createCallable('expression')}
                >
                  使用高级表达式
                </YakitButton>
              </div>
            </aside>
          </div>
        </section>
      )}
    </div>
  )
}
