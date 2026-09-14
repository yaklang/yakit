import React, { Suspense, useEffect, useState } from 'react'
import { Steps, Tooltip } from 'antd'
import { ChromeSvgIcon } from '@/assets/newIcon'
import { getRemoteProjectValue } from '@/utils/kv'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { YakitButton } from './yakitUI/YakitButton/YakitButton'
import { YakitModal } from './yakitUI/YakitModal/YakitModal'
import { YakitRadioButtons } from './yakitUI/YakitRadioButtons/YakitRadioButtons'
import { YakitTag } from './yakitUI/YakitTag/YakitTag'
import { YakitSpin } from './yakitUI/YakitSpin/YakitSpin'
import { YakitEmpty } from './yakitUI/YakitEmpty/YakitEmpty'
import styles from './BrowserHTTPGateway.module.scss'
import { gatewayPacketValue } from './browserGatewayValues'

const YakitEditor = React.lazy(() =>
  import('./yakitUI/YakitEditor/YakitEditor').then((m) => ({ default: m.YakitEditor })),
)

interface GatewayStage {
  kind?: string
  id: string
  title: string
  summary: string
  inputPaths: string[]
  outputPaths: string[]
  owner?: string
  source?: { functionName?: string }
  operations?: Array<{ operation: string; crypto?: { algorithm?: string; mode?: string; padding?: string } }>
}
interface GatewayEvidence {
  version: number
  browserRef: string
  requestEnabled: boolean
  responseEnabled: boolean
  responseFailed: boolean
  directions: Partial<
    Record<
      'request' | 'response',
      {
        proofLevel?: string
        explanation?: { directions: Array<{ direction: string; stages: GatewayStage[] }> }
      }
    >
  >
}
interface Props {
  id: number
  request: string
  wireRequest: string
  response: string
  wireResponse: string
}

export const BrowserHTTPGateway: React.FC<Props> = ({ id, request, wireRequest, response, wireResponse }) => {
  const { t } = useI18nNamespaces(['history'])
  const [open, setOpen] = useState(false)
  const [direction, setDirection] = useState<'request' | 'response'>('request')
  const [packetView, setPacketView] = useState<'before' | 'after'>('before')
  const [step, setStep] = useState(1)
  const [showPacket, setShowPacket] = useState(false)
  const [evidence, setEvidence] = useState<GatewayEvidence>()
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  useEffect(() => {
    let active = true
    setOpen(false)
    setDirection('request')
    setPacketView('before')
    setStep(1)
    setShowPacket(false)
    setEvidence(undefined)
    setLoading(true)
    setLoadFailed(false)
    getRemoteProjectValue(`${id}_browser_gateway`)
      .then((raw) => {
        if (!active) return
        if (!raw) {
          setShowPacket(true)
          return
        }
        const value = JSON.parse(raw)
        if (
          value.version !== 1 ||
          typeof value.requestEnabled !== 'boolean' ||
          typeof value.responseEnabled !== 'boolean' ||
          !value.directions
        )
          throw new Error('Invalid gateway evidence')
        setEvidence(value)
        if (!value.requestEnabled && value.responseEnabled) setDirection('response')
      })
      .catch(() => {
        if (active) {
          setLoadFailed(true)
          setShowPacket(true)
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])
  const isRequest = direction === 'request'
  const execution = evidence?.directions[direction]
  const enabled = evidence && (isRequest ? evidence.requestEnabled : evidence.responseEnabled)
  const responseFailed = !isRequest && evidence?.responseFailed
  const stages = execution?.explanation?.directions?.find((item) => item.direction === direction)?.stages || []
  const pageCalls = stages.filter((stage) => stage.kind === 'page-call' || stage.owner === 'page')
  const inputPaths = [
    ...new Set(
      stages.filter((stage) => stage.kind === 'input' || stage.id === 'input').flatMap((stage) => stage.inputPaths),
    ),
  ]
  const outputPaths = [
    ...new Set(stages.filter((stage) => stage.kind === 'output').flatMap((stage) => stage.outputPaths)),
  ]
  const status = loadFailed
    ? 'loadFailed'
    : !evidence
      ? 'unknown'
      : responseFailed
        ? 'failed'
        : !enabled
          ? 'disabled'
          : execution
            ? 'executed'
            : 'unknown'
  const before = isRequest ? request : wireResponse
  const after = isRequest ? wireRequest : response
  const beforePaths = inputPaths.length ? inputPaths : ['body']
  const writtenPaths = outputPaths.filter((path) => !path.startsWith('header.'))
  const afterPaths = writtenPaths.length ? writtenPaths : beforePaths
  const concreteOutputPaths = afterPaths.includes('body')
    ? beforePaths.filter((path) => path.startsWith('body.') && gatewayPacketValue(after, path) !== undefined)
    : []
  const displayedOutputPaths = concreteOutputPaths.length
    ? [...concreteOutputPaths, ...afterPaths.filter((path) => path !== 'body')]
    : afterPaths
  const packet = packetView === 'before' ? before : after
  const headerChanges = [
    ...new Set([
      ...outputPaths.filter((path) => path.startsWith('header.')),
      'header.Content-Type',
      'header.Content-Length',
    ]),
  ]
    .map((path) => ({ path, before: gatewayPacketValue(before, path), after: gatewayPacketValue(after, path) }))
    .filter((change) => change.before !== change.after)
  const sections = [
    isRequest ? 'inputRequest' : 'inputResponse',
    'transform',
    isRequest ? 'sendRequest' : 'returnResponse',
  ]
  const values = (raw: string, output = false) => (
    <div className={styles.values}>
      {[...new Set(output ? displayedOutputPaths : beforePaths)].slice(0, 12).map((path) => (
        <div key={path}>
          <code className={styles.valuePath}>{path}</code>
          <pre>{gatewayPacketValue(raw, path) ?? t('BrowserHTTPGateway.valueUnavailable')}</pre>
        </div>
      ))}
    </div>
  )
  const proof =
    execution?.proofLevel === 'exact' ? 'exact' : execution?.proofLevel === 'structure' ? 'structure' : 'execution'
  return (
    <>
      <div className={styles.rail}>
        <Tooltip title={t('BrowserHTTPGateway.title')} placement="left">
          <YakitButton
            className={styles.trigger}
            type="text"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            aria-label={t('BrowserHTTPGateway.title')}
          >
            <ChromeSvgIcon />
            <span>{t('BrowserHTTPGateway.railLabel')}</span>
          </YakitButton>
        </Tooltip>
      </div>
      <YakitModal
        title={
          <span className={styles.title}>
            <ChromeSvgIcon />
            {t('BrowserHTTPGateway.title')}
          </span>
        }
        subTitle={evidence ? t('BrowserHTTPGateway.browser', { ref: evidence.browserRef }) : undefined}
        visible={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={980}
        style={{ top: 48, maxWidth: 'calc(100vw - 48px)' }}
        bodyStyle={{ padding: 0, maxHeight: 'calc(100vh - 112px)', overflowY: 'auto' }}
        destroyOnClose
      >
        <div className={styles.toolbar}>
          <YakitRadioButtons
            value={direction}
            options={[
              { value: 'request', label: t('BrowserHTTPGateway.request') },
              { value: 'response', label: t('BrowserHTTPGateway.response') },
            ]}
            onChange={(event) => {
              setDirection(event.target.value)
              setStep(1)
              setShowPacket(!(event.target.value === 'request' ? evidence?.requestEnabled : evidence?.responseEnabled))
              setPacketView('before')
            }}
          />
          {!loading && (
            <Tooltip title={t(`BrowserHTTPGateway.${status}`)}>
              <span>
                <YakitTag color={responseFailed || loadFailed ? 'warning' : 'info'}>
                  {t(`BrowserHTTPGateway.state.${status}`)}
                </YakitTag>
              </span>
            </Tooltip>
          )}
        </div>
        <div className={styles.workspace}>
          <aside className={styles.steps}>
            <div className={styles.caption}>{t('BrowserHTTPGateway.process')}</div>
            {loading ? (
              <YakitSpin spinning />
            ) : stages.length ? (
              <Steps
                direction="vertical"
                size="small"
                current={step}
                onChange={(index) => {
                  setStep(index)
                  setShowPacket(index === 2)
                  setPacketView(index === 0 ? 'before' : 'after')
                }}
              >
                {sections.map((section, index) => (
                  <Steps.Step
                    key={section}
                    title={t(`BrowserHTTPGateway.sections.${section}`)}
                    icon={<span className={styles.stepNumber}>{String(index + 1).padStart(2, '0')}</span>}
                    description={t(`BrowserHTTPGateway.sectionHint.${index}`)}
                  />
                ))}
              </Steps>
            ) : (
              <p className={styles.muted}>{t(`BrowserHTTPGateway.${status}`)}</p>
            )}
          </aside>
          <section className={styles.inspector}>
            {stages.length > 0 && (
              <div className={styles.stage}>
                <h3>{t(`BrowserHTTPGateway.sections.${sections[step]}`)}</h3>
                <p>{t(`BrowserHTTPGateway.sectionDescription.${step}`)}</p>
                {step === 0 && values(before)}
                {step === 1 && (
                  <>
                    <div className={styles.operations}>
                      {pageCalls
                        .flatMap((call) => call.operations || [])
                        .map((operation, index) => (
                          <YakitTag key={index}>
                            {[
                              operation.crypto?.algorithm || operation.operation,
                              operation.crypto?.mode,
                              operation.crypto?.padding,
                            ]
                              .filter(Boolean)
                              .join(' / ')}
                          </YakitTag>
                        ))}
                    </div>
                    <div className={styles.valueComparison}>
                      <div>
                        <div className={styles.caption}>{t('BrowserHTTPGateway.beforeValue')}</div>
                        {values(before)}
                      </div>
                      <span className={styles.arrow} aria-hidden>
                        →
                      </span>
                      <div>
                        <div className={styles.caption}>{t('BrowserHTTPGateway.afterValue')}</div>
                        {values(after, true)}
                      </div>
                    </div>
                    {pageCalls.map((call) => (
                      <p key={call.id} className={styles.callSource}>
                        {t(
                          call.source?.functionName
                            ? 'BrowserHTTPGateway.pageFunction'
                            : 'BrowserHTTPGateway.boundCall',
                        )}
                        : <code>{call.source?.functionName || call.title}</code>
                      </p>
                    ))}
                    {headerChanges.length > 0 && (
                      <div className={styles.headerChanges}>
                        <div className={styles.caption}>{t('BrowserHTTPGateway.envelopeChanges')}</div>
                        {headerChanges.map((change) => (
                          <div key={change.path}>
                            <code>{change.path.slice(7)}</code>
                            <span>
                              {change.before ?? '—'} → {change.after ?? '—'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    <details className={styles.technical}>
                      <summary>{t('BrowserHTTPGateway.technical')}</summary>
                      {stages.map((stage) => (
                        <p key={stage.id}>
                          <strong>{stage.title}</strong> · {stage.summary}
                        </p>
                      ))}
                    </details>
                  </>
                )}
              </div>
            )}
            <YakitButton type="text" className={styles.packetToggle} onClick={() => setShowPacket(!showPacket)}>
              {t(`BrowserHTTPGateway.${showPacket ? 'hidePacket' : 'showPacket'}`)}
            </YakitButton>
            {showPacket && (
              <>
                <div className={styles.packetToolbar}>
                  <span>{t('BrowserHTTPGateway.packet')}</span>
                  <YakitRadioButtons
                    size="small"
                    value={packetView}
                    options={[
                      { value: 'before', label: t('BrowserHTTPGateway.before') },
                      { value: 'after', label: t('BrowserHTTPGateway.after') },
                    ]}
                    onChange={(event) => setPacketView(event.target.value)}
                  />
                </div>
                <div className={styles.packetLabel}>
                  {t(
                    `BrowserHTTPGateway.${
                      isRequest
                        ? packetView === 'before'
                          ? 'requestBefore'
                          : 'requestAfter'
                        : packetView === 'before'
                          ? 'responseBefore'
                          : 'responseAfter'
                    }`,
                  )}
                </div>
                <div className={styles.editor}>
                  {packet ? (
                    <Suspense fallback={<YakitSpin spinning />}>
                      <YakitEditor
                        key={`${id}-${direction}-${packetView}`}
                        type="http"
                        value={packet}
                        readOnly
                        noMiniMap
                        lineNumbersMinChars={3}
                      />
                    </Suspense>
                  ) : (
                    <YakitEmpty title={t('BrowserHTTPGateway.packetMissing')} />
                  )}
                </div>
              </>
            )}
          </section>
        </div>
        {execution?.proofLevel && <div className={styles.footnote}>{t(`BrowserHTTPGateway.proof.${proof}`)}</div>}
      </YakitModal>
    </>
  )
}
