import React from "react"
import {IMonacoCodeEditor, YakEditor} from "@/utils/editors"
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str"
import {failed, yakitFailed, yakitNotify} from "@/utils/notification"
import prettier from "prettier/standalone"
import babelParser from "prettier/plugins/babel"
import htmlParser from "prettier/plugins/html"
import espreeParser from "prettier/plugins/estree"
import xmlParser from "@prettier/plugin-xml"
import {debugYakitModalAny} from "@/components/yakitUI/YakitModal/YakitModalConfirm"
import DOMPurify from "isomorphic-dompurify"

const {ipcRenderer} = window.require("electron")
const plugins = [babelParser as any, htmlParser as any, espreeParser as any, xmlParser]

interface PacketPrettifyHelperResponse {
    Packet: Uint8Array
    ContentType: string
    IsImage: boolean
    ImageHtmlTag: Uint8Array
    Body: Uint8Array
}

const safeRenderBody = (body: string, onFinished: (data: string) => any) => {
    try {
        onFinished(
            DOMPurify.sanitize(body, {
                KEEP_CONTENT: true
            })
        )
    } catch (e) {
        onFinished(body)
        yakitFailed(`Render Failed: ${e}`)
    }
}

function extractAndCompareCode(originalCode: string, formattedCode: string) {
    // 使用正则提取所有字母和数字，并转为小写
    const extractChars = (code: string): string[] =>
        (code.match(/[a-zA-Z0-9]/g) || []).map((char) => char.toLowerCase())

    const originalChars = extractChars(originalCode)
    const formattedChars = extractChars(formattedCode)

    return originalChars.length > formattedChars.length
}

const formatCode = async (rsp: PacketPrettifyHelperResponse, option, callback) => {
    try {
        const formattedCode = await prettier.format(Uint8ArrayToString(rsp.Body), option)
        if (extractAndCompareCode(Uint8ArrayToString(rsp.Body), formattedCode)) {
            yakitNotify("info", "原始数据可能存在问题，美化丢失了部分内容")
        }
        callback(formattedCode)
    } catch (error) {
        // 处理错误
        callback()
    }
}

const formatPacket = (packet: string, onFormatted: (packet: Uint8Array, body: string) => any) => {
    ipcRenderer
        .invoke("PacketPrettifyHelper", {
            Packet: StringToUint8Array(packet)
        })
        .then((rsp: PacketPrettifyHelperResponse) => {
            const contentType = rsp.ContentType.toLowerCase()
            if (contentType.includes("javascript")) {
                formatCode(
                    rsp,
                    {
                        parser: "babel", // JavaScript代码使用 "babel" 解析器
                        printWidth: 80,
                        tabWidth: 2,
                        plugins: plugins,
                        useTabs: false,
                        semi: true,
                        singleQuote: true,
                        trailingComma: "all",
                        bracketSpacing: true,
                        arrowParens: "avoid"
                    },
                    (formattedCode) => {
                        if (formattedCode) {
                            // 处理格式化后的代码
                            ipcRenderer
                                .invoke("PacketPrettifyHelper", {
                                    Packet: rsp.Packet,
                                    Body: StringToUint8Array(formattedCode),
                                    SetReplaceBody: true
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
                    }
                )
            } else if (contentType.includes("json")) {
                formatCode(
                    rsp,
                    {
                        parser: "json", // JavaScript代码使用 "babel" 解析器
                        printWidth: 80,
                        tabWidth: 2,
                        plugins: plugins,
                        useTabs: false,
                        semi: true,
                        singleQuote: true,
                        trailingComma: "all",
                        bracketSpacing: true,
                        arrowParens: "avoid"
                    },
                    (formattedCode) => {
                        if (formattedCode) {
                            ipcRenderer
                                .invoke("PacketPrettifyHelper", {
                                    Packet: rsp.Packet,
                                    Body: StringToUint8Array(formattedCode),
                                    SetReplaceBody: true
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
                    }
                )
            } else if (contentType.includes("html")) {
                formatCode(
                    rsp,
                    {
                        parser: "html", // HTML代码使用 "html" 解析器
                        printWidth: 80,
                        tabWidth: 2,
                        useTabs: false,
                        plugins: plugins,
                        semi: true,
                        singleQuote: false,
                        trailingComma: "all",
                        bracketSpacing: true,
                        arrowParens: "avoid"
                    },
                    (formattedCode) => {
                        if (formattedCode) {
                            ipcRenderer
                                .invoke("PacketPrettifyHelper", {
                                    Packet: rsp.Packet,
                                    Body: StringToUint8Array(formattedCode),
                                    SetReplaceBody: true
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
                    }
                )
            } else if (
                contentType.includes("xml") ||
                contentType.includes("soap") ||
                Uint8ArrayToString(rsp.Body).trim().includes("<?xml version")
            ) {
                formatCode(
                    rsp,
                    {
                        parser: "xml", // HTML代码使用 "html" 解析器
                        printWidth: 80,
                        tabWidth: 2,
                        useTabs: false,
                        plugins: plugins,
                        semi: true,
                        singleQuote: true,
                        trailingComma: "all",
                        bracketSpacing: true,
                        arrowParens: "avoid"
                    },
                    (formattedCode) => {
                        if (formattedCode) {
                            ipcRenderer
                                .invoke("PacketPrettifyHelper", {
                                    Packet: rsp.Packet,
                                    Body: StringToUint8Array(formattedCode),
                                    SetReplaceBody: true
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
                    }
                )
            } else if (rsp.IsImage) {
                onFormatted(rsp.Packet, Uint8ArrayToString(rsp.Body))
            } else {
                onFormatted(rsp.Packet, Uint8ArrayToString(rsp.Body))
            }
        })
}

export const prettifyPacket = (e: IMonacoCodeEditor) => {
    try {
        // @ts-ignore
        const text = e.getModel()?.getValue() || ""
        formatPacket(text, (packet, body) => {
            debugYakitModalAny(
                <div style={{height: 500}}>
                    <YakEditor readOnly={true} value={Uint8ArrayToString(packet)} />
                </div>
            )
        })
    } catch (e) {
        failed("editor exec codec failed")
    }
}

export const prettifyPacketCode = (text: string) => {
    return new Promise((resolve, reject) => {
        try {
            formatPacket(text, (packet, body) => {
                resolve(packet)
            })
        } catch (error) {
            failed("editor exec codec failed")
        }
    })
}

// 渲染功能(Html + Image)
export const formatPacketRender = (packet: Uint8Array, onFormatted: (packet?: string) => any) => {
    if (packet.length > 0) {
        ipcRenderer
            .invoke("PacketPrettifyHelper", {
                Packet: packet
            })
            .then((rsp: PacketPrettifyHelperResponse) => {
                const contentType = rsp.ContentType.toLowerCase()
                if (contentType.includes("html")) {
                    safeRenderBody(Uint8ArrayToString(rsp.Body), (data: string) => {
                        onFormatted(data)
                    })
                } else if (rsp.IsImage) {
                    onFormatted(Uint8ArrayToString(rsp.ImageHtmlTag))
                } else {
                    onFormatted()
                }
            })
    }
}

export const prettifyPacketRender = (text: Uint8Array) => {
    return new Promise((resolve, reject) => {
        try {
            formatPacketRender(text, (packet) => {
                resolve(packet)
            })
        } catch (error) {
            failed("editor exec codec failed")
        }
    })
}
