import {useMemo} from "react"
import {fetchEnv} from "@/utils/envfile"
import {useTheme} from "@/hook/useTheme"

import YakitLightSearchEmpty from "@/assets/EmptyImage/YakitLightSearchEmpty.png"
import YakitDarkSearchEmpty from "@/assets/EmptyImage/YakitDarkSearchEmpty.png"
import IrifyLightSearchEmpty from "@/assets/EmptyImage/IrifyLightSearchEmpty.png"
import IrifyDarkSearchEmpty from "@/assets/EmptyImage/IrifyDarkSearchEmpty.png"
import MemfitLightSearchEmpty from "@/assets/EmptyImage/MemfitLightSearchEmpty.png"
import MemfitDarkSearchEmpty from "@/assets/EmptyImage/MemfitDarkSearchEmpty.png"

import YakitLightNetworkEmpty from "@/assets/EmptyImage/YakitLightNetworkEmpty.png"
import YakitDarkNetworkEmpty from "@/assets/EmptyImage/YakitDarkNetworkEmpty.png"
import IrifyLightNetworkEmpty from "@/assets/EmptyImage/IrifyLightNetworkEmpty.png"
import IrifyDarkNetworkEmpty from "@/assets/EmptyImage/IrifyDarkNetworkEmpty.png"
import MemfitLightNetworkEmpty from "@/assets/EmptyImage/MemfitLightNetworkEmpty.png"
import MemfitDarkNetworkEmpty from "@/assets/EmptyImage/MemfitDarkNetworkEmpty.png"

import YakitLightServerEmpty from "@/assets/EmptyImage/YakitLightServerEmpty.png"
import YakitDarkServerEmpty from "@/assets/EmptyImage/YakitDarkServerEmpty.png"
import IrifyLightServerEmpty from "@/assets/EmptyImage/IrifyLightServerEmpty.png"
import IrifyDarkServerEmpty from "@/assets/EmptyImage/IrifyDarkServerEmpty.png"
import MemfitLightServerEmpty from "@/assets/EmptyImage/MemfitLightServerEmpty.png"
import MemfitDarkServerEmpty from "@/assets/EmptyImage/MemfitDarkServerEmpty.png"

import YakitLightPowerEmpty from "@/assets/EmptyImage/YakitLightPowerEmpty.png"
import YakitDarkPowerEmpty from "@/assets/EmptyImage/YakitDarkPowerEmpty.png"
import IrifyLightPowerEmpty from "@/assets/EmptyImage/IrifyLightPowerEmpty.png"
import IrifyDarkPowerEmpty from "@/assets/EmptyImage/IrifyDarkPowerEmpty.png"
import MemfitLightPowerEmpty from "@/assets/EmptyImage/MemfitLightPowerEmpty.png"
import MemfitDarkPowerEmpty from "@/assets/EmptyImage/MemfitDarkPowerEmpty.png"

import YakitLightEmpty from "@/assets/EmptyImage/YakitLightEmpty.png"
import YakitDarkEmpty from "@/assets/EmptyImage/YakitDarkEmpty.png"
import IrifyLightEmpty from "@/assets/EmptyImage/IrifyLightEmpty.png"
import IrifyDarkEmpty from "@/assets/EmptyImage/IrifyDarkEmpty.png"
import MemfitLightEmpty from "@/assets/EmptyImage/MemfitLightEmpty.png"
import MemfitDarkEmpty from "@/assets/EmptyImage/MemfitDarkEmpty.png"

import YakitLightScreenRecordingEmpty from "@/assets/EmptyImage/YakitLightScreenRecordingEmpty.png"
import YakitDarkScreenRecordingEmpty from "@/assets/EmptyImage/YakitDarkScreenRecordingEmpty.png"
import IrifyLightScreenRecordingEmpty from "@/assets/EmptyImage/IrifyLightScreenRecordingEmpty.png"
import IrifyDarkScreenRecordingEmpty from "@/assets/EmptyImage/IrifyDarkScreenRecordingEmpty.png"
import MemfitLightScreenRecordingEmpty from "@/assets/EmptyImage/MemfitLightScreenRecordingEmpty.png"
import MemfitDarkScreenRecordingEmpty from "@/assets/EmptyImage/MemfitDarkScreenRecordingEmpty.png"

type EmptyImageType = "network" | "server" | "power" | "empty" | "search" | "screenRecording"

type ImageMap = Record<
    EmptyImageType,
    {
        light: string
        dark: string
    }
>

const yakitMap: ImageMap = {
    search: {
        light: YakitLightSearchEmpty,
        dark: YakitDarkSearchEmpty
    },
    network: {
        light: YakitLightNetworkEmpty,
        dark: YakitDarkNetworkEmpty
    },
    server: {
        light: YakitLightServerEmpty,
        dark: YakitDarkServerEmpty
    },
    power: {
        light: YakitLightPowerEmpty,
        dark: YakitDarkPowerEmpty
    },
    empty: {
        light: YakitLightEmpty,
        dark: YakitDarkEmpty
    },
    screenRecording: {
        light: YakitLightScreenRecordingEmpty,
        dark: YakitDarkScreenRecordingEmpty
    }
}

const irifyMap: ImageMap = {
    search: {
        light: IrifyLightSearchEmpty,
        dark: IrifyDarkSearchEmpty
    },
    network: {
        light: IrifyLightNetworkEmpty,
        dark: IrifyDarkNetworkEmpty
    },
    server: {
        light: IrifyLightServerEmpty,
        dark: IrifyDarkServerEmpty
    },
    power: {
        light: IrifyLightPowerEmpty,
        dark: IrifyDarkPowerEmpty
    },
    empty: {
        light: IrifyLightEmpty,
        dark: IrifyDarkEmpty
    },
    screenRecording: {
        light: IrifyLightScreenRecordingEmpty,
        dark: IrifyDarkScreenRecordingEmpty
    }
}

const memfitMap: ImageMap = {
    search: {
        light: MemfitLightSearchEmpty,
        dark: MemfitDarkSearchEmpty
    },
    network: {
        light: MemfitLightNetworkEmpty,
        dark: MemfitDarkNetworkEmpty
    },
    server: {
        light: MemfitLightServerEmpty,
        dark: MemfitDarkServerEmpty
    },
    power: {
        light: MemfitLightPowerEmpty,
        dark: MemfitDarkPowerEmpty
    },
    empty: {
        light: MemfitLightEmpty,
        dark: MemfitDarkEmpty
    },
    screenRecording: {
        light: MemfitLightScreenRecordingEmpty,
        dark: MemfitDarkScreenRecordingEmpty
    }
}

export const useEmptyImage = (type: EmptyImageType) => {
    const {theme} = useTheme()
    const env = fetchEnv()

    return useMemo(() => {
        let map: ImageMap

        switch (env) {
            case "irify":
            case "irify-enterprise":
                map = irifyMap
                break

            case "memfit":
                map = memfitMap
                break

            default:
                map = yakitMap
        }

        return map?.[type]?.[theme] ?? yakitMap.empty["light"]
    }, [type, theme, env])
}
