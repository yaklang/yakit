import React from "react";
import {failed} from "../../utils/notification";

const {ipcRenderer} = window.require("electron");

export enum RequestToYakCodeTemplate {
    Ordinary = 0,
    Batch = 1,
}

export const generateYakCodeByRequest = (isHttps: boolean, req: Uint8Array, onResult: (code: string) => any, template?: RequestToYakCodeTemplate) => {
    ipcRenderer.invoke("GenerateYakCodeByPacket", {
        IsHttps: isHttps, Request: req, CodeTemplate: template || RequestToYakCodeTemplate.Ordinary,
    }).then((r: { Code: Uint8Array }) => {
        console.info(r)
        onResult(new Buffer(r.Code).toString())
    }).catch(e => {
        failed(`Generate Yak Code Failed：${e}`)
    })
}