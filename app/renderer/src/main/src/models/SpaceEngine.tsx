import React from "react";

export interface SpaceEngineStartParams {
    Type: "zoomeye" | "fofa" | "hunter" | "shodan" | "",
    Filter: string
    MaxPage: number
    MaxRecord: number
    PageSize: number
    ScanBeforeSave: boolean
}

export interface SpaceEngineStatus {
    Type: "zoomeye" | "fofa" | "hunter" | "shodan" | "",
    Status: string
    Info: string
    Raw: Uint8Array
    Used: number
    Remain: number
}

export const getDefaultSpaceEngineStartParams = (): SpaceEngineStartParams => {
    return {Type: "", Filter: "", MaxPage: 10, MaxRecord: 100, PageSize: 10, ScanBeforeSave: false}
}