import React, { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import {
  ApiOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  ChromeOutlined,
  CloseOutlined,
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import { showYakitModal, YakitModalConfirm } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import { info, success, yakitFailed } from '@/utils/notification'
import { callBrowserExtensionCapability, executeBrowserExtensionTask } from './browserExtensionClient'
import { browserAuthorizationVerdictLabel, type BrowserAuthorizationMode } from './browserAuthorizationPresentation'
import { ManagedBrowserIdentityRail } from './ManagedBrowserIdentityRail'
import { AuthorizationEvidenceWorkbench } from './BrowserAuthorizationEvidenceWorkbench'
import type {
  IsolationLevel,
  AuthorizationBaselineSide,
  BrowserIsolationTab,
  BrowserIsolationContext,
  BrowserIsolationInspection,
  BrowserAuthorizationContextSummary,
  BrowserAuthorizationWorkspaceResult,
  BrowserAuthorizationBaseline,
  BrowserAuthorizationBaselineCandidate,
  BrowserTransformProfileSummary,
  TransformProfileState,
  BrowserAuthorizationWorkspaceProps,
  IdentitySlot,
  ManagedFirefoxContainerReference,
  BrowserFirefoxContainerIdentityResult,
  BrowserFirefoxManagedContainer,
} from './browserAuthorizationTypes'
import {
  browserAuthorizationWorkspaceReducer,
  createBrowserAuthorizationWorkspaceState,
  type BrowserAuthorizationWorkspaceField,
  type BrowserAuthorizationWorkspaceState,
} from './browserAuthorizationWorkspaceReducer'
import styles from './BrowserAuthorizationWorkspace.module.scss'

function originOf(url?: string): string {
  try {
    return url ? new URL(url).origin : ''
  } catch {
    return ''
  }
}

function wildcardURLMatches(pattern: string, rawURL: string): boolean {
  const value = pattern.trim()
  if (!value || value === '*') return true
  try {
    const parsed = new URL(rawURL)
    return [value, normalizeProfileRoutePattern(value)].some((candidate) => {
      const escaped = candidate.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
      const matcher = new RegExp(`^${escaped}$`, 'i')
      return matcher.test(rawURL) || matcher.test(parsed.pathname)
    })
  } catch {
    return false
  }
}

function normalizeProfileRoutePattern(pattern: string): string {
  let pathStart = pattern.indexOf('/')
  const scheme = pattern.indexOf('://')
  if (scheme >= 0) {
    const hostStart = scheme + 3
    const hostPath = pattern.slice(hostStart).indexOf('/')
    if (hostPath < 0) return pattern
    pathStart = hostStart + hostPath
  }
  if (pathStart < 0) return pattern
  const suffixOffset = pattern.slice(pathStart).search(/[?#]/)
  const pathEnd = suffixOffset >= 0 ? pathStart + suffixOffset : pattern.length
  const segments = pattern
    .slice(pathStart, pathEnd)
    .split('/')
    .map((segment) => {
      if (!segment || segment.includes('*') || segment === ':resource') return segment
      let decoded = segment
      try {
        decoded = decodeURIComponent(segment)
      } catch {
        // Keep the encoded segment for the same bounded shape checks.
      }
      return /^\d+$/.test(decoded) ||
        /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(decoded) ||
        /^[0-9a-f]{12,}$/i.test(decoded) ||
        /^[A-Za-z0-9_-]{16,}$/.test(decoded)
        ? ':resource'
        : segment
    })
  return `${pattern.slice(0, pathStart)}${segments.join('/')}${pattern.slice(pathEnd)}`
}

function transformOutputDestinations(profile: BrowserTransformProfileSummary): string[] {
  return [
    ...new Set(
      profile.request.nodes.flatMap((node) => {
        if (node.kind !== 'output.write' || !node.destination) return []
        const destination = node.destination.trim()
        if (destination.toLowerCase().startsWith('header.')) {
          return [`header.${destination.slice(7).trim().toLowerCase()}`]
        }
        return [destination]
      }),
    ),
  ]
}

function shortIdentity(value?: string, length = 18): string {
  if (!value) return '-'
  return value.length > length ? `${value.slice(0, length)}...` : value
}

function workspaceRemaining(expiresAt: number, now: number): string {
  const seconds = Math.max(0, Math.ceil((expiresAt - now) / 1000))
  if (seconds < 60) return `${seconds} 秒`
  const minutes = Math.ceil(seconds / 60)
  return minutes < 60 ? `${minutes} 分钟` : `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分钟`
}

function contextFor(
  inspection: BrowserIsolationInspection | undefined,
  tab: BrowserIsolationTab | undefined,
): BrowserIsolationContext | undefined {
  return inspection?.contexts.find((context) => context.contextId === tab?.isolationContextId)
}

function identityKind(context?: BrowserIsolationContext): string {
  if (!context) return '隔离状态未知'
  if (context.kind === 'chrome-incognito-store') return 'Chrome 无痕身份'
  if (context.kind === 'firefox-container') {
    return context.containerName ? `Firefox Container · ${context.containerName}` : 'Firefox Container'
  }
  if (context.kind === 'managed-ephemeral-profile') return '临时浏览器身份'
  if (context.kind === 'verified-tab-local') return 'Tab-local 身份'
  return '浏览器 Profile'
}

function levelLabel(level?: IsolationLevel): string {
  if (level === 'strong') return '强隔离'
  if (level === 'conditional') return '条件隔离'
  if (level === 'none') return '未隔离'
  return '等待预检'
}

function authenticationLabel(handle?: BrowserAuthorizationContextSummary): string {
  if (handle?.authentication.status === 'authenticated') return '发现登录态'
  if (handle?.authentication.status === 'unauthenticated') return '未发现登录态'
  if (handle) return '登录态待确认'
  return '等待认证快照'
}

function authorizationOutcomeLabel(
  outcome?: NonNullable<
    NonNullable<BrowserAuthorizationWorkspaceResult['execution']>['cases'][number]['result']
  >['outcome'],
): string {
  if (outcome === 'success') return '成功'
  if (outcome === 'denied') return '拒绝'
  if (outcome === 'redirect') return '重定向'
  if (outcome === 'client-error') return '客户端错误'
  if (outcome === 'server-error') return '服务端错误'
  if (outcome === 'opaque') return '响应不可读'
  return '未执行'
}

function authorizationRequestLabel(request: BrowserAuthorizationBaseline['request']): string {
  const route = `${request.method} ${request.path}`
  if (request.protocol !== 'graphql') return route
  const operations = request.operationNames?.length ? request.operationNames.join(' + ') : 'anonymous'
  return `${route} · GraphQL ${operations}`
}

function parseAuthorizationCanaryPaths(value: string): {
  paths: string[]
  invalid: string[]
} {
  const paths: string[] = []
  const invalid: string[] = []
  const seen = new Set<string>()
  for (const item of value.split(/[,\n]+/)) {
    let path = item.trim()
    if (!path) continue
    if (path.startsWith('$.')) path = `body.${path.slice(2)}`
    else if (!path.startsWith('body.')) path = `body.${path.replace(/^\./, '')}`
    const segments = (path.match(/\.|\[/g) || []).length
    if (
      path.length > 512 ||
      segments < 1 ||
      segments > 16 ||
      !/^body(?:\.[A-Za-z0-9_-]+|\[[0-9]+\])+$/.test(path) ||
      /\.(?:__proto__|prototype|constructor)(?:\.|\[|$)/i.test(path)
    ) {
      invalid.push(item.trim())
      continue
    }
    if (!seen.has(path)) {
      seen.add(path)
      paths.push(path)
    }
  }
  return { paths, invalid }
}

function tabOption(tab: BrowserIsolationTab) {
  let hostname = tab.url
  try {
    hostname = new URL(tab.url).host
  } catch {
    // Keep the bounded URL supplied by the extension.
  }
  return {
    value: tab.id,
    label: `${tab.incognito ? '无痕 · ' : ''}${tab.title || hostname} · ${hostname}`,
  }
}

export const BrowserAuthorizationWorkspace: React.FC<BrowserAuthorizationWorkspaceProps> = ({
  devices,
  defaultDeviceId,
  initialWorkspaceId,
  initialDeviceId,
  onInitialWorkspaceLoaded,
  onAnalyzeWithAI,
  onPreparePairing,
  onRefreshDevices,
}) => {
  const fallbackDeviceId = devices.some((device) => device.id === defaultDeviceId)
    ? defaultDeviceId
    : devices[0]?.id || ''
  const secondDeviceId = devices.find((device) => device.id !== fallbackDeviceId)?.id || fallbackDeviceId
  const [workspaceView, dispatchWorkspace] = useReducer(browserAuthorizationWorkspaceReducer, undefined, () =>
    createBrowserAuthorizationWorkspaceState(fallbackDeviceId, secondDeviceId),
  )
  const {
    mode,
    left,
    right,
    inspections,
    proof,
    workspaceId,
    workspaceState,
    workspace,
    checking,
    authContexts,
    baselineCapture,
    selectedResource,
    canaryPathText,
    transformProfiles,
    selectedTransforms,
    createdContainer,
    managedContainers,
    planning,
    bindingLogical,
    executing,
    workspaceClock,
  } = workspaceView
  const setWorkspaceField = useCallback(function setWorkspaceField<K extends BrowserAuthorizationWorkspaceField>(
    field: K,
    value: React.SetStateAction<BrowserAuthorizationWorkspaceState[K]>,
  ) {
    dispatchWorkspace({ type: 'field.set', field, value })
  }, [])
  const setLeft = useCallback(
    (value: React.SetStateAction<typeof left>) => setWorkspaceField('left', value),
    [setWorkspaceField],
  )
  const setRight = useCallback(
    (value: React.SetStateAction<typeof right>) => setWorkspaceField('right', value),
    [setWorkspaceField],
  )
  const setInspections = useCallback(
    (value: React.SetStateAction<typeof inspections>) => setWorkspaceField('inspections', value),
    [setWorkspaceField],
  )
  const setChecking = useCallback(
    (value: React.SetStateAction<typeof checking>) => setWorkspaceField('checking', value),
    [setWorkspaceField],
  )
  const setAuthContexts = useCallback(
    (value: React.SetStateAction<typeof authContexts>) => setWorkspaceField('authContexts', value),
    [setWorkspaceField],
  )
  const setBaselineCapture = useCallback(
    (value: React.SetStateAction<typeof baselineCapture>) => setWorkspaceField('baselineCapture', value),
    [setWorkspaceField],
  )
  const setSelectedResource = useCallback(
    (value: React.SetStateAction<typeof selectedResource>) => setWorkspaceField('selectedResource', value),
    [setWorkspaceField],
  )
  const setCanaryPathText = useCallback(
    (value: React.SetStateAction<typeof canaryPathText>) => setWorkspaceField('canaryPathText', value),
    [setWorkspaceField],
  )
  const setTransformProfiles = useCallback(
    (value: React.SetStateAction<typeof transformProfiles>) => setWorkspaceField('transformProfiles', value),
    [setWorkspaceField],
  )
  const setSelectedTransforms = useCallback(
    (value: React.SetStateAction<typeof selectedTransforms>) => setWorkspaceField('selectedTransforms', value),
    [setWorkspaceField],
  )
  const setCreatedContainer = useCallback(
    (value: React.SetStateAction<typeof createdContainer>) => setWorkspaceField('createdContainer', value),
    [setWorkspaceField],
  )
  const setManagedContainers = useCallback(
    (value: React.SetStateAction<typeof managedContainers>) => setWorkspaceField('managedContainers', value),
    [setWorkspaceField],
  )
  const setPlanning = useCallback(
    (value: React.SetStateAction<typeof planning>) => setWorkspaceField('planning', value),
    [setWorkspaceField],
  )
  const setBindingLogical = useCallback(
    (value: React.SetStateAction<typeof bindingLogical>) => setWorkspaceField('bindingLogical', value),
    [setWorkspaceField],
  )
  const setExecuting = useCallback(
    (value: React.SetStateAction<typeof executing>) => setWorkspaceField('executing', value),
    [setWorkspaceField],
  )
  const setWorkspaceClock = useCallback(
    (value: React.SetStateAction<typeof workspaceClock>) => setWorkspaceField('workspaceClock', value),
    [setWorkspaceField],
  )
  const canaryConfiguration = useMemo(() => parseAuthorizationCanaryPaths(canaryPathText), [canaryPathText])
  const initialWorkspaceLoadedRef = useRef('')
  const focusRestoredExecutionRef = useRef(false)
  const executionResultRef = useRef<HTMLDivElement>(null)
  const activeBaselineCaptureRef = useRef<{
    deviceId: string
    target: BrowserAuthorizationContextSummary['target']
  }>()
  const releaseActiveBaselineCapture = useCallback(() => {
    const active = activeBaselineCaptureRef.current
    if (!active) return
    activeBaselineCaptureRef.current = undefined
    void callBrowserExtensionCapability(active.deviceId, 'browser.network.stop', active.target, 20_000).catch(
      () => undefined,
    )
  }, [])
  const changeIdentitySelection = useCallback(
    (side: 'left' | 'right', value: React.SetStateAction<IdentitySlot>) => {
      releaseActiveBaselineCapture()
      dispatchWorkspace(
        side === 'left' ? { type: 'selection.change', left: value } : { type: 'selection.change', right: value },
      )
    },
    [releaseActiveBaselineCapture],
  )
  const changeAuthorizationMode = useCallback(
    (nextMode: BrowserAuthorizationMode) => {
      releaseActiveBaselineCapture()
      dispatchWorkspace({
        type: 'selection.change',
        mode: nextMode,
        left: (current) => ({
          ...current,
          accountLabel: nextMode === 'horizontal' ? '身份 A' : '低权限身份',
        }),
        right: (current) => ({
          ...current,
          accountLabel: nextMode === 'horizontal' ? '身份 B' : '高权限身份',
        }),
      })
    },
    [releaseActiveBaselineCapture],
  )

  useEffect(() => {
    if (!workspace) return
    setWorkspaceClock(Date.now())
    const timer = window.setInterval(() => setWorkspaceClock(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [workspace])

  useEffect(() => {
    if (!workspace?.execution || !focusRestoredExecutionRef.current) return
    focusRestoredExecutionRef.current = false
    const frame = window.requestAnimationFrame(() => {
      executionResultRef.current?.scrollIntoView({ block: 'start' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [workspace?.execution])

  useEffect(() => {
    if (!devices.length) return
    const preferred = devices.some((device) => device.id === defaultDeviceId) ? defaultDeviceId : devices[0].id
    if (!devices.some((device) => device.id === left.deviceId)) {
      changeIdentitySelection('left', { ...left, deviceId: preferred, tabId: undefined })
    }
    if (!devices.some((device) => device.id === right.deviceId)) {
      const next = devices.find((device) => device.id !== preferred)?.id || preferred
      changeIdentitySelection('right', { ...right, deviceId: next, tabId: undefined })
    }
  }, [changeIdentitySelection, defaultDeviceId, devices, left, right])

  const loadDevice = useCallback(
    async (deviceId: string) => {
      if (!deviceId) return
      const device = devices.find((candidate) => candidate.id === deviceId)
      if (!device?.capabilities.includes('browser.isolation.inspect')) {
        setInspections((current) => ({
          ...current,
          [deviceId]: {
            loading: false,
            error: '当前插件尚未声明身份隔离能力，请更新插件后重新连接',
          },
        }))
        return
      }
      setInspections((current) => ({
        ...current,
        [deviceId]: { ...current[deviceId], loading: true, error: undefined },
      }))
      try {
        const [inspection, containers] = await Promise.all([
          callBrowserExtensionCapability<BrowserIsolationInspection>(deviceId, 'browser.isolation.inspect', {}, 20_000),
          device.capabilities.includes('browser.isolation.container.list')
            ? callBrowserExtensionCapability<BrowserFirefoxManagedContainer[]>(
                deviceId,
                'browser.isolation.container.list',
                {},
                20_000,
              ).catch(() => [])
            : Promise.resolve([]),
        ])
        setInspections((current) => ({
          ...current,
          [deviceId]: { loading: false, inspection },
        }))
        setManagedContainers((current) => ({
          ...current,
          [deviceId]: containers,
        }))
      } catch (error) {
        setInspections((current) => ({
          ...current,
          [deviceId]: { loading: false, error: error instanceof Error ? error.message : `${error}` },
        }))
      }
    },
    [devices],
  )

  const refresh = useCallback(async () => {
    const deviceIds = [...new Set([left.deviceId, right.deviceId].filter(Boolean))]
    await Promise.all(deviceIds.map(loadDevice))
  }, [left.deviceId, loadDevice, right.deviceId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    return () => {
      const active = activeBaselineCaptureRef.current
      if (!active) return
      void callBrowserExtensionCapability(active.deviceId, 'browser.network.stop', active.target, 20_000).catch(
        () => undefined,
      )
    }
  }, [])

  const leftInspection = inspections[left.deviceId]?.inspection
  const rightInspection = inspections[right.deviceId]?.inspection

  useEffect(() => {
    if (!leftInspection) return
    const tabs = leftInspection.tabs
    if (!tabs.length) {
      if (left.tabId !== undefined) {
        changeIdentitySelection('left', (current) => ({ ...current, tabId: undefined }))
      }
      return
    }
    if (!tabs.some((tab) => tab.id === left.tabId)) {
      changeIdentitySelection('left', (current) => ({ ...current, tabId: tabs[0].id }))
    }
  }, [changeIdentitySelection, left.tabId, leftInspection])

  useEffect(() => {
    if (!rightInspection) return
    const tabs = rightInspection.tabs
    if (!tabs.length) {
      if (right.tabId !== undefined) {
        changeIdentitySelection('right', (current) => ({ ...current, tabId: undefined }))
      }
      return
    }
    if (!tabs.some((tab) => tab.id === right.tabId)) {
      const leftTab = leftInspection?.tabs.find((tab) => tab.id === left.tabId)
      const recommended =
        left.deviceId === right.deviceId
          ? tabs.find((tab) => tab.id !== left.tabId && tab.cookieStoreId !== leftTab?.cookieStoreId) ||
            tabs.find((tab) => tab.id !== left.tabId)
          : tabs[0]
      changeIdentitySelection('right', (current) => ({ ...current, tabId: recommended?.id }))
    }
  }, [changeIdentitySelection, left.deviceId, left.tabId, leftInspection, right.deviceId, right.tabId, rightInspection])

  const leftDevice = devices.find((device) => device.id === left.deviceId)
  const rightDevice = devices.find((device) => device.id === right.deviceId)
  const leftTab = leftInspection?.tabs.find((tab) => tab.id === left.tabId)
  const rightTab = rightInspection?.tabs.find((tab) => tab.id === right.tabId)
  const leftContext = contextFor(leftInspection, leftTab)
  const rightContext = contextFor(rightInspection, rightTab)
  const identitySources = [
    { device: leftDevice, tab: leftTab },
    { device: rightDevice, tab: rightTab },
  ]
  const incognitoIdentitySource = identitySources.find(
    ({ device, tab }) => tab && device?.capabilities.includes('browser.isolation.incognito.open'),
  )
  const containerIdentitySource = identitySources.find(
    ({ device, tab }) => tab && device?.capabilities.includes('browser.isolation.container.open'),
  )
  const selectedManagedContainer: ManagedFirefoxContainerReference | undefined = [
    { device: rightDevice, context: rightContext, name: right.accountLabel },
    { device: leftDevice, context: leftContext, name: left.accountLabel },
  ].flatMap(({ device, context, name }) =>
    device &&
    context?.managed &&
    context.cookieStoreId &&
    device.capabilities.includes('browser.isolation.container.remove')
      ? [
          {
            deviceId: device.id,
            cookieStoreId: context.cookieStoreId,
            name: context.containerName || name || 'Firefox Container',
          },
        ]
      : [],
  )[0]
  const listedManagedContainers = [...new Set([left.deviceId, right.deviceId])].flatMap((deviceId) =>
    (managedContainers[deviceId] || []).map((container) => ({
      deviceId,
      cookieStoreId: container.cookieStoreId,
      name: container.name,
      tabCount: container.tabCount,
    })),
  )
  const managedContainerCandidates = [selectedManagedContainer, createdContainer, ...listedManagedContainers]
    .flatMap((candidate) => (candidate ? [candidate] : []))
    .filter(
      (candidate, index, values) =>
        values.findIndex(
          (item) => item.deviceId === candidate.deviceId && item.cookieStoreId === candidate.cookieStoreId,
        ) === index,
    )
  const managedContainer =
    selectedManagedContainer ||
    (createdContainer &&
    devices.find(
      (device) =>
        device.id === createdContainer.deviceId && device.capabilities.includes('browser.isolation.container.remove'),
    )
      ? createdContainer
      : managedContainerCandidates[0])
  const sameTab = left.deviceId === right.deviceId && left.tabId === right.tabId
  const sameDevice = left.deviceId === right.deviceId
  const requiredCapabilities = sameDevice
    ? ['browser.isolation.proof', 'browser.authorization.context.capture', 'browser.authorization.context.get']
    : ['browser.authorization.context.attest', 'browser.authorization.context.attestation.get']
  const capabilityReady = Boolean(
    leftDevice &&
    rightDevice &&
    requiredCapabilities.every((method) => leftDevice.capabilities.includes(method)) &&
    (sameDevice || requiredCapabilities.every((method) => rightDevice.capabilities.includes(method))),
  )
  const canCheck = Boolean(leftTab && rightTab && !sameTab && capabilityReady)

  const deviceOptions = useMemo(
    () =>
      devices.map((device) => ({
        value: device.id,
        label: `${device.name} · ${shortIdentity(device.installationId)}`,
      })),
    [devices],
  )

  const applyWorkspaceResult = useCallback(
    (next: BrowserAuthorizationWorkspaceResult, identities?: { left: IdentitySlot; right: IdentitySlot }) => {
      dispatchWorkspace({ type: 'workspace.apply', workspace: next, identities })
    },
    [],
  )

  useEffect(() => {
    const requestedWorkspaceId = initialWorkspaceId?.trim()
    const requestedDeviceId = initialDeviceId?.trim() || defaultDeviceId
    if (
      !requestedWorkspaceId ||
      !requestedDeviceId ||
      initialWorkspaceLoadedRef.current === requestedWorkspaceId ||
      !devices.some((device) => device.id === requestedDeviceId)
    )
      return
    initialWorkspaceLoadedRef.current = requestedWorkspaceId
    setChecking(true)
    void executeBrowserExtensionTask<BrowserAuthorizationWorkspaceResult>(
      requestedDeviceId,
      'authorization.workspace.inspect',
      { workspaceId: requestedWorkspaceId, revalidate: false },
      60_000,
    )
      .then((next) => {
        focusRestoredExecutionRef.current = Boolean(next.execution)
        applyWorkspaceResult(next, {
          left: {
            deviceId: next.left.deviceId,
            tabId: next.left.target.tabId,
            accountLabel: next.left.accountLabel || '身份 A',
          },
          right: {
            deviceId: next.right.deviceId,
            tabId: next.right.target.tabId,
            accountLabel: next.right.accountLabel || '身份 B',
          },
        })
        onInitialWorkspaceLoaded?.()
        success('已接收浏览器插件中的授权测试工作区')
      })
      .catch((error) => {
        initialWorkspaceLoadedRef.current = ''
        yakitFailed(`载入插件授权工作区失败：${error}`)
      })
      .finally(() => setChecking(false))
  }, [applyWorkspaceResult, defaultDeviceId, devices, initialDeviceId, initialWorkspaceId, onInitialWorkspaceLoaded])

  const dynamicBaselinePaths = useMemo(() => {
    if (workspace?.mode === 'vertical') return []
    const paths = new Set<string>()
    for (const baseline of [workspace?.baselines.left, workspace?.baselines.right]) {
      for (const field of baseline?.request.fields || []) {
        if (['signature', 'nonce', 'timestamp'].includes(field.category)) {
          paths.add(field.path)
        }
      }
    }
    return [...paths].sort()
  }, [workspace?.baselines.left, workspace?.baselines.right, workspace?.mode])
  const logicalBindingsReady = Boolean(
    workspace?.baselines.left?.logicalRequest && workspace?.baselines.right?.logicalRequest,
  )
  const logicalBindingsCurrent = Boolean(
    logicalBindingsReady &&
    workspace?.baselines.left?.logicalRequest?.profileId === selectedTransforms.left &&
    workspace?.baselines.right?.logicalRequest?.profileId === selectedTransforms.right,
  )
  const logicalCandidateCount =
    workspace?.baselinePair.resourceCandidates.filter((candidate) => candidate.source === 'logical').length || 0
  const selectedCandidate = workspace?.baselinePair.resourceCandidates.find(
    (candidate) => candidate.id === selectedResource,
  )
  const selectedOperationCandidate = workspace?.baselinePair.operationCandidates.find(
    (candidate) => candidate.id === selectedResource,
  )
  const availableCandidateCount =
    workspace?.mode === 'vertical'
      ? workspace.baselinePair.operationCandidates.length
      : workspace?.baselinePair.resourceCandidates.length || 0
  const selectedOperationBlocked = Boolean(selectedOperationCandidate && !selectedOperationCandidate.eligible)
  const operationDynamicPaths = useMemo(
    () => selectedOperationCandidate?.dynamicPaths || [],
    [selectedOperationCandidate],
  )
  const requiresOperationTransform = Boolean(
    workspace?.mode === 'vertical' && selectedOperationCandidate?.requiresDynamicRebuild,
  )
  const selectedCandidateRequiresLogicalBinding = Boolean(selectedCandidate?.requiresLogicalBinding)
  const hasCandidatesRequiringLogicalBinding = Boolean(
    workspace?.baselinePair.resourceCandidates.some((candidate) => candidate.requiresLogicalBinding),
  )
  const requiresDynamicProfiles =
    workspace?.mode !== 'vertical' && (dynamicBaselinePaths.length > 0 || logicalBindingsReady)
  const showTransformBindings =
    workspace?.mode === 'vertical'
      ? requiresOperationTransform
      : requiresDynamicProfiles || hasCandidatesRequiringLogicalBinding
  const transformDeviceCapabilityKey = useMemo(
    () =>
      devices
        .map((device) => `${device.id}:${device.capabilities.slice().sort().join(',')}`)
        .sort()
        .join('|'),
    [devices],
  )

  useEffect(() => {
    if (!workspace || workspace.baselinePair.state !== 'matched' || !showTransformBindings) {
      setTransformProfiles({
        left: { loading: false, profiles: [] },
        right: { loading: false, profiles: [] },
      })
      return
    }
    let cancelled = false
    setTransformProfiles({
      left: { loading: true, profiles: [] },
      right: { loading: true, profiles: [] },
    })
    const loadSide = async (side: 'left' | 'right'): Promise<[typeof side, TransformProfileState]> => {
      if (workspace.mode === 'vertical' && side === 'right') {
        return [side, { loading: false, profiles: [] }]
      }
      const identity = workspace[side]
      const device = devices.find((item) => item.id === identity.deviceId)
      if (!device?.capabilities.includes('browser.transform.profile.list')) {
        return [
          side,
          {
            loading: false,
            profiles: [],
            error: '当前插件未声明明文网关读取能力',
          },
        ]
      }
      try {
        const profiles = await callBrowserExtensionCapability<BrowserTransformProfileSummary[]>(
          identity.deviceId,
          'browser.transform.profile.list',
          identity.target,
          30_000,
        )
        const baseline = workspace.mode === 'vertical' ? workspace.baselines.right : workspace.baselines[side]
        const requiredPaths = workspace.mode === 'vertical' ? operationDynamicPaths : dynamicBaselinePaths
        const visibleProfiles = profiles.filter((profile) => {
          const destinations = transformOutputDestinations(profile)
          const writesAuthentication = destinations.some((destination) =>
            ['header.authorization', 'header.cookie', 'header.host', 'header.proxy-authorization'].includes(
              destination.toLowerCase(),
            ),
          )
          const outputsMatch =
            workspace.mode === 'vertical'
              ? destinations.length === requiredPaths.length &&
                requiredPaths.every((path) => destinations.includes(path))
              : hasCandidatesRequiringLogicalBinding || logicalBindingsReady
                ? destinations.some((destination) => destination === 'body' || destination.startsWith('body.'))
                : requiredPaths.every((path) => destinations.includes(path))
          return (
            profile.enabled &&
            profile.request.enabled &&
            profile.origin === identity.origin &&
            profile.isolationContextId === identity.isolationContextId &&
            profile.cookieStoreId === identity.cookieStoreId &&
            profile.target.tabId === identity.target.tabId &&
            profile.target.frameId === identity.target.frameId &&
            profile.target.documentId === identity.target.documentId &&
            (!profile.match.methods.length ||
              profile.match.methods.some(
                (method) => method.toUpperCase() === baseline?.request.method.toUpperCase(),
              )) &&
            Boolean(baseline && wildcardURLMatches(profile.match.urlPattern, baseline.request.url)) &&
            outputsMatch &&
            !writesAuthentication &&
            (!profile.recovery || profile.recovery.state === 'ready')
          )
        })
        return [
          side,
          {
            loading: false,
            profiles: visibleProfiles,
            error: visibleProfiles.length ? undefined : '当前身份文档没有匹配此基线路由的请求明文网关',
          },
        ]
      } catch (error) {
        return [
          side,
          {
            loading: false,
            profiles: [],
            error: error instanceof Error ? error.message : `${error}`,
          },
        ]
      }
    }
    void Promise.all([loadSide('left'), loadSide('right')]).then((entries) => {
      if (cancelled) return
      const next = Object.fromEntries(entries) as Record<'left' | 'right', TransformProfileState>
      setTransformProfiles(next)
      setSelectedTransforms((current) => ({
        left: next.left.profiles.some((profile) => profile.id === current.left)
          ? current.left
          : next.left.profiles[0]?.id || '',
        right: next.right.profiles.some((profile) => profile.id === current.right)
          ? current.right
          : next.right.profiles[0]?.id || '',
      }))
    })
    return () => {
      cancelled = true
    }
  }, [
    devices,
    dynamicBaselinePaths,
    hasCandidatesRequiringLogicalBinding,
    logicalBindingsReady,
    operationDynamicPaths,
    showTransformBindings,
    transformDeviceCapabilityKey,
    workspace,
    workspace?.baselinePair.state,
    workspace?.baselines.left?.id,
    workspace?.baselines.right?.id,
    workspace?.id,
  ])

  const createProof = async () => {
    if (!leftTab || !rightTab || !leftDevice || !rightDevice || sameTab) return
    setChecking(true)
    setAuthContexts({
      left: { loading: false },
      right: { loading: false },
    })
    try {
      setAuthContexts({
        left: { loading: true },
        right: { loading: true },
      })
      const inspectExisting = Boolean(
        workspaceId && workspaceState !== 'stale' && (proof?.expiresAt || 0) > Date.now() + 10_000,
      )
      const nextWorkspace = await executeBrowserExtensionTask<BrowserAuthorizationWorkspaceResult>(
        left.deviceId,
        inspectExisting ? 'authorization.workspace.inspect' : 'authorization.workspace.create',
        inspectExisting
          ? { workspaceId, revalidate: true }
          : {
              mode,
              left: {
                deviceId: left.deviceId,
                tabId: leftTab.id,
                frameId: 0,
                accountLabel: left.accountLabel,
              },
              right: {
                deviceId: right.deviceId,
                tabId: rightTab.id,
                frameId: 0,
                accountLabel: right.accountLabel,
              },
            },
        60_000,
      )
      applyWorkspaceResult(nextWorkspace)
    } catch (error) {
      dispatchWorkspace({ type: 'workspace.clear' })
      yakitFailed(error instanceof Error ? error.message : `${error}`)
    } finally {
      setChecking(false)
    }
  }

  const openIncognito = async () => {
    const sourceDevice = incognitoIdentitySource?.device
    const sourceTab = incognitoIdentitySource?.tab
    if (!sourceDevice || !sourceTab) return
    try {
      await callBrowserExtensionCapability(
        sourceDevice.id,
        'browser.isolation.incognito.open',
        { url: sourceTab.url },
        30_000,
      )
      success('无痕身份页面已打开；请在插件中将新页面加入当前共享会话')
      await loadDevice(sourceDevice.id)
    } catch (error) {
      yakitFailed(error instanceof Error ? error.message : `${error}`)
    }
  }

  const openContainer = async () => {
    const sourceDevice = containerIdentitySource?.device
    const sourceTab = containerIdentitySource?.tab
    if (!sourceDevice || !sourceTab) return
    try {
      const result = await callBrowserExtensionCapability<BrowserFirefoxContainerIdentityResult>(
        sourceDevice.id,
        'browser.isolation.container.open',
        {
          url: sourceTab.url,
          name: `Yakit · ${right.accountLabel.trim() || '身份 B'}`,
        },
        30_000,
      )
      setCreatedContainer({
        deviceId: sourceDevice.id,
        cookieStoreId: result.container.cookieStoreId,
        name: result.container.name,
      })
      success(`${result.container.name} 已打开；登录后请在插件中将该页面加入当前共享会话`)
      await loadDevice(sourceDevice.id)
    } catch (error) {
      yakitFailed(error instanceof Error ? error.message : `${error}`)
    }
  }

  const removeManagedContainer = async (candidate: ManagedFirefoxContainerReference, onRemoved?: () => void) => {
    try {
      await callBrowserExtensionCapability(
        candidate.deviceId,
        'browser.isolation.container.remove',
        { cookieStoreId: candidate.cookieStoreId },
        30_000,
      )
      if (left.deviceId === candidate.deviceId && leftContext?.cookieStoreId === candidate.cookieStoreId) {
        changeIdentitySelection('left', (current) => ({ ...current, tabId: undefined }))
      }
      if (right.deviceId === candidate.deviceId && rightContext?.cookieStoreId === candidate.cookieStoreId) {
        changeIdentitySelection('right', (current) => ({ ...current, tabId: undefined }))
      }
      setCreatedContainer((current) =>
        current?.deviceId === candidate.deviceId && current.cookieStoreId === candidate.cookieStoreId
          ? undefined
          : current,
      )
      setManagedContainers((current) => ({
        ...current,
        [candidate.deviceId]: (current[candidate.deviceId] || []).filter(
          (container) => container.cookieStoreId !== candidate.cookieStoreId,
        ),
      }))
      await loadDevice(candidate.deviceId)
      success('临时 Firefox 身份已清理')
      onRemoved?.()
    } catch (error) {
      yakitFailed(error instanceof Error ? error.message : `${error}`)
    }
  }

  const confirmRemoveContainer = () => {
    if (!managedContainer) return
    if (managedContainerCandidates.length > 1 && !selectedManagedContainer) {
      const modal = showYakitModal({
        width: 520,
        title: '清理临时 Firefox 身份',
        footer: null,
        content: (
          <div className={styles['managed-container-list']}>
            <p>仅列出由 Yakit 创建的临时 Container。选择一个身份后，会同时关闭其中仍打开的标签页。</p>
            {managedContainerCandidates.map((candidate) => (
              <div className={styles['managed-container-row']} key={`${candidate.deviceId}:${candidate.cookieStoreId}`}>
                <span>
                  <strong>{candidate.name}</strong>
                  <small>{candidate.tabCount ?? 0} 个打开页面</small>
                </span>
                <YakitButton
                  type="outline2"
                  icon={<DeleteOutlined />}
                  onClick={() => void removeManagedContainer(candidate, modal.destroy)}
                >
                  清理
                </YakitButton>
              </div>
            ))}
          </div>
        ),
      })
      return
    }
    const modal = YakitModalConfirm({
      width: 430,
      title: '清理临时 Firefox 身份',
      content: `删除“${managedContainer.name}”及其中打开的标签页？只会清理由 Yakit 创建的临时 Container。`,
      onOkText: '删除临时身份',
      showConfirmLoading: true,
      onOk: () => void removeManagedContainer(managedContainer, modal.destroy),
    })
  }

  const renderIdentity = (
    side: 'left' | 'right',
    slot: IdentitySlot,
    update: React.Dispatch<React.SetStateAction<IdentitySlot>>,
    inspection: BrowserIsolationInspection | undefined,
    selectedTab: BrowserIsolationTab | undefined,
    context: BrowserIsolationContext | undefined,
  ) => {
    const state = inspections[slot.deviceId]
    const authContext = authContexts[side]
    return (
      <section className={styles['identity-lane']} data-side={side}>
        <header>
          <span className={styles['identity-letter']}>{side === 'left' ? 'A' : 'B'}</span>
          <div>
            <strong>{slot.accountLabel || (side === 'left' ? '身份 A' : '身份 B')}</strong>
            <small>{selectedTab ? identityKind(context) : '选择一个已共享页面'}</small>
          </div>
          <span className={`${styles['level']} ${styles[context?.level || 'pending']}`}>
            {levelLabel(context?.level)}
          </span>
        </header>
        <label>
          <span>浏览器身份</span>
          <YakitSelect
            value={slot.deviceId}
            options={deviceOptions}
            onChange={(deviceId) =>
              changeIdentitySelection(side, (current) => ({ ...current, deviceId, tabId: undefined }))
            }
            placeholder="选择在线浏览器"
          />
        </label>
        <label>
          <span>页面身份</span>
          <YakitSelect
            value={slot.tabId}
            loading={state?.loading}
            options={(inspection?.tabs || []).map(tabOption)}
            onChange={(tabId) => changeIdentitySelection(side, (current) => ({ ...current, tabId }))}
            placeholder={state?.error || '选择已共享标签页'}
          />
        </label>
        <label>
          <span>账号标签</span>
          <YakitInput
            value={slot.accountLabel}
            maxLength={80}
            onChange={(event) => update((current) => ({ ...current, accountLabel: event.target.value }))}
            placeholder="例如：普通用户 / 管理员"
          />
        </label>
        {state?.error ? (
          <div className={styles['lane-error']}>
            <WarningOutlined />
            <span>{state.error}</span>
          </div>
        ) : selectedTab ? (
          <>
            <dl>
              <div>
                <dt>来源</dt>
                <dd>{originOf(selectedTab.url) || '-'}</dd>
              </div>
              <div>
                <dt>Cookie Store</dt>
                <dd title={selectedTab.cookieStoreId}>{shortIdentity(selectedTab.cookieStoreId, 24)}</dd>
              </div>
              <div>
                <dt>隔离依据</dt>
                <dd>{context?.reasons[0] || '等待浏览器返回隔离证据'}</dd>
              </div>
            </dl>
            <div
              className={`${styles['auth-context']} ${
                authContext.error ? styles.failed : authContext.handle ? styles.confirmed : ''
              }`}
            >
              <span className={styles['auth-context-mark']}>
                {authContext.handle ? <CheckCircleOutlined /> : <UserOutlined />}
              </span>
              <span>
                <strong>{authContext.loading ? '正在确认认证上下文' : authenticationLabel(authContext.handle)}</strong>
                <small title={authContext.error || authContext.handle?.fingerprint}>
                  {authContext.error ||
                    (authContext.handle
                      ? `${shortIdentity(authContext.handle.fingerprint.replace('hmac-sha256:', ''), 14)} · ${
                          authContext.handle.authentication.cookieCount
                        } Cookie · ${authContext.handle.authentication.storageEntryCount} 认证 Storage`
                      : '隔离预检通过后自动生成短时句柄')}
                </small>
              </span>
            </div>
          </>
        ) : (
          <div className={styles['lane-empty']}>
            <UserOutlined />
            <span>共享登录后的页面，再把它放入这个身份槽位</span>
          </div>
        )}
      </section>
    )
  }

  if (!devices.length) {
    return (
      <div className={styles['authorization-workspace']}>
        <ManagedBrowserIdentityRail onPreparePairing={onPreparePairing} onRefreshDevices={onRefreshDevices} />
        <div className={styles['workspace-empty']}>
          <ChromeOutlined />
          <strong>没有可用于双身份测试的在线浏览器</strong>
          <span>可以先在上方创建两个独立身份；安装并配对插件后，浏览器会自动出现在身份列表。</span>
        </div>
      </div>
    )
  }

  const proofVisualLevel = proof?.level
  const bothContextsReady = Boolean(authContexts.left.handle && authContexts.right.handle)
  const conditionalProof = proof?.level === 'conditional'
  const proofReady = Boolean(
    (workspaceState === 'ready' || workspaceState === 'conditional') &&
    (proof?.level === 'strong' || conditionalProof) &&
    bothContextsReady,
  )
  const baselineCapabilityReady = Boolean(
    leftDevice &&
    rightDevice &&
    [
      'browser.network.start',
      'browser.network.stop',
      'browser.authorization.baseline.candidates',
      'browser.authorization.baseline.capture',
      'browser.authorization.baseline.get',
    ].every((method) => leftDevice.capabilities.includes(method)) &&
    (sameDevice ||
      [
        'browser.network.start',
        'browser.network.stop',
        'browser.authorization.baseline.candidates',
        'browser.authorization.baseline.capture',
        'browser.authorization.baseline.get',
      ].every((method) => rightDevice.capabilities.includes(method))),
  )
  const executionCapabilities =
    workspace?.mode === 'vertical'
      ? [
          'browser.authorization.baseline.packet.compile',
          ...(workspace.plan?.operation?.transform
            ? ['browser.transform.profile.list', 'browser.transform.execute']
            : []),
        ]
      : [
          'browser.authorization.baseline.resource.get',
          workspace?.plan?.transforms
            ? 'browser.authorization.baseline.transform.compile'
            : 'browser.authorization.baseline.compile',
        ]
  const executionCapabilityReady = Boolean(
    leftDevice &&
    rightDevice &&
    executionCapabilities.every((method) => leftDevice.capabilities.includes(method)) &&
    (sameDevice || executionCapabilities.every((method) => rightDevice.capabilities.includes(method))),
  )
  const dynamicTransformCapabilityReady = Boolean(
    !requiresDynamicProfiles ||
    (leftDevice &&
      rightDevice &&
      [
        'browser.transform.profile.list',
        'browser.authorization.baseline.transform.inspect',
        'browser.authorization.baseline.transform.compile',
      ].every((method) => leftDevice.capabilities.includes(method)) &&
      (sameDevice ||
        [
          'browser.transform.profile.list',
          'browser.authorization.baseline.transform.inspect',
          'browser.authorization.baseline.transform.compile',
        ].every((method) => rightDevice.capabilities.includes(method)))),
  )
  const logicalBindingCapabilityReady = Boolean(
    leftDevice &&
    rightDevice &&
    ['browser.transform.profile.list', 'browser.authorization.baseline.logical.bind'].every((method) =>
      leftDevice.capabilities.includes(method),
    ) &&
    (sameDevice ||
      ['browser.transform.profile.list', 'browser.authorization.baseline.logical.bind'].every((method) =>
        rightDevice.capabilities.includes(method),
      )),
  )

  const stopBaselineCapture = async () => {
    const active = activeBaselineCaptureRef.current
    activeBaselineCaptureRef.current = undefined
    setBaselineCapture({ phase: 'idle', candidates: [] })
    if (!active) return
    try {
      await callBrowserExtensionCapability(active.deviceId, 'browser.network.stop', active.target, 20_000)
    } catch (error) {
      yakitFailed(error instanceof Error ? error.message : `${error}`)
    }
  }

  const startBaselineCapture = async (side: AuthorizationBaselineSide) => {
    if (!workspace || !proofReady || !baselineCapabilityReady || baselineCapture.phase !== 'idle') return
    const identity = workspace[side === 'verification' ? 'right' : side]
    setBaselineCapture({ phase: 'starting', side, candidates: [] })
    try {
      await callBrowserExtensionCapability(
        identity.deviceId,
        'browser.network.start',
        {
          ...identity.target,
          captureHeaders: true,
          captureBody: true,
          maxEntries: 100,
          maxBodyBytes: 65_536,
        },
        30_000,
      )
      activeBaselineCaptureRef.current = {
        deviceId: identity.deviceId,
        target: identity.target,
      }
      setBaselineCapture({ phase: 'recording', side, candidates: [] })
      info(
        side === 'verification'
          ? '请在身份 B 页面读取一次能够反映操作结果的状态接口，然后返回选择该只读请求'
          : `请在身份 ${side === 'left' ? 'A' : 'B'} 页面执行一次正常业务操作，然后返回读取请求`,
      )
    } catch (error) {
      setBaselineCapture({ phase: 'idle', candidates: [] })
      yakitFailed(error instanceof Error ? error.message : `${error}`)
    }
  }

  const loadBaselineCandidates = async () => {
    const side = baselineCapture.side
    if (!workspace || !side || !['recording', 'selecting'].includes(baselineCapture.phase)) return
    const identity = workspace[side === 'verification' ? 'right' : side]
    setBaselineCapture({ phase: 'loading', side, candidates: [] })
    try {
      const candidates = await callBrowserExtensionCapability<BrowserAuthorizationBaselineCandidate[]>(
        identity.deviceId,
        'browser.authorization.baseline.candidates',
        {
          ...identity.target,
          authContextKind: identity.contextReference.kind,
          authContextId: identity.contextReference.id,
          limit: 100,
        },
        30_000,
      )
      const visibleCandidates =
        side === 'verification'
          ? candidates.filter((candidate) => ['GET', 'HEAD', 'OPTIONS'].includes(candidate.method.toUpperCase()))
          : candidates
      if (!visibleCandidates.length) {
        setBaselineCapture({ phase: 'recording', side, candidates: [] })
        info(
          side === 'verification'
            ? '暂未捕获到可用的只读状态请求，请在身份 B 页面触发一次状态查询后重试'
            : '暂未捕获到当前来源的请求，请回到页面执行目标操作后重试',
        )
        return
      }
      setBaselineCapture({ phase: 'selecting', side, candidates: visibleCandidates })
    } catch (error) {
      setBaselineCapture({ phase: 'recording', side, candidates: [] })
      yakitFailed(error instanceof Error ? error.message : `${error}`)
    }
  }

  const bindBaseline = async (candidate: BrowserAuthorizationBaselineCandidate) => {
    const side = baselineCapture.side
    if (!workspace || !side || !candidate.eligible) return
    setBaselineCapture((current) => ({ ...current, phase: 'binding' }))
    try {
      const nextWorkspace = await executeBrowserExtensionTask<BrowserAuthorizationWorkspaceResult>(
        workspace.left.deviceId,
        'authorization.baseline.bind',
        {
          workspaceId: workspace.id,
          side,
          networkRequestId: candidate.id,
        },
        60_000,
      )
      const active = activeBaselineCaptureRef.current
      activeBaselineCaptureRef.current = undefined
      if (active) {
        await callBrowserExtensionCapability(active.deviceId, 'browser.network.stop', active.target, 20_000).catch(
          () => undefined,
        )
      }
      setBaselineCapture({ phase: 'idle', candidates: [] })
      applyWorkspaceResult(nextWorkspace)
      success(
        side === 'verification'
          ? '后置状态验证请求已确认'
          : mode === 'vertical'
            ? `${side === 'left' ? '低权限控制' : '高权限操作模板'}已确认`
            : `身份 ${side === 'left' ? 'A' : 'B'} 的正常基线已确认`,
      )
    } catch (error) {
      setBaselineCapture((current) => ({ ...current, phase: 'selecting' }))
      yakitFailed(error instanceof Error ? error.message : `${error}`)
    }
  }

  const clearVerificationBaseline = async () => {
    if (!workspace?.baselines.verification || baselineCapture.phase !== 'idle') return
    setBaselineCapture({ phase: 'binding', side: 'verification', candidates: [] })
    try {
      const nextWorkspace = await executeBrowserExtensionTask<BrowserAuthorizationWorkspaceResult>(
        workspace.left.deviceId,
        'authorization.baseline.bind',
        {
          workspaceId: workspace.id,
          side: 'verification',
          clear: true,
        },
        60_000,
      )
      setBaselineCapture({ phase: 'idle', candidates: [] })
      applyWorkspaceResult(nextWorkspace)
      success('已移除后置状态验证请求，纵向计划恢复为三项')
    } catch (error) {
      setBaselineCapture({ phase: 'idle', candidates: [] })
      yakitFailed(error instanceof Error ? error.message : `${error}`)
    }
  }

  const bindLogicalRequests = async () => {
    if (
      !workspace ||
      workspace.baselinePair.state !== 'matched' ||
      !selectedTransforms.left ||
      !selectedTransforms.right ||
      !logicalBindingCapabilityReady
    ) {
      return
    }
    setBindingLogical(true)
    try {
      const nextWorkspace = await executeBrowserExtensionTask<BrowserAuthorizationWorkspaceResult>(
        workspace.left.deviceId,
        'authorization.logical.bind',
        {
          workspaceId: workspace.id,
          transformProfiles: {
            left: selectedTransforms.left,
            right: selectedTransforms.right,
          },
        },
        90_000,
      )
      applyWorkspaceResult(nextWorkspace)
      const count = nextWorkspace.baselinePair.resourceCandidates.filter(
        (candidate) => candidate.source === 'logical',
      ).length
      if (count) {
        success(`逻辑明文已验证，发现 ${count} 个可用于交叉矩阵的字段`)
      } else {
        info('逻辑明文已验证，但 A/B 样本中尚未发现不同的非认证资源字段')
      }
    } catch (error) {
      yakitFailed(error instanceof Error ? error.message : `${error}`)
    } finally {
      setBindingLogical(false)
    }
  }

  const createAuthorizationPlan = async () => {
    if (!workspace || workspace.baselinePair.state !== 'matched' || !selectedResource) return
    const candidate =
      workspace.mode === 'vertical'
        ? workspace.baselinePair.operationCandidates.find((item) => item.id === selectedResource)
        : workspace.baselinePair.resourceCandidates.find((item) => item.id === selectedResource)
    if (!candidate) return
    if ('requiresLogicalBinding' in candidate && candidate.requiresLogicalBinding) {
      yakitFailed('当前 Body 字段无法确定性替换，请先在下方验证并绑定明文网关，再选择生成的“明文”候选')
      return
    }
    if ('eligible' in candidate && !candidate.eligible) {
      yakitFailed(candidate.reasons[0] || '当前高权限操作模板缺少低权限认证骨架')
      return
    }
    if ('requiresDynamicRebuild' in candidate && candidate.requiresDynamicRebuild) {
      if (!selectedTransforms.left) {
        yakitFailed('请选择绑定低权限页面、且精确覆盖动态字段的明文网关')
        return
      }
    }
    const canaries = parseAuthorizationCanaryPaths(canaryPathText)
    if (canaries.invalid.length || canaries.paths.length > 8) {
      yakitFailed(
        canaries.paths.length > 8
          ? '响应归属路径最多填写 8 个'
          : `响应归属路径格式无效：${canaries.invalid.join(', ')}`,
      )
      return
    }
    if (requiresDynamicProfiles && (!selectedTransforms.left || !selectedTransforms.right)) {
      yakitFailed('动态授权请求必须为身份 A、B 分别选择同一文档下可用的明文网关')
      return
    }
    if (logicalBindingsReady && !logicalBindingsCurrent) {
      yakitFailed('所选明文网关与当前逻辑绑定不同，请先重新验证并绑定明文')
      return
    }
    setPlanning(true)
    try {
      const nextWorkspace = await executeBrowserExtensionTask<BrowserAuthorizationWorkspaceResult>(
        workspace.left.deviceId,
        'authorization.plan.create',
        {
          workspaceId: workspace.id,
          candidateId: candidate.id,
          canaryPaths: canaries.paths,
          ...(requiresDynamicProfiles
            ? {
                transformProfiles: {
                  left: selectedTransforms.left,
                  right: selectedTransforms.right,
                },
              }
            : {}),
          ...(workspace.mode === 'vertical' && requiresOperationTransform
            ? { operationTransformProfileId: selectedTransforms.left }
            : {}),
        },
        60_000,
      )
      applyWorkspaceResult(nextWorkspace)
      success(
        workspace.mode === 'vertical'
          ? `${nextWorkspace.plan?.requestBudget ?? 3} 项纵向授权计划已由引擎确定性编译`
          : '四项授权差异矩阵已由引擎确定性编译',
      )
    } catch (error) {
      yakitFailed(error instanceof Error ? error.message : `${error}`)
    } finally {
      setPlanning(false)
    }
  }

  const runAuthorizationPlan = async (approveSideEffects: boolean) => {
    if (!workspace?.plan || !['ready', 'review-required'].includes(workspace.plan.state) || !executionCapabilityReady) {
      return
    }
    setExecuting(true)
    try {
      const nextWorkspace = await executeBrowserExtensionTask<BrowserAuthorizationWorkspaceResult>(
        workspace.left.deviceId,
        'authorization.plan.execute',
        {
          workspaceId: workspace.id,
          planId: workspace.plan.id,
          approveSideEffects,
        },
        120_000,
      )
      applyWorkspaceResult(nextWorkspace)
      const verdict = nextWorkspace.execution?.verdict
      if (workspace.mode === 'vertical' && verdict === 'confirmed') {
        info('低权限探测成功，且独立后置状态发生可信变化，请复核业务影响')
      } else if (workspace.mode === 'vertical' && verdict === 'likely') {
        info('低权限探测获得高置信度响应证据，但后置状态尚不足以确认操作生效')
      } else if (verdict === 'confirmed' || verdict === 'likely') {
        info('矩阵发现高置信度的交叉资源读取证据，请复核响应语义')
      } else if (verdict === 'protected') {
        success(
          workspace.mode === 'vertical'
            ? '纵向计划完成，低权限特权操作被明确拒绝'
            : `四项${approveSideEffects ? '已审核' : '只读'}矩阵完成，两个交叉请求均被拒绝`,
        )
      } else {
        info('授权矩阵已完成，请结合响应差异确认业务语义')
      }
    } catch (error) {
      yakitFailed(error instanceof Error ? error.message : `${error}`)
    } finally {
      setExecuting(false)
    }
  }

  const executeAuthorizationPlan = () => {
    if (!workspace?.plan || !executionCapabilityReady) return
    if (workspace.plan.state !== 'review-required') {
      void runAuthorizationPlan(false)
      return
    }
    const methods = [...new Set(workspace.plan.cases.map((testCase) => testCase.method))].join(' / ')
    const vertical = workspace.mode === 'vertical'
    const modal = YakitModalConfirm({
      width: 500,
      title: vertical ? '审核纵向授权计划' : '审核四项非只读授权矩阵',
      content: (
        <div className={styles['side-effect-review']}>
          <p>
            {vertical
              ? `将按引擎固定顺序执行纵向控制与探测，最多 ${workspace.plan.requestBudget} 次请求。`
              : '将对当前明确选择的资源字段执行固定四项矩阵，共 4 次请求。'}{' '}
            不重试、不跟随重定向；这些请求可能修改服务端状态。
          </p>
          <dl>
            <div>
              <dt>方法</dt>
              <dd>{methods}</dd>
            </div>
            <div>
              <dt>{vertical ? '特权路由' : '路由'}</dt>
              <dd>{workspace.plan.cases[vertical ? 1 : 0]?.path || '-'}</dd>
            </div>
            {workspace.baselines.left?.request.protocol === 'graphql' && (
              <div>
                <dt>GraphQL</dt>
                <dd>{workspace.baselines.left.request.operationNames?.join(' + ') || 'anonymous'}</dd>
              </div>
            )}
            <div>
              <dt>{vertical ? '认证移植' : '资源字段'}</dt>
              <dd>
                {vertical
                  ? `${workspace.plan.operation?.authenticationPaths.length || 0} 个认证 / CSRF 字段`
                  : workspace.plan.selector.path}
              </dd>
            </div>
          </dl>
          <small>
            {vertical
              ? workspace.plan.operation?.verificationBaselineId
                ? '前两项控制与状态前快照成功后才发送探测；仅探测成功后读取状态后快照。'
                : '只有前两项控制均成功，才会发送低权限特权操作探测。'
              : 'A-own 与 B-own 正常对照成功后，才会继续 A-to-B 与 B-to-A。'}
          </small>
        </div>
      ),
      onOkText: `批准并执行最多 ${workspace.plan.requestBudget} 次请求`,
      onOk: () => {
        modal.destroy()
        void runAuthorizationPlan(true)
      },
    })
  }

  return (
    <div className={styles['authorization-workspace']}>
      <div className={styles['authorization-console-positioning']}>
        <ChromeOutlined />
        <div>
          <strong>日常测试建议从浏览器插件发起</strong>
          <span>这里是高级证据控制台：用于跨设备身份、受管浏览器、动态明文网关、AI 分析和完整执行证据。</span>
        </div>
      </div>
      <div className={styles['authorization-heading']}>
        <div>
          <span className={styles['eyebrow']}>AUTHORIZATION DIFFERENTIAL</span>
          <h3>{mode === 'vertical' ? '纵向权限工作区' : '横向资源工作区'}</h3>
          <p>
            {mode === 'vertical'
              ? '用低权限身份的认证骨架验证高权限操作；先建立隔离证据，再录制两种不同业务动作。'
              : '用两个隔离身份验证同一业务操作的资源归属；不同 tabId 本身不是隔离证据。'}
          </p>
        </div>
        <div>
          <YakitButton type="outline2" icon={<ReloadOutlined />} onClick={() => void refresh()}>
            刷新现场
          </YakitButton>
          {incognitoIdentitySource && (
            <YakitButton type="outline2" icon={<PlusOutlined />} onClick={() => void openIncognito()}>
              添加无痕身份
            </YakitButton>
          )}
          {containerIdentitySource && (
            <YakitButton type="outline2" icon={<PlusOutlined />} onClick={() => void openContainer()}>
              添加 Container 身份
            </YakitButton>
          )}
          {managedContainer && (
            <YakitButton type="outline2" icon={<DeleteOutlined />} onClick={confirmRemoveContainer}>
              {managedContainerCandidates.length > 1
                ? `清理测试身份 · ${managedContainerCandidates.length}`
                : '清理测试身份'}
            </YakitButton>
          )}
        </div>
      </div>

      <div className={styles['authorization-mode-switch']} role="radiogroup" aria-label="授权测试模式">
        <button
          type="button"
          role="radio"
          aria-checked={mode === 'horizontal'}
          data-active={mode === 'horizontal'}
          onClick={() => {
            if (mode === 'horizontal') return
            changeAuthorizationMode('horizontal')
          }}
        >
          <span>横向资源</span>
          <small>同一操作 · 交换资源字段</small>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={mode === 'vertical'}
          data-active={mode === 'vertical'}
          onClick={() => {
            if (mode === 'vertical') return
            changeAuthorizationMode('vertical')
          }}
        >
          <span>纵向权限</span>
          <small>不同操作 · 移植低权限认证</small>
        </button>
      </div>

      <ManagedBrowserIdentityRail
        targetUrl={leftTab?.url || rightTab?.url}
        devices={devices}
        onPreparePairing={onPreparePairing}
        onAssignIdentity={(side, deviceId) => {
          changeIdentitySelection(side, (current) => ({ ...current, deviceId, tabId: undefined }))
        }}
        onRefreshDevices={async () => {
          await onRefreshDevices?.()
          await refresh()
        }}
      />

      <div className={styles['identity-stage']}>
        {renderIdentity('left', left, setLeft, leftInspection, leftTab, leftContext)}
        <div className={styles['proof-spine']}>
          <span className={`${styles['proof-mark']} ${proofVisualLevel ? styles[proofVisualLevel] : ''}`}>
            {proofReady ? <CheckCircleOutlined /> : <SafetyCertificateOutlined />}
          </span>
          <strong>
            {proofReady
              ? conditionalProof
                ? '条件身份已预检'
                : '身份已确认'
              : workspaceState === 'stale'
                ? '身份已失效'
                : proof
                  ? levelLabel(proof.level)
                  : '隔离证明'}
          </strong>
          <small>
            {sameTab
              ? 'A/B 不能使用同一个页面'
              : !capabilityReady
                ? '当前在线插件缺少统一身份证明能力，请更新并重新连接'
                : workspaceState === 'stale' && workspace?.recovery
                  ? workspace.recovery.message
                  : proof
                    ? proof.reasons[0]
                    : '比较安装身份、Cookie Store 与来源'}
          </small>
          <YakitButton size="small" loading={checking} disabled={!canCheck} onClick={() => void createProof()}>
            {workspaceState === 'stale' ? '重新建立' : workspaceId ? '实时复核' : '执行预检'}
          </YakitButton>
          {workspace && (
            <small title={`引擎实例 ${workspace.engineInstanceId} · ${new Date(workspace.expiresAt).toLocaleString()}`}>
              工作区剩余 {workspaceRemaining(workspace.expiresAt, workspaceClock)}
            </small>
          )}
        </div>
        {renderIdentity('right', right, setRight, rightInspection, rightTab, rightContext)}
      </div>

      <section className={styles['baseline-workflow']}>
        <header>
          <div>
            <span className={styles['baseline-kicker']}>
              {mode === 'vertical' ? 'OPERATION TEMPLATE' : 'NORMAL BASELINE'}
            </span>
            <strong>
              {workspace?.execution
                ? mode === 'vertical'
                  ? '已封存的权限操作基线'
                  : '已封存的 A/B 正常业务基线'
                : mode === 'vertical'
                  ? '录制低权限控制与高权限特权操作'
                  : '分别录制一次正常业务请求'}
            </strong>
            <small>
              {workspace?.execution
                ? '来自已完成的插件工作区，无需重新录制；仅在主动重新测试时修改下方基线。'
                : mode === 'vertical'
                  ? 'A 录制低权限可稳定成功的控制请求，B 录制准备验证的高权限动作。'
                  : '请求值保留在插件短时私有存储；工作区只接收字段结构和可比较指纹。'}
            </small>
          </div>
          <span
            className={`${styles['baseline-pair-state']} ${
              workspace?.baselinePair.state ? styles[workspace.baselinePair.state] : ''
            }`}
          >
            {workspace?.baselinePair.state === 'matched'
              ? mode === 'vertical'
                ? '模板已就绪'
                : '结构已配对'
              : workspace?.baselinePair.state === 'mismatch'
                ? '业务结构不同'
                : '等待 A/B'}
          </span>
        </header>

        <div className={styles['baseline-lanes']}>
          {(['left', 'right'] as const).map((side) => {
            const baseline = workspace?.baselines[side]
            const active = baselineCapture.side === side && baselineCapture.phase !== 'idle'
            return (
              <div className={styles['baseline-lane']} data-active={active} key={side}>
                <span className={styles['baseline-letter']}>{side === 'left' ? 'A' : 'B'}</span>
                <span className={styles['baseline-copy']}>
                  <strong>
                    {baseline
                      ? authorizationRequestLabel(baseline.request)
                      : mode === 'vertical'
                        ? side === 'left'
                          ? '低权限正常控制请求'
                          : '高权限特权操作'
                        : `${side === 'left' ? left.accountLabel : right.accountLabel} 的正常请求`}
                  </strong>
                  <small>
                    {baseline
                      ? `${baseline.request.fields.length} 个结构字段 · ${shortIdentity(
                          baseline.request.actionFingerprint.replace('sha256:', ''),
                          12,
                        )}`
                      : proofReady
                        ? mode === 'vertical'
                          ? side === 'left'
                            ? '录制一个低权限身份可稳定成功的普通动作'
                            : '录制需要验证的高权限按钮、接口或 GraphQL 操作'
                          : '点击录制，然后在对应页面执行一次目标操作'
                        : '先完成身份隔离与认证预检'}
                  </small>
                </span>
                {baseline ? <CheckOutlined className={styles['baseline-check']} /> : <ApiOutlined />}
                <YakitButton
                  size="small"
                  type="outline2"
                  disabled={!proofReady || !baselineCapabilityReady || baselineCapture.phase !== 'idle'}
                  onClick={() => void startBaselineCapture(side)}
                >
                  {baseline ? '重新录制' : '开始录制'}
                </YakitButton>
              </div>
            )
          })}
        </div>

        {mode === 'vertical' && workspace?.baselinePair.state === 'matched' && (
          <div
            className={styles['verification-baseline']}
            data-active={baselineCapture.side === 'verification' && baselineCapture.phase !== 'idle'}
          >
            <span className={styles['verification-icon']}>
              <SafetyCertificateOutlined />
            </span>
            <span className={styles['baseline-copy']}>
              <strong>
                {workspace.baselines.verification
                  ? authorizationRequestLabel(workspace.baselines.verification.request)
                  : '可选 · 后置状态验证请求'}
              </strong>
              <small>
                {workspace.baselines.verification
                  ? '计划将扩展为 5 项；仅当前后业务状态发生变化时确认操作生效'
                  : '在身份 B 下录制一个只读状态接口，用独立证据验证低权限操作是否真正生效'}
              </small>
            </span>
            {workspace.baselines.verification ? (
              <CheckOutlined className={styles['baseline-check']} />
            ) : (
              <ApiOutlined />
            )}
            <span className={styles['verification-actions']}>
              {workspace.baselines.verification && (
                <YakitButton
                  size="small"
                  type="text2"
                  icon={<DeleteOutlined />}
                  disabled={baselineCapture.phase !== 'idle'}
                  onClick={() => void clearVerificationBaseline()}
                />
              )}
              <YakitButton
                size="small"
                type="outline2"
                disabled={!proofReady || !baselineCapabilityReady || baselineCapture.phase !== 'idle'}
                onClick={() => void startBaselineCapture('verification')}
              >
                {workspace.baselines.verification ? '重新录制' : '绑定状态请求'}
              </YakitButton>
            </span>
          </div>
        )}

        {baselineCapture.phase !== 'idle' && baselineCapture.side && (
          <div className={styles['baseline-live']}>
            <span className={styles['live-signal']} />
            <span>
              <strong>
                {baselineCapture.phase === 'starting'
                  ? '正在启动网络捕获'
                  : baselineCapture.phase === 'loading'
                    ? '正在读取请求候选'
                    : baselineCapture.phase === 'binding'
                      ? '正在封存基线'
                      : baselineCapture.phase === 'selecting'
                        ? '选择这次业务操作对应的请求'
                        : baselineCapture.side === 'verification'
                          ? '正在录制后置状态请求'
                          : `正在录制身份 ${baselineCapture.side === 'left' ? 'A' : 'B'}`}
              </strong>
              <small>
                {baselineCapture.phase === 'recording'
                  ? baselineCapture.side === 'verification'
                    ? '回到身份 B 页面触发一次只读状态查询；完成后读取候选。'
                    : '回到该身份页面，只执行一次目标操作；完成后读取候选。'
                  : baselineCapture.phase === 'selecting'
                    ? '只显示方法、路径和状态，不会把 Header 或 Body 值送到 Yakit。'
                    : '工作区会继续保持当前身份绑定。'}
              </small>
            </span>
            <div>
              <YakitButton
                size="small"
                type="outline2"
                icon={<CloseOutlined />}
                disabled={baselineCapture.phase === 'binding'}
                onClick={() => void stopBaselineCapture()}
              >
                取消
              </YakitButton>
              {['recording', 'selecting'].includes(baselineCapture.phase) && (
                <YakitButton
                  size="small"
                  loading={baselineCapture.phase === 'loading'}
                  onClick={() => void loadBaselineCandidates()}
                >
                  {baselineCapture.phase === 'selecting' ? '刷新候选' : '读取请求'}
                </YakitButton>
              )}
            </div>
          </div>
        )}

        {baselineCapture.phase === 'selecting' && (
          <div className={styles['baseline-candidates']}>
            {baselineCapture.candidates.slice(0, 30).map((candidate) => (
              <button
                type="button"
                disabled={!candidate.eligible}
                key={candidate.id}
                onClick={() => void bindBaseline(candidate)}
              >
                <code>{candidate.method}</code>
                <span>
                  <strong>{candidate.path}</strong>
                  <small>
                    {candidate.eligible
                      ? `${candidate.resourceType} · ${candidate.durationMs ?? '-'} ms`
                      : candidate.reasons.join(' · ')}
                  </small>
                </span>
                <i className={candidate.statusCode && candidate.statusCode < 400 ? styles.ok : ''}>
                  {candidate.statusCode || candidate.error || 'pending'}
                </i>
                <b>{candidate.eligible ? '选择' : '不可用'}</b>
              </button>
            ))}
          </div>
        )}

        {workspace?.baselinePair.state === 'matched' && (
          <div className={styles['resource-candidates']}>
            <span>{workspace.mode === 'vertical' ? '高权限操作模板' : '差异资源字段'}</span>
            {workspace.mode === 'vertical' ? (
              workspace.baselinePair.operationCandidates.length ? (
                workspace.baselinePair.operationCandidates.map((candidate) => (
                  <button
                    type="button"
                    className={`${styles['resource-chip']} ${selectedResource === candidate.id ? styles.selected : ''}`}
                    key={candidate.id}
                    onClick={() => setSelectedResource(candidate.id)}
                  >
                    {candidate.method} {candidate.path}
                    <i>
                      {!candidate.eligible
                        ? '认证骨架不完整'
                        : candidate.requiresDynamicRebuild
                          ? '需要动态重算'
                          : `${candidate.authenticationPaths.length} 个认证字段`}
                    </i>
                  </button>
                ))
              ) : (
                <small>尚未形成可验证的高权限操作模板。</small>
              )
            ) : workspace.baselinePair.resourceCandidates.length ? (
              workspace.baselinePair.resourceCandidates.map((candidate) => (
                <button
                  type="button"
                  className={`${styles['resource-chip']} ${selectedResource === candidate.id ? styles.selected : ''}`}
                  key={candidate.id}
                  onClick={() => setSelectedResource(candidate.id)}
                >
                  {candidate.path}
                  <i>
                    {candidate.source === 'logical'
                      ? '明文'
                      : candidate.location === 'body' && !candidate.requiresLogicalBinding
                        ? '结构化 Body'
                        : candidate.requiresLogicalBinding
                          ? '报文 · 需明文网关'
                          : '报文'}
                    {' · '}
                    {candidate.confidence === 'high' ? '高' : '中'}
                  </i>
                </button>
              ))
            ) : (
              <small>两份请求结构一致，但没有发现非认证差异字段。</small>
            )}
            {availableCandidateCount > 0 && (
              <YakitButton
                size="small"
                loading={planning}
                title={
                  selectedCandidateRequiresLogicalBinding
                    ? '该线上 Body 不是双方均确认的结构化资源字段，请先验证并绑定下方的明文网关'
                    : undefined
                }
                disabled={
                  !selectedResource ||
                  selectedCandidateRequiresLogicalBinding ||
                  selectedOperationBlocked ||
                  baselineCapture.phase !== 'idle' ||
                  !dynamicTransformCapabilityReady ||
                  (requiresDynamicProfiles && (!selectedTransforms.left || !selectedTransforms.right)) ||
                  (requiresOperationTransform && !selectedTransforms.left) ||
                  (logicalBindingsReady && !logicalBindingsCurrent)
                }
                onClick={() => void createAuthorizationPlan()}
              >
                {workspace.mode === 'vertical'
                  ? workspace.plan
                    ? '重新编译计划'
                    : `编译${workspace.baselines.verification ? '五' : '三'}项计划`
                  : workspace.plan
                    ? '重新编译矩阵'
                    : '编译四项矩阵'}
              </YakitButton>
            )}
            {selectedCandidateRequiresLogicalBinding && (
              <small>当前 Body 字段可能是密文或动态产物；先绑定明文网关，再选择生成的“明文”候选。</small>
            )}
            {selectedOperationCandidate && selectedOperationBlocked && (
              <small>{selectedOperationCandidate.reasons.join(' · ')}</small>
            )}
            <YakitButton
              size="small"
              type="outline2"
              icon={<RobotOutlined />}
              disabled={baselineCapture.phase !== 'idle'}
              title="让 AI 解释 A/B 差异并从既有候选中提出确定性计划"
              onClick={() =>
                onAnalyzeWithAI({
                  deviceId: workspace.left.deviceId,
                  workspaceId: workspace.id,
                  mode: workspace.mode,
                  planId: workspace.plan?.id,
                  executionId: workspace.execution?.id,
                  requestBudget: workspace.plan?.requestBudget,
                })
              }
            >
              AI 辅助
            </YakitButton>
          </div>
        )}

        {workspace?.baselinePair.state === 'matched' && showTransformBindings && (
          <div className={styles['transform-bindings']} data-mode={workspace.mode}>
            <span>
              <strong>
                {workspace.mode === 'vertical'
                  ? '低权限动态重算'
                  : logicalBindingsReady
                    ? '明文资源已绑定'
                    : '加密 Body 明文绑定'}
              </strong>
              <small>
                {workspace.mode === 'vertical'
                  ? `${operationDynamicPaths.length} 个签名 / Nonce / 时间字段必须由身份 A 的页面重新计算`
                  : logicalBindingsReady
                    ? `${logicalCandidateCount} 个逻辑资源候选 · ${dynamicBaselinePaths.length || 0} 个线上动态字段`
                    : '选择 A/B 各自的明文网关，验证生成报文与线上基线结构'}
              </small>
            </span>
            {(workspace.mode === 'vertical' ? (['left'] as const) : (['left', 'right'] as const)).map((side) => (
              <label key={side} data-side={side}>
                <b>{side === 'left' ? 'A' : 'B'}</b>
                <YakitSelect
                  value={selectedTransforms[side] || undefined}
                  loading={transformProfiles[side].loading}
                  options={transformProfiles[side].profiles.map((profile) => ({
                    value: profile.id,
                    label: profile.name,
                  }))}
                  placeholder={
                    transformProfiles[side].error ||
                    (transformProfiles[side].profiles.length
                      ? workspace.mode === 'vertical'
                        ? '选择低权限页面的同路由明文网关'
                        : '选择该身份的明文网关'
                      : '当前文档没有可用明文网关')
                  }
                  onChange={(profileId) =>
                    setSelectedTransforms((current) => ({
                      ...current,
                      [side]: profileId,
                    }))
                  }
                />
              </label>
            ))}
            {workspace.mode === 'vertical' ? (
              <div className={styles['logical-binding-actions']}>
                <small>
                  {selectedTransforms.left
                    ? '编译计划时，引擎会固定 Profile 版本与输出路径；执行前再次实时复核'
                    : '先在低权限页面保存匹配高权限路由、且只输出上述动态字段的明文网关'}
                </small>
              </div>
            ) : (
              <div className={styles['logical-binding-actions']}>
                <small>
                  {!logicalBindingCapabilityReady
                    ? '在线插件缺少逻辑明文绑定能力，请更新并重新连接'
                    : selectedTransforms.left && selectedTransforms.right
                      ? logicalBindingsReady
                        ? logicalBindingsCurrent
                          ? '草稿、Profile 或页面文档变化后需要重新绑定'
                          : '明文网关选择已变化，请应用新绑定后再编译矩阵'
                        : '验证只在页面执行转换，不会调用页面 fetch'
                      : '先在两个身份页面分别保存同一路由的请求明文网关和本机回放草稿'}
                </small>
                <YakitButton
                  size="small"
                  type={logicalBindingsReady ? 'outline2' : 'primary'}
                  loading={bindingLogical}
                  disabled={
                    baselineCapture.phase !== 'idle' ||
                    !logicalBindingCapabilityReady ||
                    !selectedTransforms.left ||
                    !selectedTransforms.right
                  }
                  onClick={() => void bindLogicalRequests()}
                >
                  {logicalBindingsReady ? (logicalBindingsCurrent ? '重新验证绑定' : '应用新绑定') : '验证并绑定明文'}
                </YakitButton>
              </div>
            )}
          </div>
        )}

        {workspace?.baselinePair.state === 'matched' && availableCandidateCount > 0 && (
          <div
            className={styles['canary-config']}
            data-invalid={canaryConfiguration.invalid.length > 0 || canaryConfiguration.paths.length > 8}
          >
            <span>
              <strong>
                {workspace.mode === 'vertical' && workspace.baselines.verification
                  ? '操作响应 / 状态证据路径'
                  : '响应归属证据'}
              </strong>
              <small>可选 · 不填时自动识别</small>
            </span>
            <YakitInput
              size="small"
              value={canaryPathText}
              allowClear
              maxLength={2_048}
              placeholder={
                workspace.mode === 'vertical' && workspace.baselines.verification
                  ? '例如 body.state.revision，多个路径用逗号分隔'
                  : '例如 body.data.order.ownerId，多个路径用逗号分隔'
              }
              onChange={(event) => setCanaryPathText(event.target.value)}
            />
            <small>
              {canaryConfiguration.invalid.length
                ? `无法识别：${canaryConfiguration.invalid.join(', ')}`
                : canaryConfiguration.paths.length > 8
                  ? '最多填写 8 个路径'
                  : canaryConfiguration.paths.length
                    ? `${canaryConfiguration.paths.length} 个路径将与自动差分一起验证`
                    : workspace.mode === 'vertical'
                      ? workspace.baselines.verification
                        ? '同时比较操作响应与前后状态快照，结果仅保留路径和 HMAC'
                        : '比较高权限对照与低权限探测的业务字段，结果仅保留 HMAC'
                      : '只比较同一路径的 A/B/交叉值，结果仅保留 HMAC'}
            </small>
          </div>
        )}

        {workspace?.plan && (
          <div className={`${styles['authorization-plan']} ${styles[workspace.plan.state]}`}>
            <span>
              <SafetyCertificateOutlined />
              <strong>
                {workspace.plan.state === 'ready'
                  ? workspace.mode === 'vertical'
                    ? '纵向计划已就绪'
                    : '只读矩阵已就绪'
                  : workspace.plan.state === 'review-required'
                    ? workspace.mode === 'vertical'
                      ? '纵向计划执行前需要 Review'
                      : '矩阵执行前需要 Review'
                    : '矩阵等待动态字段重算'}
              </strong>
              <small>{workspace.plan.reasons.join(' · ')}</small>
            </span>
            <div>
              {workspace.plan.cases.map((testCase) => (
                <code key={testCase.id}>
                  {testCase.id}
                  <i>{testCase.authContextSide === 'left' ? 'A' : 'B'} auth</i>
                  <b>
                    {workspace.mode === 'vertical'
                      ? testCase.requestBaselineSide === 'left'
                        ? '低权限控制'
                        : '特权模板'
                      : `${testCase.resourceValueSide === 'left' ? 'A' : 'B'} resource`}
                  </b>
                </code>
              ))}
              <YakitButton
                size="small"
                loading={executing}
                disabled={
                  !['ready', 'review-required'].includes(workspace.plan.state) ||
                  !executionCapabilityReady ||
                  baselineCapture.phase !== 'idle'
                }
                title={
                  executionCapabilityReady
                    ? workspace.plan.state === 'review-required'
                      ? workspace.mode === 'vertical'
                        ? '审核后依次执行两项控制与一项低权限探测，不自动重试'
                        : '审核后固定执行两项正常对照与两项交叉访问，不自动重试'
                      : workspace.mode === 'vertical'
                        ? '两项控制成功后才执行低权限探测，不自动重试'
                        : '固定预算执行两项正常对照与两项交叉访问，不自动重试'
                    : '在线插件尚未声明受限请求执行能力，请更新插件并重新连接'
                }
                onClick={() => void executeAuthorizationPlan()}
              >
                {workspace.plan.state === 'review-required'
                  ? workspace.execution
                    ? '重新审核执行'
                    : workspace.mode === 'vertical'
                      ? '审核并执行计划'
                      : '审核并执行矩阵'
                  : workspace.execution
                    ? '重新执行'
                    : workspace.mode === 'vertical'
                      ? '执行纵向计划'
                      : '执行只读矩阵'}
              </YakitButton>
            </div>
          </div>
        )}

        {workspace?.execution && (
          <div
            ref={executionResultRef}
            className={`${styles['authorization-result']} ${styles[workspace.execution.verdict]}`}
          >
            <header>
              <span>{workspace.execution.verdict === 'protected' ? <CheckCircleOutlined /> : <WarningOutlined />}</span>
              <span>
                <strong>{browserAuthorizationVerdictLabel(workspace.mode, workspace.execution.verdict)}</strong>
                <small>{authorizationVerdictDetail(workspace.mode, workspace.execution.verdict)}</small>
                <em>
                  {workspace.execution.requestCount} 次真实请求 ·{' '}
                  {workspace.execution.confidence === 'none'
                    ? '无置信度'
                    : `${workspace.execution.confidence === 'high' ? '高' : workspace.execution.confidence === 'medium' ? '中' : '低'}置信度`}
                </em>
              </span>
            </header>
            <div className={styles['authorization-result-cases']}>
              {workspace.execution.cases.map((testCase) => (
                <span className={styles['authorization-case-result']} key={testCase.id}>
                  <code>{testCase.id}</code>
                  <strong>
                    {testCase.result
                      ? `${testCase.result.status} · ${authorizationOutcomeLabel(testCase.result.outcome)}`
                      : authorizationOutcomeLabel()}
                  </strong>
                  <small title={testCase.error || testCase.label}>
                    {testCase.error ||
                      `${formatAuthorizationDuration(testCase.result?.durationMs)} · ${testCase.label}`}
                  </small>
                </span>
              ))}
            </div>
            {workspace.execution.reasons.length > 0 && (
              <p className={styles['authorization-result-reasons']}>{workspace.execution.reasons.join(' · ')}</p>
            )}
            {workspace.execution.evidenceAvailable && (
              <AuthorizationEvidenceWorkbench
                deviceId={workspace.left.deviceId}
                workspace={workspace}
                onWorkspaceChange={applyWorkspaceResult}
              />
            )}
          </div>
        )}
      </section>

      <footer className={styles['authorization-next']}>
        <div>
          <span className={`${styles['next-index']} ${proofReady ? styles.ready : ''}`}>1</span>
          <span>
            <strong>隔离与认证</strong>
            <small>
              {proofReady
                ? conditionalProof
                  ? 'sessionStorage 登录态不同；还会用 A/B 正常请求复核实际认证字段'
                  : '两个短时认证句柄已绑定当前 document、grant 与 Cookie Store'
                : proof
                  ? proof.reasons.join(' · ')
                  : '选择两边页面并执行预检'}
            </small>
          </span>
        </div>
        <i />
        <div>
          <span
            className={`${styles['next-index']} ${workspace?.baselinePair.state === 'matched' ? styles.ready : ''}`}
          >
            2
          </span>
          <span>
            <strong>{mode === 'vertical' ? '控制与操作模板' : 'A/B 正常基线'}</strong>
            <small>
              {workspace?.baselinePair.reasons.join(' · ') ||
                (mode === 'vertical' ? 'A 录制低权限控制，B 录制高权限特权操作' : '分别录制语义相同的业务操作')}
            </small>
          </span>
        </div>
        <i />
        <div>
          <span className={`${styles['next-index']} ${workspace?.plan ? styles.ready : ''}`}>3</span>
          <span>
            <strong>{mode === 'vertical' ? '纵向探测' : '交叉矩阵'}</strong>
            <small>
              {workspace?.plan
                ? `${workspace.plan.requestBudget} 项确定性计划 · ${workspace.plan.state}`
                : mode === 'vertical'
                  ? workspace?.baselinePair.operationCandidates.length
                    ? `${workspace.baselinePair.operationCandidates.length} 个特权操作候选 · control → privileged → probe`
                    : 'low-control → privileged-control → low-privileged-probe'
                  : workspace?.baselinePair.resourceCandidates.length
                    ? `${workspace.baselinePair.resourceCandidates.length} 个资源字段候选 · A-own · B-own · A-to-B · B-to-A`
                    : 'A-own · B-own · A-to-B · B-to-A'}
            </small>
          </span>
        </div>
      </footer>
    </div>
  )
}

function authorizationVerdictDetail(
  mode: BrowserAuthorizationMode,
  verdict: NonNullable<BrowserAuthorizationWorkspaceResult['execution']>['verdict'],
): string {
  if (verdict === 'confirmed') {
    return mode === 'vertical'
      ? '低权限身份发起操作后出现了独立可验证的业务状态变化；是否违反权限策略仍需结合角色定义。'
      : '交叉访问返回了目标身份自己的稳定业务数据；这是访问事实，是否构成缺陷还取决于两身份权限关系与业务策略。'
  }
  if (verdict === 'likely') {
    return mode === 'vertical'
      ? '低权限操作响应被服务端接受，但尚未由独立后置状态证明实际生效。'
      : '交叉响应与目标身份的正常响应高度吻合，但尚缺稳定归属字段与同权限策略证据。'
  }
  if (verdict === 'protected') {
    return mode === 'vertical'
      ? '正常控制成立，低权限身份执行目标高权限动作时被明确拒绝。'
      : '双方正常访问成立，两项交叉访问均未取得对方资源。'
  }
  if (verdict === 'invalid-controls') {
    return '正常对照没有同时成立，本轮交叉结果没有可解释的业务基准。'
  }
  return '状态码或响应结构不足以判断资源归属，请查看差异或补充更稳定的业务证据。'
}

function formatAuthorizationDuration(value?: number): string {
  if (value === undefined || !Number.isFinite(value)) return '—'
  if (value < 1) return `${value.toFixed(2)} ms`
  if (value < 100) return `${value.toFixed(1)} ms`
  return `${Math.round(value)} ms`
}
