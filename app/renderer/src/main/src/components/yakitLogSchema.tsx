import React from "react";
import {ExecResult} from "../pages/invoker/schema";
import {ExecResultLog, ExecResultProgress} from "../pages/invoker/batch/ExecMessageViewer";

export interface ExecResultMessage {
    "type": "log" | "progress" | string,
    content: YakitLog | any,
}

export interface YakitLog {
    level: "json" | "info" | "warn" | "error" | string,
    data: string | any,
    timestamp: number
}

export interface YakitPort {
    host: string
    port: any
    fingerprint?: string
    htmlTitle?: any
    isOpen: boolean
    timestamp: number
}

export const ExtractExecResultMessageToYakitPort = (msg: ExecResultMessage): YakitPort | undefined => {
    if (msg.type !== "log") {
        return
    }

    if (msg.content.level !== "json") {
        return
    }

    try {
        let res: YakitPort = JSON.parse(msg.content.data);
        if (!res.timestamp || res.timestamp <= 0) {
            return {...res, timestamp: msg.content.timestamp}
        }
        return res;
    } catch (e) {
        return undefined;
    }
};

export const ExtractExecResultMessage = (data: ExecResult): ExecResultLog | ExecResultProgress | undefined => {
    if (data.IsMessage) {
        try {
            let obj: ExecResultMessage = JSON.parse(Buffer.from(data.Message).toString("utf8"));
            console.info("message body: ", obj)
            if (obj.type === "log") {
                return obj.content as ExecResultLog
            } else if (obj.type === "progress") {
                return obj.content as ExecResultProgress
            }
        } catch (e) {
        }
    }
};