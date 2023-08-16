import { ReactNode } from "react"

export type WebFuzzerType = "config" | "sequence"

export interface WebFuzzerPageProps {
    children?: ReactNode
    isHttps?: boolean
    isGmTLS?: boolean
    request?: string
    system?: string
    fuzzerParams?: fuzzerInfoProp
    shareContent?: string
    id: string
    groupId: string
}

