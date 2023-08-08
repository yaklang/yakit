import React from "react";
import {IMonacoCodeEditor, YakEditor} from "@/utils/editors";
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str";
import {failed, yakitFailed} from "@/utils/notification";
import prettier from "prettier/standalone";
import babelParser from "prettier/plugins/babel";
import htmlParser from "prettier/plugins/html";
import espreeParser from "prettier/plugins/estree";
import xmlParser from "prettier-plugin-xml";
import {debugYakitModalAny} from "@/components/yakitUI/YakitModal/YakitModalConfirm";
import DOMPurify from "isomorphic-dompurify";

const {ipcRenderer} = window.require("electron");
const plugins = [babelParser as any, htmlParser as any, espreeParser as any, xmlParser];

interface PacketPrettifyHelperResponse {
    Packet: Uint8Array
    ContentType: string
    IsImage: boolean
    ImageHtmlTag: string
    Body: Uint8Array
}

const safeRenderBody = (body: string, onFinished: (data: string) => any) => {
    try {
        onFinished(DOMPurify.sanitize(body, {
            KEEP_CONTENT: true,
        }))
    } catch (e) {
        onFinished(body)
        yakitFailed(`Render Failed: ${e}`)
    }
}

const formatPacket = (packet: string, onFormatted: (packet: string, body: string) => any) => {
    ipcRenderer.invoke("PacketPrettifyHelper", {
        Packet: StringToUint8Array(packet)
    }).then((rsp: PacketPrettifyHelperResponse) => {
        const contentType = rsp.ContentType.toLowerCase()
        if (contentType.includes("javascript")) {
            prettier.format(Uint8ArrayToString(rsp.Body), {
                parser: "babel", // JavaScript代码使用 "babel" 解析器
                printWidth: 80,
                tabWidth: 2,
                plugins: plugins,
                useTabs: false,
                semi: true,
                singleQuote: true,
                trailingComma: "all",
                bracketSpacing: true,
                arrowParens: "avoid",
            }).then(value => {
                ipcRenderer.invoke("PacketPrettifyHelper", {
                    Packet: rsp.Packet,
                    Body: StringToUint8Array(value),
                    SetReplaceBody: true,
                }).then((replacedRsp: PacketPrettifyHelperResponse) => {
                    onFormatted(Uint8ArrayToString(replacedRsp.Packet), value)
                }).catch(e => {
                    onFormatted(Uint8ArrayToString(rsp.Packet), value)
                })
            })
        } else if (contentType.includes("json")) {
            prettier.format(Uint8ArrayToString(rsp.Body), {
                parser: "json", // JavaScript代码使用 "babel" 解析器
                printWidth: 80,
                tabWidth: 2,
                plugins: plugins,
                useTabs: false,
                semi: true,
                singleQuote: true,
                trailingComma: "all",
                bracketSpacing: true,
                arrowParens: "avoid",
            }).then(value => {
                ipcRenderer.invoke("PacketPrettifyHelper", {
                    Packet: rsp.Packet,
                    Body: StringToUint8Array(value),
                    SetReplaceBody: true,
                }).then((replacedRsp: PacketPrettifyHelperResponse) => {
                    onFormatted(Uint8ArrayToString(replacedRsp.Packet), value)
                }).catch(e => {
                    onFormatted(Uint8ArrayToString(rsp.Packet), value)
                })
            })
        } else if (contentType.includes("html")) {
            prettier.format(Uint8ArrayToString(rsp.Body), {
                parser: "html", // HTML代码使用 "html" 解析器
                printWidth: 80,
                tabWidth: 2,
                useTabs: false,
                plugins: plugins,
                semi: true,
                singleQuote: true,
                trailingComma: "all",
                bracketSpacing: true,
                arrowParens: "avoid",
            }).then(value => {
                ipcRenderer.invoke("PacketPrettifyHelper", {
                    Packet: rsp.Packet,
                    Body: StringToUint8Array(value),
                    SetReplaceBody: true,
                }).then((replacedRsp: PacketPrettifyHelperResponse) => {
                    onFormatted(Uint8ArrayToString(replacedRsp.Packet), value)
                }).catch(e => {
                    onFormatted(Uint8ArrayToString(rsp.Packet), value)
                })
            }).catch(e => {
                onFormatted(Uint8ArrayToString(rsp.Packet), Uint8ArrayToString(rsp.Body))
            })
        } else if (contentType.includes("xml") || contentType.includes("soap") || Uint8ArrayToString(rsp.Body).trim().includes("<?xml version")) {
            prettier.format(Uint8ArrayToString(rsp.Body), {
                parser: "xml", // HTML代码使用 "html" 解析器
                printWidth: 80,
                tabWidth: 2,
                useTabs: false,
                plugins: plugins,
                semi: true,
                singleQuote: true,
                trailingComma: "all",
                bracketSpacing: true,
                arrowParens: "avoid",
            }).then(value => {
                ipcRenderer.invoke("PacketPrettifyHelper", {
                    Packet: rsp.Packet,
                    Body: StringToUint8Array(value),
                    SetReplaceBody: true,
                }).then((replacedRsp: PacketPrettifyHelperResponse) => {
                    onFormatted(Uint8ArrayToString(replacedRsp.Packet), value)
                }).catch(e => {
                    onFormatted(Uint8ArrayToString(rsp.Packet), value)
                })
            }).catch(e => {
                onFormatted(Uint8ArrayToString(rsp.Packet), Uint8ArrayToString(rsp.Body))
            })
        } else if (rsp.IsImage) {
            onFormatted(Uint8ArrayToString(rsp.Packet), Uint8ArrayToString(rsp.Body))
        } else {
            onFormatted(Uint8ArrayToString(rsp.Packet), Uint8ArrayToString(rsp.Body))
        }
    })
}

export const prettifyPacket = (e: IMonacoCodeEditor) => {
    try {
        // @ts-ignore
        const text = e.getModel()?.getValue() || "";
        formatPacket(text, (packet, body) => {
            debugYakitModalAny(<div style={{height: 500}}>
                <YakEditor readOnly={true} value={packet}/>
            </div>)
        })
    } catch (e) {
        failed("editor exec codec failed")
    }
}