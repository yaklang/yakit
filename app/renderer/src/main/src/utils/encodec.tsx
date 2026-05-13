import React, { useEffect, useState } from 'react'
import { Space } from 'antd'
import { IMonacoActionDescriptor, IMonacoCodeEditor } from './editors'
import { monacoEditorClear, monacoEditorReplace, monacoEditorWrite } from '../pages/fuzzer/fuzzerTemplates'
import { failed } from './notification'
import { AutoCard } from '../components/AutoCard'
import { Buffer } from 'buffer'
import { useGetState, useUpdateEffect } from 'ahooks'
import { StringToUint8Array } from '@/utils/str'
import styles from './encodec.module.scss'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { showYakitModal } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import classNames from 'classnames'
import { yakitCodec } from '@/services/electronBridge'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import i18n from '@/i18n/i18n'
import { YakitEditor } from '@/components/yakitUI/YakitEditor/YakitEditor'
const tOriginal = i18n.getFixedT(null, 'utils')

export type CodecType =
  | 'fuzz'
  | 'md5'
  | 'sha1'
  | 'sha256'
  | 'sha512'
  | 'base64'
  | 'base64-decode'
  | 'htmlencode'
  | 'htmldecode'
  | 'htmlescape'
  | 'urlencode'
  | 'urlunescape'
  | 'double-urlencode'
  | 'double-urldecode'
  | 'hex-encode'
  | 'hex-decode'
  | 'packet-to-curl'
  | any

const editorCodecHandlerFactory = (typeStr: CodecType) => {
  return (e: IMonacoCodeEditor) => {
    try {
      // @ts-ignore
      const text = e.getModel()?.getValueInRange(e.getSelection()) || ''
      execCodec(typeStr, text, false, e)
    } catch (e) {
      failed('editor exec codec failed')
    }
  }
}

const editorFullCodecHandlerFactory = (typeStr: CodecType) => {
  return (e: IMonacoCodeEditor) => {
    try {
      // @ts-ignore
      const text = e.getModel()?.getValueInRange(e.getSelection()) || ''
      if (!!text) {
        execCodec(typeStr, text, false, e)
      } else {
        const model = e.getModel()
        const fullText = model?.getValue()
        execCodec(typeStr, fullText || '', false, e, true)
      }
    } catch (e) {
      failed('editor exec codec failed')
      console.error(e)
    }
  }
}

export interface MutateHTTPRequestParams {
  Request: Uint8Array
  FuzzMethods: string[]
  ChunkEncode: boolean
  UploadEncode: boolean
}

export interface MutateHTTPRequestResponse {
  Result: Uint8Array
  ExtraResults: Uint8Array[]
}

export const mutateRequest = (params: MutateHTTPRequestParams, editor?: IMonacoCodeEditor) => {
  yakitCodec.mutateHttpRequest(params).then((result: MutateHTTPRequestResponse) => {
    if (editor) {
      monacoEditorClear(editor)
      monacoEditorReplace(editor, new Buffer(result.Result).toString('utf8'))
      return
    }
  })
}

const editorMutateHTTPRequestHandlerFactory = (params: MutateHTTPRequestParams) => {
  return (e: IMonacoCodeEditor) => {
    try {
      const model = e.getModel()
      const fullText = model?.getValue()
      mutateRequest({ ...params, Request: new Buffer(fullText || '') }, e)
    } catch (e) {
      failed(`mutate request failed: ${e}`)
    }
  }
}

export interface MonacoEditorActions extends IMonacoActionDescriptor {
  id: CodecType | string
  label: string
  contextMenuGroupId: 'codec' | string
  run: (editor: IMonacoCodeEditor) => any
  keybindings?: any[]
}

export const MonacoEditorCodecActions: MonacoEditorActions[] = [
  { id: 'urlencode', label: 'URL 编码' },
  { id: 'urlescape', label: 'URL 编码(只编码特殊字符)' },
  { id: 'base64', label: 'Base64 编码' },
  { id: 'base64-decode', label: 'Base64 解码' },
  { id: 'htmlencode', label: 'HTML 编码' },
  { id: 'htmldecode', label: 'HTML 解码' },
  { id: 'urlunescape', label: 'URL 解码' },
  { id: 'double-urlencode', label: '双重 URL 编码' },
  { id: 'unicode-decode', label: 'Unicode 解码（\\uXXXX 解码）' },
  { id: 'unicode-encode', label: 'Unicode 编码（\\uXXXX 编码）' },
  { id: 'base64-url-encode', label: '先 Base64 后 URL 编码' },
  { id: 'url-base64-decode', label: '先 URL 后 Base64 解码' },
  { id: 'hex-decode', label: 'HEX 解码（十六进制解码）' },
  { id: 'hex-encode', label: 'HEX 编码（十六进制编码）' },
  { id: 'jwt-parse-weak', label: 'JWT 解析（同时测试弱 Key）' },
].map((i) => {
  return { id: i.id, label: i.label, contextMenuGroupId: 'codec', run: editorCodecHandlerFactory(i.id as CodecType) }
})

export const MonacoEditorMutateHTTPRequestActions: {
  id: CodecType | string
  label: string
  contextMenuGroupId: 'codec' | string
  run: (editor: IMonacoCodeEditor) => any
}[] = [
  {
    id: 'mutate-http-method-get',
    label: '改变 HTTP 方法成 GET',
    params: { FuzzMethods: ['GET'] } as MutateHTTPRequestParams,
  },
  {
    id: 'mutate-http-method-post',
    label: '改变 HTTP 方法成 POST',
    params: { FuzzMethods: ['POST'] } as MutateHTTPRequestParams,
  },
  {
    id: 'mutate-http-method-head',
    label: '改变 HTTP 方法成 HEAD',
    params: { FuzzMethods: ['HEAD'] } as MutateHTTPRequestParams,
  },
  {
    id: 'mutate-chunked',
    label: 'HTTP Chunk 编码',
    params: { ChunkEncode: true } as MutateHTTPRequestParams,
  },
  {
    id: 'mutate-upload',
    label: '修改为上传数据包',
    params: { UploadEncode: true } as MutateHTTPRequestParams,
  },
].map((i) => {
  return {
    id: i.id,
    label: i.label,
    contextMenuGroupId: 'mutate-http-request',
    run: editorMutateHTTPRequestHandlerFactory(i.params),
  }
})

export interface AutoDecodeResult {
  Type: string
  TypeVerbose: string
  Origin: Uint8Array
  Result: Uint8Array
  Modify: boolean
}

interface AutoDecodeProps {
  data: AutoDecodeResult[]
  source?: string
  isShowSource?: boolean
}
const AutoDecode: React.FC<AutoDecodeProps> = React.memo((prop: AutoDecodeProps) => {
  const { data, source, isShowSource = false } = prop
  const { t, i18n } = useI18nNamespaces(['utils'])
  const [result, setResult, getResult] = useGetState<AutoDecodeResult[]>(data)
  useUpdateEffect(() => {
    setResult(data)
  }, [data])
  return (
    <div className={styles['auto-decode-container']}>
      {isShowSource && (
        <AutoCard
          title={<span className={styles['auto-decode-container-title']}>{t('Encodec.selectContent')}</span>}
          size={'small'}
        >
          <div style={{ height: 120 }}>
            <YakitEditor noMiniMap={true} type={'html'} value={source} readOnly={true} noLineNumber={true} />
          </div>
        </AutoCard>
      )}

      {result.map((i, index) => {
        return (
          <AutoCard
            title={
              <div className={classNames(styles['decode-step-title'], 'yakit-single-line-ellipsis')}>
                {t('Encodec.decodeStep', { index: index + 1, verbose: i.TypeVerbose, type: i.Type })}
              </div>
            }
            size={'small'}
            extra={
              <YakitButton
                size={'small'}
                onClick={() => {
                  showYakitModal({
                    title: (modalT) => modalT('Encodec.originText'),
                    width: '50%',
                    content: (
                      <div style={{ height: 280 }}>
                        <YakitEditor
                          type={'html'}
                          noMiniMap={true}
                          readOnly={true}
                          noLineNumber={true}
                          value={new Buffer(i.Origin).toString('utf8')}
                        />
                      </div>
                    ),
                    footer: null,
                    centered: true,
                  })
                }}
              >
                {t('Encodec.viewOriginalText')}
              </YakitButton>
            }
          >
            <div style={{ height: 120 }}>
              <YakitEditor
                noMiniMap={true}
                type={'html'}
                value={new Buffer(i.Result).toString('utf8')}
                noLineNumber={true}
                setValue={(s) => {
                  const req = getResult()
                  req[index].Modify = true
                  req[index].Result = StringToUint8Array(s)
                  yakitCodec
                    .autoDecode({ ModifyResult: req })
                    .then((e: { Results: AutoDecodeResult[] }) => {
                      setResult(e.Results)
                    })
                    .catch((e) => {
                      failed(t('Encodec.autoDecodeFailed', { error: String(e) }))
                    })
                }}
              />
            </div>
          </AutoCard>
        )
      })}
    </div>
  )
})
export const execAutoDecode = async (text: string) => {
  return yakitCodec
    .autoDecode({ Data: text })
    .then((e: { Results: AutoDecodeResult[] }) => {
      showYakitModal({
        title: (modalT) => modalT('Encodec.autoDecodeSmart'),
        width: '60%',
        content: <AutoDecode data={e.Results}></AutoDecode>,
      })
    })
    .catch((e) => {
      failed(tOriginal('Encodec.autoDecodeFailed', { error: String(e) }))
    })
}

export const execCodec = async (
  typeStr: CodecType,
  text: string,
  noPrompt?: boolean,
  replaceEditor?: IMonacoCodeEditor,
  clear?: boolean,
  extraParams?: {
    Key: string
    Value: string
  }[],
): Promise<string> => {
  return yakitCodec
    .run({ Text: text, Type: typeStr, Params: extraParams })
    .then((result: { Result: string }) => {
      if (replaceEditor) {
        let m = showYakitModal({
          width: '50%',
          content: (modalT) => (
            <AutoCard
              title={modalT('Encodec.codeResult')}
              bordered={false}
              extra={
                <YakitButton
                  type={'primary'}
                  onClick={() => {
                    if (clear) {
                      monacoEditorClear(replaceEditor)
                      replaceEditor.getModel()?.setValue(result.Result)
                    } else {
                      monacoEditorWrite(replaceEditor, result.Result)
                    }
                    m.destroy()
                  }}
                  size={'small'}
                >
                  {modalT('Encodec.replaceContent')}
                </YakitButton>
              }
              size={'small'}
            >
              <div style={{ width: '100%', height: 300 }}>
                <YakitEditor type={'http'} readOnly={true} value={result.Result} />
              </div>
            </AutoCard>
          ),
        })
      }

      if (noPrompt) {
        showYakitModal({
          title: (modalT) => modalT('Encodec.codeResult'),
          width: '50%',
          content: (
            <div style={{ width: '100%' }}>
              <Space style={{ width: '100%' }} direction={'vertical'}>
                <div style={{ height: 300 }}>
                  <YakitEditor fontSize={20} type={'html'} readOnly={true} value={result.Result} />
                </div>
              </Space>
            </div>
          ),
        })
      }
      return result?.Result || ''
    })
    .catch((e: any) => {
      failed(tOriginal('Encodec.codecExecutionFailed', { type: typeStr, error: String(e) }))
      return ''
    })
}

interface HTTPFlowCodecProps {
  data: string
}

export const HTTPFlowCodec: React.FC<HTTPFlowCodecProps> = React.memo((props) => {
  const { data } = props
  const { t, i18n } = useI18nNamespaces(['utils'])
  const [codec, setCodec] = useState<AutoDecodeResult[]>([])

  useEffect(() => {
    yakitCodec
      .autoDecode({ Data: data })
      .then((e: { Results: AutoDecodeResult[] }) => {
        setCodec(e.Results)
      })
      .catch((e) => {
        failed(t('Encodec.autoDecodeFailed', { error: String(e) }))
      })
      .finally(() => {})
  }, [data])

  return (
    <div className={styles['http-flow-codec']}>
      <AutoDecode data={codec} source={data} isShowSource={true} />
    </div>
  )
})
