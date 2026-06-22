import React, { useMemo } from 'react'
import { useMemoizedFn, useUpdateEffect } from 'ahooks'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { YakitResizeBox } from '@/components/yakitUI/YakitResizeBox/YakitResizeBox'
import { NewHTTPPacketEditor } from '@/utils/editors'
import { newWebFuzzerTab } from '@/pages/fuzzer/HTTPFuzzerPage'
import { yakitFailed, yakitNotify } from '@/utils/notification'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { OpenAPIDocState } from './openapiDocType'
import { buildOpenAPIOperationRequest, getOpenAPIOperationDetail } from './openapiYakURL'
import { fuzzerResponseToRawResponse, sendOpenAPIHTTPRequest } from './sendOpenAPIRequest'
import { buildEffectiveParameterValues, getParameterDefaultValue, initParameterValues } from './openapiParameterDefault'
import { filterDisplayResponses, formatResponseStatusLabel } from './openapiDisplayUtils'
import styles from './OpenAPIDocPanel.module.scss'

const METHOD_COLORS: Record<string, string> = {
  GET: '#61affe',
  POST: '#49cc90',
  PUT: '#fca130',
  DELETE: '#f93e3e',
  PATCH: '#50e3c2',
  HEAD: '#9012fe',
  OPTIONS: '#0d5aa7',
}

function getMethodColor(method: string) {
  return METHOD_COLORS[method.toUpperCase()] || '#999'
}

interface OpenAPIDocRightPanelProps {
  state: OpenAPIDocState
  onUpdate: (patch: Partial<OpenAPIDocState>) => void
}

export const OpenAPIDocRightPanel: React.FC<OpenAPIDocRightPanelProps> = ({ state, onUpdate }) => {
  const { t } = useI18nNamespaces(['history'])
  const parameters = state.operationDetail?.parameters || []
  const displayResponses = useMemo(
    () => filterDisplayResponses(state.operationDetail?.responses),
    [state.operationDetail?.responses],
  )

  const buildOptions = useMemo(
    () => ({
      overrideDomain: state.overrideDomain || undefined,
      overrideIsHttps: state.overrideIsHttps,
      parameterValues: buildEffectiveParameterValues(parameters, state.parameterValues),
    }),
    [state.overrideDomain, state.overrideIsHttps, state.parameterValues, parameters],
  )

  const onPreviewRequest = useMemoizedFn(async () => {
    if (!state.docId || !state.selectedOperation) return
    try {
      onUpdate({ loading: true })
      const { request, isHttps } = await buildOpenAPIOperationRequest(
        state.docId,
        state.selectedOperation.method,
        state.selectedOperation.path,
        buildOptions,
      )
      if (!request) {
        throw new Error('empty request')
      }
      onUpdate({ requestRaw: request, isHttps, loading: false })
    } catch (e: any) {
      onUpdate({ loading: false })
      yakitFailed(`${t('HTTPHistory.openapiDoc.previewFailed')}: ${e}`)
    }
  })

  useUpdateEffect(() => {
    if (state.docId && state.selectedOperation && state.operationDetail) {
      onPreviewRequest()
    }
  }, [state.selectedOperation?.method, state.selectedOperation?.path, state.operationDetail])

  const onSendRequest = useMemoizedFn(async () => {
    if (!state.docId || !state.selectedOperation) return
    try {
      onUpdate({ sending: true })
      let request = state.requestRaw
      let isHttps = state.isHttps
      if (!request) {
        const built = await buildOpenAPIOperationRequest(
          state.docId,
          state.selectedOperation.method,
          state.selectedOperation.path,
          buildOptions,
        )
        request = built.request
        isHttps = built.isHttps
      }
      onUpdate({ requestRaw: request, isHttps })
      const response = await sendOpenAPIHTTPRequest(request, isHttps)
      onUpdate({
        responseRaw: fuzzerResponseToRawResponse(response),
        sending: false,
      })
      yakitNotify('success', t('HTTPHistory.openapiDoc.sendSuccess'))
    } catch (e: any) {
      onUpdate({ sending: false })
      yakitFailed(`${t('HTTPHistory.openapiDoc.sendFailed')}: ${e}`)
    }
  })

  const onSendToWebFuzzer = useMemoizedFn(async () => {
    if (!state.docId || !state.selectedOperation) return
    try {
      onUpdate({ loading: true })
      let request = state.requestRaw
      let isHttps = state.isHttps
      if (!request) {
        const built = await buildOpenAPIOperationRequest(
          state.docId,
          state.selectedOperation.method,
          state.selectedOperation.path,
          buildOptions,
        )
        request = built.request
        isHttps = built.isHttps
      }
      onUpdate({ requestRaw: request, isHttps, loading: false })
      await newWebFuzzerTab({ request, isHttps, openFlag: true })
    } catch (e: any) {
      onUpdate({ loading: false })
      yakitFailed(`${t('HTTPHistory.openapiDoc.sendToFuzzerFailed')}: ${e}`)
    }
  })

  const onParameterChange = useMemoizedFn((name: string, value: string) => {
    onUpdate({
      parameterValues: { ...state.parameterValues, [name]: value },
      requestRaw: '',
      responseRaw: '',
    })
  })

  const detail = state.operationDetail

  if (!state.docId) {
    return (
      <div className={styles['openapi-doc-right-empty']}>
        <YakitEmpty description={t('HTTPHistory.openapiDoc.rightEmptyHint')} />
      </div>
    )
  }

  return (
    <div className={styles['openapi-doc-right']}>
      <div className={styles['openapi-doc-right-toolbar']}>
        <div className={styles['openapi-doc-right-doc-info']}>
          <span className={styles['openapi-doc-right-doc-info-title']}>{state.docInfo?.title}</span>
          {state.docInfo?.version && (
            <span className={styles['openapi-doc-right-doc-info-meta']}>v{state.docInfo.version}</span>
          )}
          {state.docInfo?.specVersion && (
            <span className={styles['openapi-doc-right-doc-info-meta']}>{state.docInfo.specVersion}</span>
          )}
          <span className={styles['openapi-doc-right-doc-info-meta']}>{state.operations.length} APIs</span>
        </div>
        <div className={styles['openapi-doc-right-host']}>
          <span>{t('HTTPHistory.openapiDoc.baseHost')}</span>
          <YakitInput
            style={{ width: 220 }}
            value={state.overrideDomain}
            placeholder={state.docInfo?.domain}
            onChange={(e) =>
              onUpdate({
                overrideDomain: e.target.value,
                requestRaw: '',
                responseRaw: '',
              })
            }
          />
          <span>{t('HTTPHistory.openapiDoc.https')}</span>
          <YakitSwitch
            checked={state.overrideIsHttps}
            onChange={(checked) =>
              onUpdate({
                overrideIsHttps: checked,
                requestRaw: '',
                responseRaw: '',
              })
            }
          />
        </div>
      </div>

      {(state.parseWarnings.length > 0 || state.docInfo?.parseWarnings?.length) && (
        <div className={styles['openapi-doc-right-warnings']}>
          <div className={styles['openapi-doc-right-warnings-title']}>
            {t('HTTPHistory.openapiDoc.parseWarningsTitle')}
          </div>
          {(state.parseWarnings.length ? state.parseWarnings : state.docInfo?.parseWarnings || []).map(
            (warning, index) => (
              <div key={`${warning}-${index}`} className={styles['openapi-doc-right-warnings-item']}>
                {warning}
              </div>
            ),
          )}
        </div>
      )}

      <YakitSpin spinning={state.loading || state.sending} wrapperClassName={styles['openapi-doc-right-main']}>
        {!state.selectedOperation ? (
          <div className={styles['openapi-doc-right-empty']}>
            <YakitEmpty description={t('HTTPHistory.openapiDoc.selectOperationHint')} />
          </div>
        ) : (
          <>
            <div className={styles['openapi-doc-right-operation']}>
              <div className={styles['openapi-doc-right-operation-header']}>
                <span
                  className={styles['openapi-doc-right-operation-method']}
                  style={{ backgroundColor: getMethodColor(detail?.method || state.selectedOperation.method) }}
                >
                  {detail?.method || state.selectedOperation.method}
                </span>
                <span className={styles['openapi-doc-right-operation-path']}>
                  {detail?.path || state.selectedOperation.path}
                </span>
              </div>
              {(detail?.summary || detail?.description) && (
                <div className={styles['openapi-doc-right-operation-desc']}>
                  {detail?.summary || detail?.description}
                </div>
              )}

              {parameters.length > 0 && (
                <div className={styles['openapi-doc-right-params']}>
                  <div className={styles['openapi-doc-right-params-title']}>
                    {t('HTTPHistory.openapiDoc.parameters')}
                  </div>
                  {parameters.map((param) => (
                    <div key={`${param.in}-${param.name}`} className={styles['openapi-doc-right-params-row']}>
                      <span className={styles['openapi-doc-right-params-in']}>{param.in}</span>
                      <span className={styles['openapi-doc-right-params-name']}>
                        {param.name}
                        {param.required ? ' *' : ''}
                      </span>
                      <YakitInput
                        size="small"
                        placeholder={param.description || param.type || param.name}
                        value={
                          state.parameterValues[param.name] !== undefined
                            ? state.parameterValues[param.name]
                            : getParameterDefaultValue(param)
                        }
                        onChange={(e) => onParameterChange(param.name, e.target.value)}
                      />
                      <span className={styles['openapi-doc-right-params-in']}>{param.description}</span>
                    </div>
                  ))}
                </div>
              )}

              {displayResponses.length > 0 && (
                <div className={styles['openapi-doc-right-responses']}>
                  {displayResponses.map((resp) => (
                    <span key={resp.statusCode} className={styles['openapi-doc-right-responses-item']}>
                      <span className={styles['openapi-doc-right-responses-code']}>
                        {formatResponseStatusLabel(resp.statusCode, t)}
                      </span>
                      {resp.description}
                    </span>
                  ))}
                </div>
              )}

              <div className={styles['openapi-doc-right-actions']}>
                <YakitButton onClick={onPreviewRequest}>{t('HTTPHistory.openapiDoc.previewRequest')}</YakitButton>
                <YakitButton type="primary" onClick={onSendRequest} loading={state.sending}>
                  {t('HTTPHistory.openapiDoc.send')}
                </YakitButton>
                <YakitButton type="primary" onClick={onSendToWebFuzzer}>
                  {t('HTTPHistory.openapiDoc.sendToWebFuzzer')}
                </YakitButton>
              </div>
            </div>

            <div className={styles['openapi-doc-right-editors']}>
              <YakitResizeBox
                isVer={false}
                firstRatio="50%"
                secondRatio="50%"
                firstMinSize={200}
                secondMinSize={200}
                firstNode={() => (
                  <div className={styles['openapi-doc-right-editor-pane']}>
                    <div className={styles['openapi-doc-right-editor-pane-title']}>Request</div>
                    <div className={styles['openapi-doc-right-editor-pane-body']}>
                      <NewHTTPPacketEditor
                        originValue={state.requestRaw}
                        refreshTrigger={state.requestRaw}
                        onChange={(value) => onUpdate({ requestRaw: value })}
                        noHeader={true}
                        noMinimap={true}
                      />
                    </div>
                  </div>
                )}
                secondNode={() => (
                  <div className={styles['openapi-doc-right-editor-pane']}>
                    <div className={styles['openapi-doc-right-editor-pane-title']}>Response</div>
                    <div className={styles['openapi-doc-right-editor-pane-body']}>
                      <NewHTTPPacketEditor
                        originValue={state.responseRaw}
                        refreshTrigger={state.responseRaw}
                        readOnly={true}
                        noHeader={true}
                        noMinimap={true}
                      />
                    </div>
                  </div>
                )}
              />
            </div>
          </>
        )}
      </YakitSpin>
    </div>
  )
}

export async function loadOpenAPIOperationSelection(
  docId: string,
  method: string,
  path: string,
): Promise<Partial<OpenAPIDocState>> {
  const detail = await getOpenAPIOperationDetail(docId, method, path)
  return {
    operationDetail: detail,
    parameterValues: initParameterValues(detail.parameters),
    requestRaw: '',
    responseRaw: '',
  }
}
