import React from "react"
import {MITMPage} from "../mitm/MITMPage"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import emiter from "@/utils/eventBus/eventBus"
import {YakitRoute} from "@/enums/yakitRoute"
import MITMContext, {MITMContextStore, MITMVersion} from "../mitm/Context/MITMContext"
import {useCreation} from "ahooks"

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
            <YakitButton
                style={{position: "absolute", top: 24, right: 24, zIndex: 9}}
                onClick={() => {
                    emiter.emit(
                        "openPage",
                        JSON.stringify({
                            route: YakitRoute.MITMHacker,
                            params: {
                                immediatelyLaunchedInfo: {
                                    host: "11",
                                    port: "22",
                                    enableInitialPlugin: true
                                }
                            }
                        })
                    )
                }}
            >
                MITM 劫持 v2
            </YakitButton>
            <MITMContext.Provider value={{mitmStore}}>
                <MITMPage />
            </MITMContext.Provider>
        </div>
    )
}

export default HTTPHacker
