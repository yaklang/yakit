export interface SmokingEvaluateResult {
    Item: string
    Suggestion: string
    ExtraInfo: Uint8Array
}

export interface SmokingEvaluateResponse {
    Score: number
    Results: SmokingEvaluateResult[]
}
