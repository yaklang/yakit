import React from "react";
import {FuzzerResponse} from "./HTTPFuzzerPage";
import {exportData, ExtractableData, ExtractableValue} from "../../utils/exporter";

export const exportHTTPFuzzerResponse = (responses: FuzzerResponse[]) => {
    exportData(responses.map(i => {
        return {
            "Method": {StringValue: i.Method},
            "Https": {StringValue: `${i.IsHTTPS}`},
            "Host": {StringValue: `${i.Host}`},
            "ContentType": {StringValue: `${i.ContentType}`},
            "BodyLength": {StringValue: `${i.BodyLength}`},
            "Request": {BytesValue: i.RequestRaw,},
            "Response": {BytesValue: i.ResponseRaw},
            "Payload": {StringValue: (i?.Payloads || []).join("|")},
            "ExtractedResults": {StringValue: (i?.ExtractedResults || []).map((i)=>`${i.Key}: ${i.Value}`).join("|")},
        }
    }) as any)
}

export const exportPayloadResponse = (responses: FuzzerResponse[]) => {
    exportData(responses.map(i => {
        return {
            "Payloads": {StringValue: (i?.Payloads || []).join("|")} as ExtractableValue,
        } as any
    }) as any)
}