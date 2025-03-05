import {CSSProperties} from "react"
export interface YChangeProps {
    user: string | null
    type: "removed" | "added" | null
    color: {light: string; dark: string} | null
    diffWrapClassName?: string
    diffWrapStyle?: CSSProperties
}
