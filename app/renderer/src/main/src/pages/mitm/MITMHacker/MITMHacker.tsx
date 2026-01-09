import React, { useEffect } from "react"
import {MITMHackerProps} from "./MITMHackerType"
import {YakitRoute} from "@/enums/yakitRoute"
import {useCreation, useMemoizedFn} from "ahooks"
import {MITMPage} from "../MITMPage"
import MITMContext, {MITMContextStore, MITMVersion} from "../Context/MITMContext"
import { useStore } from "@/store/mitmState"
import emiter from "@/utils/eventBus/eventBus"

const MITMHacker: React.FC<MITMHackerProps> = React.memo((props) => {
    const {tunSessionState} = useStore()
    const mitmStore: MITMContextStore = useCreation(() => {
        return {
            version: MITMVersion.V2,
            route: YakitRoute.MITMHacker
        }
    }, [])

    const onCloseTunHijackByPageFun = useMemoizedFn(()=>{
        // 如若存在Tun劫持服务则需先关闭Tun劫持服务及清空列表后再关闭MITM页面
        if(tunSessionState && tunSessionState.deviceName){
            emiter.emit("onCloseTunHijackConfirmModal", "page")    
        }else{
            emiter.emit("closePage", JSON.stringify({route: YakitRoute.MITMHacker}))
        }
    })

    useEffect(()=>{
        emiter.on("onCloseTunHijackByPage", onCloseTunHijackByPageFun)
        return ()=>{
            emiter.off("onCloseTunHijackByPage", onCloseTunHijackByPageFun)
        }
    },[tunSessionState?.deviceName])

    return (
        <MITMContext.Provider value={{mitmStore}}>
            <MITMPage />
        </MITMContext.Provider>
    )
})

export default MITMHacker
