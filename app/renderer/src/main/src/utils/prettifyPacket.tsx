import React from "react";
import {IMonacoCodeEditor, YakEditor} from "@/utils/editors";
import {StringToUint8Array, Uint8ArrayToString} from "@/utils/str";
import {failed} from "@/utils/notification";
import prettier from "prettier/standalone";
import babelParser from "prettier/plugins/babel";
import htmlParser from "prettier/plugins/html";
import espreeParse from "prettier/plugins/estree";
import {debugYakitModal, debugYakitModalAny} from "@/components/yakitUI/YakitModal/YakitModalConfirm";

const {ipcRenderer} = window.require("electron");
const plugins = [babelParser as any, htmlParser as any, espreeParse as any];

interface PacketPrettifyHelperResponse {
    Packet: Uint8Array
    ContentType: string
    IsImage: boolean
    ImageHtmlTag: string
    Body: Uint8Array
}

export const prettifyPacket = (e: IMonacoCodeEditor) => {
    try {
        // @ts-ignore
        const text = e.getModel()?.getValue() || "";
        ipcRenderer.invoke("PacketPrettifyHelper", {
            Packet: StringToUint8Array(text)
        }).then((rsp: PacketPrettifyHelperResponse) => {
            console.info(rsp)
            if (rsp.ContentType.toLowerCase().includes("javascript")) {
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
                    debugYakitModalAny(<div style={{height: 500}}>
                        <YakEditor readOnly={true} value={value}/>
                    </div>)
                })
            } else if (rsp.ContentType.toLowerCase().includes("html")) {
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
                    debugYakitModalAny(<div style={{height: 500}}>
                        <YakEditor type={"html"} readOnly={true} value={value}/>
                    </div>)
                })
            } else if (rsp.IsImage) {
                debugYakitModal(rsp.ImageHtmlTag);
            } else {
                debugYakitModal(Uint8ArrayToString(rsp.Body));
            }
        })
    } catch (e) {
        failed("editor exec codec failed")
    }
}