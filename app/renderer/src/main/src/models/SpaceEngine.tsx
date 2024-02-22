import React from "react"

export interface SpaceEngineStartParams {
    Type: "zoomeye" | "fofa" | "hunter" | "shodan" | "quake" | ""
    Filter: string
    MaxPage: number
    MaxRecord: number
    PageSize: number
    ScanBeforeSave: boolean
    Concurrent:number
}
export interface SpaceEngineStatus {
    Type: "zoomeye" | "fofa" | "hunter" | "shodan" | "quake" | ""
    Status: "normal" | "error" | "empty_key" | "invalid_type" | ""
    Info: string
    Raw: Uint8Array
    Used: number
    Remain: number
}

export const getDefaultSpaceEngineStartParams = (): SpaceEngineStartParams => {
    return {Type: "", Filter: "", MaxPage: 10, MaxRecord: 100, PageSize: 100, ScanBeforeSave: false,Concurrent:20}
}