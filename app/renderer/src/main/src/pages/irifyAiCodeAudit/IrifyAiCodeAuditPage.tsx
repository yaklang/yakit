import React, { useEffect, useRef, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import emiter from '@/utils/eventBus/eventBus'
import { AuditCodePageInfoProps } from '@/store/pageInfo'
import { IrifyAiCodeAuditStyle, resolveIrifyFocusModeLoop, isIrifyAuditStyleConfirmed } from './irifyAiCodeAuditStyle'
import { HistoryAIReActChatProvider } from '@/components/historyAIReActChat'
import { AIInputEvent, AISourceEnum } from '@/pages/ai-re-act/hooks/grpcApi'
import { YakitRoute } from '@/enums/yakitRoute'
import { IrifyAiCodeAuditSidePanelLayout } from './IrifyAiCodeAuditSidePanelLayout'
import {
  appendIrifyWorkbenchAttachments,
  IrifyWorkbenchAiAttachProvider,
  IrifyWorkbenchAiAttachRef,
  useIrifyWorkbenchAiAttachRef,
} from './IrifyWorkbenchAiAttachContext'
import styles from './IrifyAiCodeAuditPage.module.scss'
import { YakRunnerIrifyAiCodeAudit } from './YakRunnerIrifyAiCodeAudit'
import { IrifyAiCodeAuditOnboardingMask } from './IrifyAiCodeAuditOnboardingMask'
import { emitIrifyAiCodeAuditOpenFileTree, IrifyAiCodeAuditOnboardingRequest } from './utils'

const resolveAuditStyle = (info?: AuditCodePageInfoProps): IrifyAiCodeAuditStyle => {
  if (info?.auditStyle === 'skill') return 'skill'
  if (info?.auditStyle === 'code') return 'code'
  return 'unset'
}

export interface IrifyAiCodeAuditPageProps {
  auditCodePageInfo?: AuditCodePageInfoProps
}

const IrifyAiCodeAuditPageInner: React.FC<IrifyAiCodeAuditPageProps> = ({ auditCodePageInfo }) => {
  const attachRef = useIrifyWorkbenchAiAttachRef()

  const [entryAuditStyle, setEntryAuditStyle] = useState<IrifyAiCodeAuditStyle>(() =>
    resolveAuditStyle(auditCodePageInfo),
  )
  const [auditStyle, setAuditStyle] = useState<IrifyAiCodeAuditStyle>(() => resolveAuditStyle(auditCodePageInfo))
  const [onboardingVisible, setOnboardingVisible] = useState(() => !!auditCodePageInfo?.auditStyle)
  const [onboardingSelectedPath, setOnboardingSelectedPath] = useState(() => auditCodePageInfo?.Location?.trim() ?? '')
  const [onboardingSkipStyleStep, setOnboardingSkipStyleStep] = useState(
    () => auditCodePageInfo?.auditStyle !== undefined,
  )
  const [started, setStarted] = useState(false)

  const openOnboarding = useMemoizedFn(
    (opts: { style?: IrifyAiCodeAuditStyle; path?: string; skipStyle?: boolean } = {}) => {
      if (opts.style && opts.style !== 'unset') {
        setEntryAuditStyle(opts.style)
        setAuditStyle(opts.style)
      } else {
        setEntryAuditStyle('unset')
        setAuditStyle('unset')
      }
      setOnboardingSkipStyleStep(opts.skipStyle ?? (!!opts.style && opts.style !== 'unset'))
      setOnboardingSelectedPath(opts.path?.trim() ?? '')
      setStarted(false)
      setOnboardingVisible(true)
    },
  )

  useEffect(() => {
    const onProjectChanged = () => setStarted(false)
    emiter.on('onIrifyAiCodeAuditProjectChanged', onProjectChanged)
    return () => emiter.off('onIrifyAiCodeAuditProjectChanged', onProjectChanged)
  }, [])

  const applyPageEntry = useMemoizedFn((info?: AuditCodePageInfoProps) => {
    const root = info?.Location?.trim()
    if (root) emitIrifyAiCodeAuditOpenFileTree(root)
    if (info?.auditStyle !== undefined) {
      openOnboarding({ style: resolveAuditStyle(info), path: root, skipStyle: true })
    }
  })

  useEffect(() => {
    applyPageEntry(auditCodePageInfo)
  }, [auditCodePageInfo?.Location, auditCodePageInfo?.auditStyle, applyPageEntry])

  useEffect(() => {
    const handler = (raw: string) => {
      try {
        applyPageEntry(JSON.parse(raw) as AuditCodePageInfoProps)
      } catch {
        // ignore
      }
    }
    emiter.on('onAuditCodePageInfo', handler)
    return () => emiter.off('onAuditCodePageInfo', handler)
  }, [applyPageEntry])

  useEffect(() => {
    const handler = (raw: string) => {
      try {
        const req: IrifyAiCodeAuditOnboardingRequest = JSON.parse(raw)
        openOnboarding({ style: req.auditStyle, path: req.path, skipStyle: !!req.auditStyle })
      } catch {
        // ignore
      }
    }
    emiter.on('onIrifyAiCodeAuditShowOnboarding', handler)
    return () => emiter.off('onIrifyAiCodeAuditShowOnboarding', handler)
  }, [openOnboarding])

  const handleAuditStyleChange = useMemoizedFn((style: IrifyAiCodeAuditStyle) => {
    if (started) return
    setAuditStyle(style)
  })

  const handleOnboardingStart = useMemoizedFn((style: IrifyAiCodeAuditStyle) => {
    if (!isIrifyAuditStyleConfirmed(style)) return
    setAuditStyle(style)
    setStarted(true)
  })

  const handleOnboardingOpenOnly = useMemoizedFn((style: IrifyAiCodeAuditStyle) => {
    if (!isIrifyAuditStyleConfirmed(style)) return
    setAuditStyle(style)
  })

  const handleOnboardingClose = useMemoizedFn(() => {
    setOnboardingVisible(false)
    setOnboardingSelectedPath('')
    setOnboardingSkipStyleStep(false)
  })

  const handleEnsureProjectRoot = useMemoizedFn((absPath: string) => {
    if (attachRef?.current) attachRef.current.projectRootAbsPath = absPath
  })

  const transformInputEvent = useMemoizedFn((event: AIInputEvent) =>
    appendIrifyWorkbenchAttachments(event, attachRef?.current ?? undefined),
  )

  return (
    <HistoryAIReActChatProvider
      source={AISourceEnum.irify}
      route={YakitRoute.Irify_AI_Code_Audit}
      pageId={YakitRoute.Irify_AI_Code_Audit}
      focusModeLoop={resolveIrifyFocusModeLoop(auditStyle)}
      transformInputEvent={transformInputEvent}
    >
      <IrifyAiCodeAuditSidePanelLayout
        placement="right"
        rootClassName={styles.pageRoot}
        auditStyle={auditStyle}
        auditStyleLocked={started}
        onAuditStyleChange={handleAuditStyleChange}
      >
        <YakRunnerIrifyAiCodeAudit />
      </IrifyAiCodeAuditSidePanelLayout>
      <IrifyAiCodeAuditOnboardingMask
        visible={onboardingVisible}
        defaultAuditStyle={entryAuditStyle}
        defaultSelectedPath={onboardingSelectedPath}
        skipStyleStep={onboardingSkipStyleStep}
        auditStyle={auditStyle}
        onAuditStyleChange={handleAuditStyleChange}
        onClose={handleOnboardingClose}
        onStart={handleOnboardingStart}
        onOpenOnly={handleOnboardingOpenOnly}
        onEnsureProjectRoot={handleEnsureProjectRoot}
      />
    </HistoryAIReActChatProvider>
  )
}

const IrifyAiCodeAuditPageShell: React.FC<IrifyAiCodeAuditPageProps> = ({ auditCodePageInfo }) => {
  const attachRef = useRef<IrifyWorkbenchAiAttachRef>({})
  return (
    <IrifyWorkbenchAiAttachProvider attachRef={attachRef}>
      <IrifyAiCodeAuditPageInner auditCodePageInfo={auditCodePageInfo} />
    </IrifyWorkbenchAiAttachProvider>
  )
}

export const IrifyAiCodeAuditPage: React.FC<IrifyAiCodeAuditPageProps> = ({ auditCodePageInfo }) => (
  <IrifyAiCodeAuditPageShell auditCodePageInfo={auditCodePageInfo} />
)
