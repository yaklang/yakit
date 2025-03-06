import React, {useMemo} from "react"
import {YakitResizeBox} from "../yakitUI/YakitResizeBox/YakitResizeBox"
import {NewHTTPPacketEditor} from "@/utils/editors"

export interface OpenPacketNewWindowItem {
    request?: {
        [key: string]: any
    }
    response?: {
        [key: string]: any
    }
}
interface OpenPacketNewWindowProps {
    data: OpenPacketNewWindowItem
}
const OpenPacketNewWindow: React.FC<OpenPacketNewWindowProps> = (props) => {
    const {data} = props

    const reqOriginValue = useMemo(() => {
        return data?.request?.originValue || ""
    }, [data])

    const resOriginValue = useMemo(() => {
        return data?.response?.originValue || ""
    }, [data])

    const reqEditor = () => {
        return (
            <NewHTTPPacketEditor
                originValue={reqOriginValue}
                simpleMode={true}
                noModeTag={true}
                readOnly={true}
                noMinimap={true}
                onlyBasicMenu={true}
            />
        )
    }

    const resEditor = () => {
        return (
            <NewHTTPPacketEditor
                originValue={resOriginValue}
                originalPackage={data?.response?.originalPackage}
                isResponse={true}
                simpleMode={true}
                noModeTag={true}
                readOnly={true}
                noMinimap={true}
                onlyBasicMenu={true}
            />
        )
    }

    if (reqOriginValue && resOriginValue) {
        return (
            <YakitResizeBox
                firstNode={reqEditor()}
                secondNode={resEditor()}
                firstMinSize={300}
                secondMinSize={300}
            ></YakitResizeBox>
        )
    } else if (reqOriginValue) {
        return reqEditor()
    } else if (resOriginValue) {
        return resEditor()
    } else {
        // 请求 响应都没有 默认展示个空编辑器
        return (
            <NewHTTPPacketEditor
                originValue={""}
                simpleMode={true}
                noModeTag={true}
                readOnly={true}
                noMinimap={true}
                onlyBasicMenu={true}
            />
        )
    }
}

export default OpenPacketNewWindow
