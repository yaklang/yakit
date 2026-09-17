import type React from 'react'
import { useEffect, useState } from 'react'
import { failed, info } from './notification'
import { Form, Space } from 'antd'
import { AutoCard } from '../components/AutoCard'
import { useGetState } from 'ahooks'
import { openABSFileLocated } from './openWebsite'
import { YakitSwitch } from '@/components/yakitUI/YakitSwitch/YakitSwitch'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { showYakitModal } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import { YakitCheckbox } from '@/components/yakitUI/YakitCheckbox/YakitCheckbox'
import { FuzzerRemoteGV } from '@/enums/fuzzer'
import { getRemoteValue, setRemoteValue } from './kv'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import i18n from '@/i18n/i18n'
import { ipc } from '@/services/ipc'
import { getReleaseEditionName } from './envfile'
const tOriginal = i18n.getFixedT(null, ['utils'])

export interface ExtractableValue {
  StringValue?: string
  BytesValue?: Uint8Array
}

export interface ExtractableData {
  [key: string]: ExtractableValue
}

export interface GeneralExporterProp extends basicConfig {
  Data: ExtractableData[]
  onFinish: () => void
}

interface basicConfig {
  JsonOutput: boolean
  CSVOutput: boolean
  DirName: string
  FilePattern: string
}

const GeneralExporter: React.FC<GeneralExporterProp> = (props) => {
  const { t, i18n } = useI18nNamespaces(['webFuzzer'])
  const [paths, setPaths, getPaths] = useGetState<string[]>([])

  useEffect(() => {
    const controller = new AbortController()
    const { JsonOutput, CSVOutput, DirName, FilePattern } = props
    let errorReported = false
    const reportError = (error: Error) => {
      if (controller.signal.aborted || errorReported) return
      errorReported = true
      failed(error.message)
    }
    const run = async () => {
      const task = await ipc.openStream(
        'grpc',
        'ExtractDataToFile',
        {
          JsonOutput,
          CSVOutput,
          DirName,
          FileNamePattern: FilePattern,
        },
        {
          signal: controller.signal,
          onData(data) {
            setPaths([...getPaths(), data.FilePath])
          },
          onEnd() {
            info(t('GeneralExporter.exportFinished'))
            props.onFinish()
          },
          onError: reportError,
        },
      )
      info(t('GeneralExporter.sendGeneratedFileConfigSuccess'))
      for (const value of props.Data) {
        if (controller.signal.aborted) return
        await task.write({ Data: value })
      }
      if (!controller.signal.aborted) await task.write({ Finished: true })
    }
    void run().catch((error: Error) => {
      reportError(error)
      controller.abort()
    })
    return () => controller.abort()
  }, [])

  return (
    <AutoCard title={t('GeneralExporter.getGeneratedFileClickToOpen')}>
      <Space direction={'vertical'}>
        {paths.map((i) => {
          return (
            <YakitButton
              type="text"
              onClick={() => {
                openABSFileLocated(i)
              }}
            >
              {i}
            </YakitButton>
          )
        })}
      </Space>
    </AutoCard>
  )
}

export type ExportDataType = 'all' | 'payload' | 'extracted'
export const exportData = (data: ExtractableData[], exportType: ExportDataType = 'all') => {
  const m = showYakitModal({
    title: (modalT) => modalT('Exporter.exportData'),
    width: 700,
    footer: null,
    content: (
      <>
        <GeneralExporterForm
          Data={data}
          exportType={exportType}
          destroyModal={() => {
            m.destroy()
          }}
        />
      </>
    ),
  })
}

interface ExportColumns {
  dataKey: string
  title: string
  isChecked: boolean
  disabled: boolean
}
interface GeneralExporterFormProp {
  Config?: basicConfig
  Data: ExtractableData[]
  exportType: ExportDataType
  destroyModal: () => void
}

const GeneralExporterForm: React.FC<GeneralExporterFormProp> = (props) => {
  const { Config, Data, exportType, destroyModal } = props
  const { t, i18n } = useI18nNamespaces(['webFuzzer', 'yakitRoute'])
  const [params, setParams] = useState<basicConfig>(
    Config
      ? Config
      : {
          CSVOutput: true,
          DirName: '',
          FilePattern: '',
          JsonOutput: true,
        },
  )

  const [exportColumns, setExportColumns] = useState<ExportColumns[]>(() => {
    const arr = [
      {
        dataKey: 'Method',
        title: 'Method',
        isChecked: true,
        disabled: false,
      },
      {
        dataKey: 'StatusCode',
        title: t('HTTPFuzzerPageTable.status'),
        isChecked: true,
        disabled: false,
      },
      {
        dataKey: 'BodyLength',
        title: t('HTTPFuzzerPageTable.responseSize'),
        isChecked: true,
        disabled: false,
      },
      {
        dataKey: 'DurationMs',
        title: t('HTTPFuzzerPageTable.latencyMs'),
        isChecked: true,
        disabled: false,
      },
      {
        dataKey: 'Payloads',
        title: 'Payloads',
        isChecked: true,
        disabled: false,
      },
      {
        dataKey: 'ExtractedResults',
        title: t('HTTPFuzzerPageTable.extractData'),
        isChecked: true,
        disabled: false,
      },
      {
        dataKey: 'ContentType',
        title: 'Content-Type',
        isChecked: true,
        disabled: false,
      },
      {
        dataKey: 'Https',
        title: 'Https',
        isChecked: true,
        disabled: false,
      },
      {
        dataKey: 'Host',
        title: 'Host',
        isChecked: true,
        disabled: false,
      },
      {
        dataKey: 'Request',
        title: t('GeneralExporterForm.requestPacket'),
        isChecked: true,
        disabled: false,
      },
      {
        dataKey: 'Response',
        title: t('GeneralExporterForm.responsePacket'),
        isChecked: true,
        disabled: false,
      },
    ]
    if (exportType === 'payload') {
      arr.forEach((item) => {
        if (item.dataKey === 'Payloads') {
          item.isChecked = true
          item.disabled = true
        } else {
          item.isChecked = false
          item.disabled = true
        }
      })
    } else if (exportType === 'extracted') {
      arr.forEach((item) => {
        if (item.dataKey === 'ExtractedResults') {
          item.isChecked = true
          item.disabled = true
        } else {
          item.isChecked = false
          item.disabled = true
        }
      })
    }
    return arr
  })
  useEffect(() => {
    if (exportType === 'all') {
      getRemoteValue(FuzzerRemoteGV.FuzzerExportCustomFields).then((res) => {
        if (res) {
          try {
            const arr = JSON.parse(res) || []
            setExportColumns((prev) =>
              prev.map((item) => {
                if (arr.includes(item.dataKey)) {
                  return { ...item, isChecked: true }
                } else {
                  return { ...item, isChecked: false }
                }
              }),
            )
          } catch (error) {}
        }
      })
    }
  }, [exportType])

  return (
    <Form
      labelCol={{ span: 5 }}
      wrapperCol={{ span: 19 }}
      onSubmitCapture={(e) => {
        destroyModal()
        const filteredData = Data.map((i) => {
          const result: Partial<ExtractableData> = {}
          exportColumns.forEach((column) => {
            if (column.isChecked) {
              switch (column.dataKey) {
                case 'Method':
                  result.Method = { StringValue: i.Method.StringValue }
                  break
                case 'StatusCode':
                  result.StatusCode = { StringValue: i.StatusCode.StringValue }
                  break
                case 'BodyLength':
                  result.BodyLength = { StringValue: i.BodyLength.StringValue }
                  break
                case 'DurationMs':
                  result.DurationMs = { StringValue: i.DurationMs.StringValue }
                  break
                case 'Payloads':
                  result.Payloads = { StringValue: i.Payloads.StringValue }
                  break
                case 'ExtractedResults':
                  result.ExtractedResults = { StringValue: i.ExtractedResults.StringValue }
                  break
                case 'ContentType':
                  result.ContentType = { StringValue: i.ContentType.StringValue }
                  break
                case 'Https':
                  result.Https = { StringValue: i.Https.StringValue }
                  break
                case 'Host':
                  result.Host = { StringValue: i.Host.StringValue }
                  break
                case 'Request':
                  result.Request = { BytesValue: i.Request.BytesValue }
                  break
                case 'Response':
                  result.Response = { BytesValue: i.Response.BytesValue }
                  break
                default:
                  break
              }
            }
          })
          return result
        }) as ExtractableData[]

        showYakitModal({
          title: (modalT) => modalT('GeneralExporterForm.generateExportFile'),
          width: 700,
          footer: null,
          content: (
            <GeneralExporter
              {...params}
              Data={filteredData}
              onFinish={() => {
                if (exportType === 'all') {
                  setRemoteValue(
                    FuzzerRemoteGV.FuzzerExportCustomFields,
                    JSON.stringify(exportColumns.filter((item) => item.isChecked).map((item) => item.dataKey)),
                  )
                }
              }}
            />
          ),
        })
      }}
      style={{ padding: 24 }}
    >
      <Form.Item label={t('GeneralExporterForm.exportFields')} name="exportColumns">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {exportColumns.map((item) => (
            <YakitCheckbox
              key={item.dataKey}
              checked={item.isChecked}
              disabled={item.disabled}
              onChange={(e) => {
                setExportColumns((prev) =>
                  prev.map((i) => {
                    if (i.dataKey === item.dataKey) {
                      return { ...i, isChecked: e.target.checked }
                    }
                    return i
                  }),
                )
              }}
            >
              {item.title}
            </YakitCheckbox>
          ))}
        </div>
      </Form.Item>
      <Form.Item label={t('GeneralExporterForm.exportJson')} valuePropName="checked">
        <YakitSwitch onChange={(JsonOutput) => setParams({ ...params, JsonOutput })} checked={params.JsonOutput} />
      </Form.Item>
      <Form.Item label={t('GeneralExporterForm.exportCsv')} valuePropName="checked">
        <YakitSwitch onChange={(CSVOutput) => setParams({ ...params, CSVOutput })} checked={params.CSVOutput} />
      </Form.Item>
      <Form.Item label={t('GeneralExporterForm.outputToDirectory')} valuePropName="checked">
        <YakitInput
          placeholder={t('GeneralExporterForm.optionalDefaultYakitTempDir', { edition: getReleaseEditionName() })}
          onChange={(e) => setParams({ ...params, DirName: e.target.value })}
          value={params.DirName}
        />
      </Form.Item>
      <Form.Item label={t('GeneralExporterForm.fileName')} valuePropName="checked">
        <YakitInput
          placeholder={t('GeneralExporterForm.asteriskAsRandom')}
          onChange={(e) => setParams({ ...params, FilePattern: e.target.value })}
          value={params.FilePattern}
        />
      </Form.Item>
      <Form.Item colon={false} label={' '}>
        <YakitButton type="primary" htmlType="submit">
          {t('GeneralExporterForm.generateDataToLocalFile')}{' '}
        </YakitButton>
      </Form.Item>
    </Form>
  )
}
