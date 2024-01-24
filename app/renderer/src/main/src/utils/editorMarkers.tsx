import React from "react";
import monaco, {MarkerSeverity, MarkerTag, languages} from "monaco-editor";
import {Uint8ArrayToString} from "@/utils/str";

export interface IMonacoEditorMarker {
    message: string
    severity: MarkerSeverity,
    startLineNumber: number
    startColumn: number
    endLineNumber: number
    endColumn: number
    tags : MarkerTag[]
}

export interface YakStaticAnalyzeErrorResult {
    Message: Uint8Array
    RawMessage: Uint8Array
    Severity: "Error" | "Warning" | "Info" | "Hint" | string
    StartLineNumber: number
    StartColumn: number
    EndLineNumber: number
    EndColumn: number
    Tag : "Unnecessary" | "Deprecated" | string
}


function getMarkerTags(name: string): MarkerTag []{
    const tag = MarkerTag[name as keyof typeof MarkerTag];
    return tag !== undefined ? [tag] : [];
}

function getMarkerSeverity(name: string): MarkerSeverity {
    const severity = MarkerSeverity[name as keyof typeof MarkerSeverity];
    return severity !== undefined ? severity : MarkerSeverity.Hint;
}


export const ConvertYakStaticAnalyzeErrorToMarker = (i: YakStaticAnalyzeErrorResult): IMonacoEditorMarker => {
    return {
        message: i.Message.length > 0 ? Uint8ArrayToString(i.Message) : Uint8ArrayToString(i.RawMessage),
        severity: getMarkerSeverity(i.Severity),
        startLineNumber: parseInt(`${i.StartLineNumber}`),
        startColumn: parseInt(`${i.StartColumn}`),
        endLineNumber: parseInt(`${i.EndLineNumber}`),
        endColumn: parseInt(`${i.EndColumn}`),
        tags: getMarkerTags(i.Tag),
    }
}