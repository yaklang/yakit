import {OperationRecordRes} from "@/components/yakitUI/YakitEditor/YakitEditorType"
import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {getRemoteValue} from "@/utils/kv"
import {useSafeState} from "ahooks"
import {FC, useEffect} from "react"

interface VitestTestProps {
    editorOperationRecord?: string
}

const Vitest__Test__: FC<VitestTestProps> = (props) => {
    const {editorOperationRecord} = props
    const [typeLoading, setTypeLoading] = useSafeState<boolean>(true)
    const [fontSize, setFontSize] = useSafeState<undefined | number>(12)
    const [showLineBreaks, setShowLineBreaks] = useSafeState<boolean>(true)
    const [noWordwrap, setNoWordwrap] = useSafeState(false)

    useEffect(() => {
        setTypeLoading(true)
        if (editorOperationRecord) {
            getRemoteValue(editorOperationRecord)
                .then((data) => {
                    try {
                        setTypeLoading(false)
                        if (!data) return
                        let obj: OperationRecordRes = JSON.parse(data)
                        if (obj?.fontSize) {
                            setFontSize(obj?.fontSize)
                        }
                        if (typeof obj?.showBreak === "boolean") {
                            setShowLineBreaks(obj?.showBreak)
                        }
                        if (typeof obj?.noWordWrap === "boolean") {
                            setNoWordwrap(obj?.noWordWrap)
                        }
                    } catch (error) {
                        setTypeLoading(false)
                        fail(error + "")
                    }
                })
                .finally(() => {
                    setTypeLoading(false)
                })
        } else {
            setTypeLoading(true)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editorOperationRecord])

    return (
        <YakitSpin spinning={typeLoading}>
            <div>Vitest__Test__</div>
        </YakitSpin>
    )
}

export {Vitest__Test__}
