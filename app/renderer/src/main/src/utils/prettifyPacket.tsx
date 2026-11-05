import { loadHTTPPreviewResources, type PreviewNetwork } from './httpPreviewResources'
import { type IMonacoCodeEditor, YakEditor } from '@/utils/editors'
import { StringToUint8Array, Uint8ArrayToString } from '@/utils/str'
import { failed, yakitNotify } from '@/utils/notification'
import prettier from 'prettier/standalone'
import babelParser from 'prettier/plugins/babel'
import htmlParser from 'prettier/plugins/html'
import espreeParser from 'prettier/plugins/estree'
import xmlParser from '@prettier/plugin-xml'
import xmlFormatter from 'xml-formatter'
import { debugYakitModalAny } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import { renderStaticHtml } from './staticHtmlPreview'
import { replayCapturedImages } from './capturedImageReplay'
import type { CapturedImageContext } from './capturedImageReplay'
import i18n from '@/i18n/i18n'

const tOriginal = i18n.getFixedT(null, 'utils')
const { ipcRenderer } = window.require('electron')
const plugins = [babelParser as any, htmlParser as any, espreeParser as any, xmlParser]

interface PacketPrettifyHelperResponse {
  Packet: Uint8Array
  ContentType: string
  IsImage: boolean
  ImageHtmlTag: Uint8Array
  Body: Uint8Array
}

/**
 * 安全渲染 HTML，保留样式，禁止 JS 执行
 */
export const safeRenderBody = (body: string, onFinished: (html: string) => void) => {
  onFinished(renderStaticHtml(body))
}

function extractAndCompareCode(originalCode: string, formattedCode: string) {
  // 使用正则提取所有字母和数字，并转为小写
  const extractChars = (code: string): string[] => (code.match(/[a-zA-Z0-9]/g) || []).map((char) => char.toLowerCase())

  const originalChars = extractChars(originalCode)
  const formattedChars = extractChars(formattedCode)

  return originalChars.length > formattedChars.length
}

const formatCode = async (rsp: PacketPrettifyHelperResponse, option, callback) => {
  try {
    const formattedCode = await prettier.format(Uint8ArrayToString(rsp.Body), option)
    if (extractAndCompareCode(Uint8ArrayToString(rsp.Body), formattedCode)) {
      yakitNotify('info', tOriginal('PrettifyPacket.lossyBeautifyWarning'))
    }
    callback(formattedCode)
  } catch (error) {
    // 处理错误
    callback()
  }
}

const formatPacket = (packet: string, onFormatted: (packet: Uint8Array, body: string) => any) => {
  ipcRenderer
    .invoke('PacketPrettifyHelper', {
      Packet: StringToUint8Array(packet),
    })
    .then((rsp: PacketPrettifyHelperResponse) => {
      const contentType = rsp.ContentType.toLowerCase()
      if (contentType.includes('javascript')) {
        formatCode(
          rsp,
          {
            parser: 'babel', // JavaScript代码使用 "babel" 解析器
            printWidth: 80,
            tabWidth: 2,
            plugins: plugins,
            useTabs: false,
            semi: true,
            singleQuote: false,
            trailingComma: 'all',
            bracketSpacing: true,
            arrowParens: 'avoid',
          },
          (formattedCode) => {
            if (formattedCode) {
              // 处理格式化后的代码
              ipcRenderer
                .invoke('PacketPrettifyHelper', {
                  Packet: rsp.Packet,
                  Body: StringToUint8Array(formattedCode),
                  SetReplaceBody: true,
                })
                .then((replacedRsp: PacketPrettifyHelperResponse) => {
                  onFormatted(replacedRsp.Packet, formattedCode)
                })
                .catch((e) => {
                  onFormatted(rsp.Packet, formattedCode)
                })
            } else {
              onFormatted(rsp.Packet, Uint8ArrayToString(rsp.Body))
            }
          },
        )
      } else if (contentType.includes('json')) {
        formatCode(
          rsp,
          {
            parser: 'json', // JavaScript代码使用 "babel" 解析器
            printWidth: 80,
            tabWidth: 2,
            plugins: plugins,
            useTabs: false,
            semi: true,
            singleQuote: true,
            trailingComma: 'all',
            bracketSpacing: true,
            arrowParens: 'avoid',
          },
          (formattedCode) => {
            if (formattedCode) {
              ipcRenderer
                .invoke('PacketPrettifyHelper', {
                  Packet: rsp.Packet,
                  Body: StringToUint8Array(formattedCode),
                  SetReplaceBody: true,
                })
                .then((replacedRsp: PacketPrettifyHelperResponse) => {
                  onFormatted(replacedRsp.Packet, formattedCode)
                })
                .catch((e) => {
                  onFormatted(rsp.Packet, formattedCode)
                })
            } else {
              onFormatted(rsp.Packet, Uint8ArrayToString(rsp.Body))
            }
          },
        )
      } else if (contentType.includes('html')) {
        formatCode(
          rsp,
          {
            parser: 'html', // HTML代码使用 "html" 解析器
            printWidth: 80,
            tabWidth: 2,
            useTabs: false,
            plugins: plugins,
            semi: true,
            singleQuote: false,
            trailingComma: 'all',
            bracketSpacing: true,
            arrowParens: 'avoid',
          },
          (formattedCode) => {
            if (formattedCode) {
              ipcRenderer
                .invoke('PacketPrettifyHelper', {
                  Packet: rsp.Packet,
                  Body: StringToUint8Array(formattedCode),
                  SetReplaceBody: true,
                })
                .then((replacedRsp: PacketPrettifyHelperResponse) => {
                  onFormatted(replacedRsp.Packet, formattedCode)
                })
                .catch((e) => {
                  onFormatted(rsp.Packet, formattedCode)
                })
            } else {
              onFormatted(rsp.Packet, Uint8ArrayToString(rsp.Body))
            }
          },
        )
      } else if (
        contentType.includes('xml') ||
        contentType.includes('soap') ||
        Uint8ArrayToString(rsp.Body).trim().includes('<?xml version')
      ) {
        try {
          const formattedXml = xmlFormatter(Uint8ArrayToString(rsp.Body), {
            indentation: '  ', // 两个空格
            lineSeparator: '\n',
            collapseContent: false, // 关键：属性 & 子节点全部展开
          })

          ipcRenderer
            .invoke('PacketPrettifyHelper', {
              Packet: rsp.Packet,
              Body: StringToUint8Array(formattedXml),
              SetReplaceBody: true,
            })
            .then((replacedRsp) => {
              onFormatted(replacedRsp.Packet, formattedXml)
            })
            .catch(() => {
              onFormatted(rsp.Packet, formattedXml)
            })
        } catch (e) {
          // XML 解析失败，直接回退原文
          onFormatted(rsp.Packet, Uint8ArrayToString(rsp.Body))
        }
      } else if (rsp.IsImage) {
        onFormatted(rsp.Packet, Uint8ArrayToString(rsp.Body))
      } else {
        onFormatted(rsp.Packet, Uint8ArrayToString(rsp.Body))
      }
    })
}

export const prettifyPacket = (e: IMonacoCodeEditor) => {
  try {
    const text = e.getModel()?.getValue() || ''
    formatPacket(text, (packet, body) => {
      debugYakitModalAny(
        <div style={{ height: 500 }}>
          <YakEditor readOnly={true} value={Uint8ArrayToString(packet)} />
        </div>,
      )
    })
  } catch (e) {
    failed('editor exec codec failed')
  }
}

export const prettifyPacketCode = (text: string) => {
  return new Promise((resolve, reject) => {
    try {
      formatPacket(text, (packet, body) => {
        resolve(packet)
      })
    } catch (error) {
      failed('editor exec codec failed')
    }
  })
}

// 渲染功能(Html + Image)
export const formatPacketRender = (
  packet: Uint8Array,
  onFormatted: (packet?: string) => any,
  context?: CapturedImageContext & { network?: PreviewNetwork },
) => {
  if (packet.length === 0) {
    onFormatted()
    return
  }
  if (packet.length > 0) {
    ipcRenderer
      .invoke('PacketPrettifyHelper', {
        Packet: packet,
      })
      .then(async (rsp: PacketPrettifyHelperResponse) => {
        const contentType = rsp.ContentType.toLowerCase()
        if (contentType.includes('html')) {
          const body = Uint8ArrayToString(rsp.Body)
          onFormatted(
            context
              ? context.network
                ? await loadHTTPPreviewResources(body, { ...context, network: context.network }, (channel, ...args) =>
                    ipcRenderer.invoke(channel, ...args),
                  )
                : await replayCapturedImages(body, context, (channel, params) => ipcRenderer.invoke(channel, params))
              : renderStaticHtml(body),
          )
        } else if (rsp.IsImage) {
          onFormatted(renderStaticHtml(Uint8ArrayToString(rsp.ImageHtmlTag)))
        } else {
          onFormatted()
        }
      })
      .catch(() => onFormatted())
  }
}

export const prettifyPacketRender = (
  text: Uint8Array,
  context?: CapturedImageContext & { network?: PreviewNetwork },
) => {
  return new Promise((resolve, reject) => {
    try {
      formatPacketRender(
        text,
        (packet) => {
          resolve(packet)
        },
        context,
      )
    } catch (error) {
      failed('editor exec codec failed')
    }
  })
}
