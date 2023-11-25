import React from "react";

export interface SpaceEngineStartParams {
    Type: "zoomeye" | "fofa" | "hunter" | "shodan" | "",
    Filter: string
    MaxPage: number
    MaxRecord: number
    PageSize: number
    ScanBeforeSave: boolean
}

export const getDefaultSpaceEngineStartParams = (): SpaceEngineStartParams => {
    return {Type: "", Filter: "", MaxPage: 10, MaxRecord: 100, PageSize: 10, ScanBeforeSave: false}
}