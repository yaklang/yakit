import React from "react";
import monaco, {MarkerSeverity} from "monaco-editor";
import {Uint8ArrayToString} from "@/utils/str";

export interface IMonacoEditorMarker {
    message: string
    severity: MarkerSeverity,
    startLineNumber: number
    startColumn: number
    endLineNumber: number
    endColumn: number
}

export interface YakStaticAnalyzeErrorResult {
    Message: Uint8Array
    RawMessage: Uint8Array
    Severity: "error" | "warning" | string
    StartLineNumber: number
    StartColumn: number
    EndLineNumber: number
    EndColumn: number
}

export const ConvertYakStaticAnalyzeErrorToMarker = (i: YakStaticAnalyzeErrorResult): IMonacoEditorMarker => {
    return {
        message: i.Message.length > 0 ? Uint8ArrayToString(i.Message) : Uint8ArrayToString(i.RawMessage),
        severity: i.Severity === "error" ? MarkerSeverity.Error : MarkerSeverity.Warning,
        startLineNumber: parseInt(`${i.StartLineNumber}`),
        startColumn: parseInt(`${i.StartColumn}`),
        endLineNumber: parseInt(`${i.EndLineNumber}`),
        endColumn: parseInt(`${i.EndColumn}`),
    }
}