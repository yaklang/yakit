export interface YChangeProps {
    user: string | null
    type: "removed" | "added" | null
    color: {light: string; dark: string} | null
}