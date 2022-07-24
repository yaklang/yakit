import React from "react";
import {failed} from "../../utils/notification";
import {Uint8ArrayToString} from "@/utils/str";

const {ipcRenderer} = window.require("electron");

export enum RequestToYakCodeTemplate {
    Ordinary = 0,
    Batch = 1,
}

export const generateYakCodeByRequest = (isHttps: boolean, req: Uint8Array, onResult: (code: string) => any, template?: RequestToYakCodeTemplate) => {
    ipcRenderer.invoke("GenerateYakCodeByPacket", {
        IsHttps: isHttps, Request: req, CodeTemplate: template || RequestToYakCodeTemplate.Ordinary,
    }).then((r: { Code: Uint8Array }) => {
        onResult(new Buffer(r.Code).toString())
    }).catch(e => {
        failed(`Generate Yak Code Failed：${e}`)
    })
}

export const generateCSRFPocByRequest = (req: Uint8Array, onResult: (code: string) => any) => {
    ipcRenderer.invoke("GenerateCSRFPocByPacket", {
        Request: req,
    }).then((r: { Code: Uint8Array }) => {
        onResult(Uint8ArrayToString(r.Code, "utf8"))
    }).catch(e => {
        failed(`Generate CSRF PoC failed: ${e}`)
    })
}