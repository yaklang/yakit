import React from "react"
import {MITMHackerProps} from "./MITMHackerType"
import {YakitRoute} from "@/enums/yakitRoute"
import {useCreation} from "ahooks"
import {MITMPage} from "../MITMPage"
import MITMContext, {MITMContextStore, MITMVersion} from "../Context/MITMContext"

const MITMHacker: React.FC<MITMHackerProps> = React.memo((props) => {
    const mitmStore: MITMContextStore = useCreation(() => {
        return {
            version: MITMVersion.V2,
            route: YakitRoute.MITMHacker
        }
    }, [])
    return (
        <MITMContext.Provider value={{mitmStore}}>
            <MITMPage />
        </MITMContext.Provider>
    )
})

export default MITMHacker
