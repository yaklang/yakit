import {YakitResizeBoxProps} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
import {useCreation} from "ahooks"
import {useRef, useState} from "react"
import {AITabsEnumType} from "../../aiAgentType"
import {AITabsEnum} from "../../defaultConstant"
import type {UseTaskChatState} from "@/pages/ai-re-act/hooks/type"

type ResizeBoxProps = Omit<YakitResizeBoxProps, "firstNode" | "secondNode">

type ResizeBoxOverride = Partial<ResizeBoxProps>

interface Params {
    activeKey?: AITabsEnumType
    showFreeChat: boolean
    timeLine: boolean
    taskChat: UseTaskChatState
}

export function useAIChatResizeBox(params: Params) {
    const overrideRef = useRef<ResizeBoxOverride | null>(null)
    const [version, setVersion] = useState(0)

    const emitResizeBox = (override: ResizeBoxOverride | null) => {
        overrideRef.current = override
        setVersion((v) => v + 1)
    }

    const resizeBoxProps = useCreation<ResizeBoxProps>(() => {
        const {activeKey, showFreeChat, timeLine, taskChat} = params
        let override = overrideRef.current
        // 消费一次就清掉
        overrideRef.current = null
        if (!activeKey) {
            return {
                firstNodeStyle: {display: "none"},
                secondRatio: "100%",
                lineStyle: {display: "none"},
                secondNodeStyle: {width: "100%", padding: 0},
                ...override
            }
        }
        // const isFileSystemKey = activeKey === AITabsEnum.File_System
        // const isTaskContentKey = activeKey === AITabsEnum.Task_Content
        const isTaskStreamsEmpty = taskChat.elements?.length <= 0

        let secondRatio: ResizeBoxProps["secondRatio"]
        let firstRatio: ResizeBoxProps["firstRatio"]

        if (showFreeChat) {
            // if (isFileSystemKey) {
            //     secondRatio = "60%"
            // } else if (isTaskContentKey && isTaskStreamsEmpty) {
            //     secondRatio = "80%"
            // } else {
            // secondRatio = "432px"
            // }
            if(!isTaskStreamsEmpty){
                secondRatio = "432px"
            }else{
              firstRatio = "300px"
            }
        }
        // if (isTaskContentKey && isTaskStreamsEmpty) {
        //     firstRatio = timeLine ? "30%" : "30"
        //     firstRatio = undefined
        // }

        const computed: ResizeBoxProps = {
            freeze: showFreeChat,
            firstRatio,
            firstMinSize: showFreeChat ? 30 : 400,
            secondMinSize: showFreeChat ? 400 : 30,
            secondRatio,
            lineDirection: "left",
            // lineStyle: showFreeChat ? {backgroundColor: "var(--Colors-Use-Neutral-Bg)"} : undefined,
            firstNodeStyle: {
                padding: 0,
                ...(!showFreeChat && {width: "100%"}),
                ...(!timeLine && isTaskStreamsEmpty && {width: 30})
            },
            secondNodeStyle: {
                padding: 0,
                ...(!showFreeChat && {minWidth: 30, maxWidth: 30}),
                ...(!timeLine &&
                    isTaskStreamsEmpty && {
                        width: "calc(100% - 30px)"
                    })
            }
        }

        return {
            ...computed,
            ...override
        }
    }, [params.activeKey, params.showFreeChat, params.timeLine, params.taskChat.elements?.length, version])

    return {
        resizeBoxProps,
        emitResizeBox
    }
}
