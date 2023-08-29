import React from "react";
import {RequestYakURLResponse, YakURL} from "@/pages/yakURLTree/data";
import {yakitFailed} from "@/utils/notification";

const {ipcRenderer} = window.require("electron");

export const requestYakURLList = (url: YakURL, onResponse?: (response: RequestYakURLResponse) => any, onError?: (e) => any) => {
    url.Query = url.Query || []
    url.Query.push({Key: "op", Value: "list"})
    return ipcRenderer.invoke("RequestYakURL", {
        Url: url,
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