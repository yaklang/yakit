import { ReactNode } from "react"

export type WebFuzzerType = "config" | "sequence"

export interface WebFuzzerPageProps {
    type: WebFuzzerType
    children?: ReactNode
    // isHttps?: boolean
    // isGmTLS?: boolean
    // request?: string
    // system?: string
    // shareContent?: string
    id?: string
    groupId?: string
}

