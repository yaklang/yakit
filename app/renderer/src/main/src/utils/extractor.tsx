import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import type { FuzzerResponse } from '@/pages/fuzzer/HTTPFuzzerPage'
import { StringToUint8Array, Uint8ArrayToString } from '@/utils/str'
import { useDebounceEffect, useGetState, useMap } from 'ahooks'
import { type editor } from 'monaco-editor'
import { Space } from 'antd'
import { AutoCard } from '@/components/AutoCard'
import { failed, info, yakitFailed } from '@/utils/notification'
import { ResizeBox } from '@/components/ResizeBox'
import { saveABSFileToOpen } from '@/utils/openWebsite'
import { YakitRadioButtons } from '@/components/yakitUI/YakitRadioButtons/YakitRadioButtons'
import { YakitTag } from '@/components/yakitUI/YakitTag/YakitTag'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { RegexpInput } from '@/pages/mitm/MITMRule/MITMRuleFromModal'
import styles from './extractor.module.scss'
import { YakitPopconfirm } from '@/components/yakitUI/YakitPopconfirm/YakitPopconfirm'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { YakitEditor } from '@/components/yakitUI/YakitEditor/YakitEditor'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { ipc } from '@/services/ipc'

export interface WebFuzzerResponseExtractorProp {
  responses: FuzzerResponse[]
  sendPayloadsType: string
}

export const WebFuzzerResponseExtractor: React.FC<WebFuzzerResponseExtractorProp> = (props) => {
  const { responses, sendPayloadsType } = props
  const { t, i18n } = useI18nNamespaces(['webFuzzer', 'yakitUi'])
  const sampleResponse = responses[0]
  const [editor, setEditor] = useGetState<editor.IStandaloneCodeEditor>()
  const [selected, setSelected] = useGetState<string>('')
  const [_responseStr, setResponseStr, getResponseStr] = useGetState<string>('')
  const [mode, setMode] = useState<'regexp' | 'regexp-between'>('regexp-between')

  const [loading, setLoading] = useState<boolean>(false)

  // 用户匹配数据前后缀提取正则
  const [prefix, setPrefix] = useState('')
  const [suffix, setSuffix] = useState('')

  // 用户选择的数据转换成的正则
  const [matchedRegexp, setMatchedRegexp] = useState<string>('')

  // 存放提取出来的数据
  const [extracted, setExtracted] = useState<string[]>([])

  const activeExtraction = useRef<{ controller: AbortController; timer: ReturnType<typeof setInterval> }>()

  useEffect(() => {
    if (!editor) {
      return
    }
    const model = editor.getModel()
    if (!model) {
      return
    }

    const setSelectedFunc = () => {
      try {
        const selection = editor.getSelection()
        if (!selection) {
          return
        }

        setResponseStr(model.getValue())
        // 这里能获取到选择到的内容
        setSelected(model.getValueInRange(selection))
      } catch (e) {
        console.info('提取选择数据错误')
        console.info(e)
      }
    }
    setSelectedFunc()
    const id = setInterval(setSelectedFunc, 500)
    return () => {
      clearInterval(id)
    }
  }, [editor])

  useDebounceEffect(
    () => {
      if (!selected) {
        setPrefix('')
        setSuffix('')
        return
      }

      ipc
        .invoke('grpc', 'GenerateExtractRule', {
          Data: StringToUint8Array(getResponseStr()),
          Selected: StringToUint8Array(selected),
        })
        .then((e: { PrefixRegexp: string; SuffixRegexp: string; SelectedRegexp: string }) => {
          setPrefix(e.PrefixRegexp)
          setSuffix(e.SuffixRegexp)
          setMatchedRegexp(e.SelectedRegexp)
        })
        .catch((e) => {
          failed(`${t('WebFuzzerResponseExtractor.cannotGenerateExtractionRule')}${e}`)
        })
    },
    [selected],
    { wait: 500 },
  )
  const [extractedMap, { setAll }] = useMap<string, string>()
  useEffect(
    () => () => {
      const active = activeExtraction.current
      active?.controller.abort()
      clearInterval(active?.timer)
    },
    [],
  )

  const startExtraction = () => {
    activeExtraction.current?.controller.abort()
    clearInterval(activeExtraction.current?.timer)
    const controller = new AbortController()
    const extractedCache: string[] = []
    const resultMap = new Map<string, string>()
    let countLastUpdated = 0
    let finished = false
    setExtracted([])
    setAll(new Map())
    setLoading(true)
    const flush = () => {
      if (controller.signal.aborted || extractedCache.length === countLastUpdated) return
      setExtracted([...extractedCache])
      countLastUpdated = extractedCache.length
    }
    const active = { controller, timer: setInterval(flush, 500) }
    activeExtraction.current = active
    const finish = () => {
      if (finished || controller.signal.aborted) return false
      finished = true
      clearInterval(active.timer)
      flush()
      setAll(resultMap)
      setLoading(false)
      if (activeExtraction.current === active) activeExtraction.current = undefined
      return true
    }
    const onError = (error: Error) => {
      if (finish()) failed(`[ExtractData] error: ${error.message}`)
    }
    const run = async () => {
      const requestFor = (response: FuzzerResponse) => ({
        Mode: mode,
        PrefixRegexp: prefix,
        SuffixRegexp: suffix,
        MatchRegexp: matchedRegexp,
        Data: response.ResponseRaw,
        Token: response.UUID,
      })
      const task = await ipc.openStream(
        'grpc',
        'ExtractData',
        responses.length ? requestFor(responses[0]) : { End: true },
        {
          signal: controller.signal,
          onData(data) {
            const text = Uint8ArrayToString(data.Extracted)
            const item = resultMap.get(data.Token)
            resultMap.set(data.Token, item ? `${item},${text}` : text)
            extractedCache.push(text)
          },
          onError,
          onEnd() {
            if (finish()) info('[ExtractData] finished')
          },
        },
      )
      for (const response of responses.slice(1)) {
        if (controller.signal.aborted || finished) return
        await task.write(requestFor(response))
      }
      if (responses.length && !controller.signal.aborted && !finished) await task.write({ End: true })
    }
    void run().catch((error: Error) => {
      onError(error)
      controller.abort()
    })
  }

  return (
    <Space style={{ width: '100%', padding: 24 }} direction={'vertical'}>
      <YakitSpin spinning={loading}>
        <AutoCard
          size={'small'}
          title={
            <Space>
              <div>{t('WebFuzzerResponseExtractor.autoGenerateExtractionRule')}</div>
              <YakitRadioButtons
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                size="small"
                options={[
                  {
                    label: t('WebFuzzerResponseExtractor.regexExtractWithPrefixSuffix'),
                    value: 'regexp-between',
                  },
                  {
                    label: t('WebFuzzerResponseExtractor.singleRegexExtract'),
                    value: 'regexp',
                  },
                ]}
                buttonStyle="solid"
              />
            </Space>
          }
          extra={
            <Space>
              <YakitTag>{t('WebFuzzerResponseExtractor.responseCount', { responses: responses.length })}</YakitTag>
              <YakitButton type={'primary'} size={'small'} onClick={startExtraction}>
                {t('WebFuzzerResponseExtractor.extractData')}
              </YakitButton>
            </Space>
          }
        >
          {mode === 'regexp-between' && (
            <Space direction={'vertical'} style={{ width: '100%', justifyContent: 'center' }}>
              <div className={styles['space-item']}>
                <span>{t('WebFuzzerResponseExtractor.prefixRegex')}</span>
                <div style={{ flex: 1, maxWidth: '90%' }}>
                  <RegexpInput initialTagShow={true} regexp={prefix} onSure={setPrefix} onSave={() => {}} />
                </div>
              </div>
              <div className={styles['space-item']}>
                <span>{t('WebFuzzerResponseExtractor.suffixRegex')}</span>
                <div style={{ flex: 1, maxWidth: '90%' }}>
                  <RegexpInput initialTagShow={true} regexp={suffix} onSure={setSuffix} onSave={() => {}} />
                </div>
              </div>
              <Space>
                {selected ? (
                  <YakitTag copyText={selected} enableCopy={true} iconColor="var(--Colors-Use-Main-Primary)" />
                ) : (
                  <YakitTag>{t('WebFuzzerResponseExtractor.noExtractionRuleSelected')}</YakitTag>
                )}
              </Space>
            </Space>
          )}
          {mode === 'regexp' && (
            <Space direction={'vertical'} style={{ width: '100%' }}>
              <div className={styles['space-item']}>
                <span>{t('WebFuzzerResponseExtractor.autoExtractRegex')}</span>
                <div style={{ flex: 1, maxWidth: '90%' }}>
                  <RegexpInput
                    initialTagShow={true}
                    regexp={matchedRegexp}
                    onSure={setMatchedRegexp}
                    onSave={() => {}}
                  />
                </div>
              </div>
            </Space>
          )}
        </AutoCard>
        <div style={{ height: 400 }}>
          <ResizeBox
            firstNode={
              <YakitEditor
                editorDidMount={(e) => {
                  setEditor(e)
                }}
                readOnly={true}
                noMiniMap={true}
                noLineNumber={true}
                type={'html'}
                value={Uint8ArrayToString(sampleResponse.ResponseRaw)}
              />
            }
            secondRatio={'30%'}
            secondNode={
              <AutoCard
                size={'small'}
                bordered={false}
                title={
                  <Space>
                    <YakitTag>
                      {t('WebFuzzerResponseExtractor.extractedTotal')}
                      {extracted.length}/{responses.length}
                    </YakitTag>
                  </Space>
                }
                extra={
                  <>
                    <YakitPopconfirm
                      title={t('WebFuzzerResponseExtractor.confirmClearExtractedData')}
                      onConfirm={() => {
                        activeExtraction.current?.controller.abort()
                        clearInterval(activeExtraction.current?.timer)
                        activeExtraction.current = undefined
                        setLoading(false)
                        setExtracted([])
                        setAll(new Map())
                      }}
                    >
                      <YakitButton size={'small'} type="outline1" colors="danger">
                        {t('YakitButton.clear')}
                      </YakitButton>
                    </YakitPopconfirm>
                    <YakitButton
                      size={'small'}
                      type="text"
                      onClick={() => {
                        saveABSFileToOpen('webfuzzer-extract-data.txt', extracted.join('\n'))
                      }}
                      style={{ marginLeft: 6 }}
                    >
                      {t('WebFuzzerResponseExtractor.downloadFile')}
                    </YakitButton>
                    {extractedMap.size > 0 && (
                      <YakitButton
                        size={'small'}
                        type="text"
                        onClick={() => {
                          ipc
                            .invoke('local', 'ForwardMainEvent', {
                              event: 'fetch-extracted-to-table',
                              data: {
                                type: sendPayloadsType,
                                extractedMap,
                              },
                            })
                            .then(() => {
                              info(t('WebFuzzerResponseExtractor.dataSentSuccessfully'))
                            })
                            .catch((err) => {
                              yakitFailed(t('WebFuzzerResponseExtractor.dataSendFailed') + err)
                            })
                        }}
                      >
                        {t('WebFuzzerResponseExtractor.displayInTable')}
                      </YakitButton>
                    )}
                  </>
                }
                bodyStyle={{ margin: 0, padding: 0 }}
              >
                <YakitEditor
                  readOnly={true}
                  noMiniMap={true}
                  noLineNumber={true}
                  type={'html'}
                  value={extracted.join('\n')}
                />
              </AutoCard>
            }
          />
        </div>
      </YakitSpin>
    </Space>
  )
}
