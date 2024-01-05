import React from "react";
import {RequestYakURLResponse, YakURL} from "@/pages/yakURLTree/data";
import {yakitFailed} from "@/utils/notification";

const {ipcRenderer} = window.require("electron");

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";


export const requestYakURLList = ({url, method, body}: {url: YakURL, method?: HttpMethod, body?: Uint8Array}, onResponse?: (response: RequestYakURLResponse) => any, onError?: (e) => any) => {
    if (!method) method = "GET"
    url.Query = url.Query || []
    return ipcRenderer.invoke("RequestYakURL", {
        Url: url,
        Method: method,
        Body: body,
    }).then((rsp: RequestYakURLResponse) => {
        if (onResponse) {
            onResponse(rsp)
        }
        return rsp
    }).catch(e => {
        yakitFailed(`加载失败: ${e}`)
        if (onError) {
            onError(e)
        }
        throw e
    })
}

export const loadFromYakURLRaw = (url: string, onResponse?: (response: RequestYakURLResponse) => any, onError?: (e) => any) => {
    return ipcRenderer.invoke("RequestYakURL", {
        Url: {
            FromRaw: url,
            Schema: "",
            User: "",
            Pass: "",
            Location: "",
            Path: "",
            Query: [],
        },
        Method: "GET",
    }).then((rsp: RequestYakURLResponse) => {
        if (onResponse) {
            onResponse(rsp)
        }
        return rsp
    }).catch(e => {
        yakitFailed(`加载失败: ${e}`)
        if (onError) {
            onError(e)
        }
        throw e
    })
}