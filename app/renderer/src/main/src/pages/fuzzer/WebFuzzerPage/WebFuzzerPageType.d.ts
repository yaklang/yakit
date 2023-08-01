export type WebFuzzerType="config" | "sequence"

export interface WebFuzzerPageProps{
    isHttps?: boolean
    isGmTLS?: boolean
    request?: string
    system?: string
    fuzzerParams?: fuzzerInfoProp
    shareContent?: string
    id: string
}

