import React from "react"
import {FuzzerResponse} from "./HTTPFuzzerPage"
import {exportData, ExtractableData, ExtractableValue} from "../../utils/exporter"

export const exportHTTPFuzzerResponse = (responses: FuzzerResponse[], extractedMap) => {
    exportData(
        responses.map((i) => {
            return {
                Method: {StringValue: i.Method},
                StatusCode: {StringValue: i.StatusCode},
                BodyLength: {StringValue: `${i.BodyLength}`},
                DurationMs: {StringValue: `${i.DurationMs}`},
                Payloads: {StringValue: (i?.Payloads || []).join("|")},
                ExtractedResults: {
                    StringValue:
                        extractedMap && extractedMap.size > 0
                            ? extractedMap.get(i["UUID"]) || "-"
                            : (i?.ExtractedResults || []).map((i) => `${i.Key}: ${i.Value}`).join("|")
                },
                ContentType: {StringValue: `${i.ContentType}`},
                Https: {StringValue: `${i.IsHTTPS}`},
                Host: {StringValue: `${i.Host}`},
                Request: {BytesValue: i.RequestRaw},
                Response: {BytesValue: i.ResponseRaw}
            }
        }) as unknown as ExtractableData[],
        "all"
    )
}

export const exportExtractedDataResponse = (responses: FuzzerResponse[], extractedMap) => {
    exportData(
        responses.map((i) => {
            return {
                ExtractedResults: {
                    StringValue:
                        extractedMap && extractedMap.size > 0
                            ? extractedMap.get(i["UUID"]) || "-"
                            : (i?.ExtractedResults || []).map((i) => `${i.Key}: ${i.Value}`).join("|")
                }
            }
        }) as unknown as ExtractableData[],
        "extracted"
    )
}

export const exportPayloadResponse = (responses: FuzzerResponse[]) => {
    exportData(
        responses.map((i) => {
            return {
                Payloads: {StringValue: (i?.Payloads || []).join("|")} as ExtractableValue
            }
        }) as unknown as ExtractableData[],
        "payload"
    )
}
