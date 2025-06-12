import React from "react"
import {MITMPage} from "../mitm/MITMPage"
import emiter from "@/utils/eventBus/eventBus"
import {YakitRoute} from "@/enums/yakitRoute"
import MITMContext, {MITMContextStore, MITMVersion} from "../mitm/Context/MITMContext"
import {useCreation} from "ahooks"
import {MITMHackerPageInfoProps} from "@/store/pageInfo"

export interface HTTPHackerProp {}

const HTTPHacker: React.FC<HTTPHackerProp> = (props) => {
    const mitmStore: MITMContextStore = useCreation(() => {
        return {
            version: MITMVersion.V1,
            route: YakitRoute.HTTPHacker
        }
    }, [])
    return (
        <div style={{margin: 0, height: "100%"}}>
            <MITMContext.Provider value={{mitmStore}}>
                <MITMPage />
            </MITMContext.Provider>
        </div>
    )
}

export default HTTPHacker

export const toMITMHacker = (params?: MITMHackerPageInfoProps) => {
    emiter.emit(
        "openPage",
        JSON.stringify({
            route: YakitRoute.MITMHacker,
            params: params
        })
    )
}
