export interface HTTPHeader {
    Header: string
    Value: string
}

export interface HTTPCookieSetting {
    Key: string
    Value: string
    Path: string
    Domain: string
    Expires: number
    MaxAge: number
    Secure: boolean
    HttpOnly: boolean
    SameSiteMode: "default" | "lax" | "strict" | "none"
}