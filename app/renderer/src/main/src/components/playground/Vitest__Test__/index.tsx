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

    useEffect(() => {
        setTypeLoading(true)
        if (editorOperationRecord) {
            getRemoteValue(editorOperationRecord)
                .then((data) => {
                    try {
                        setTypeLoading(false)
                        if (!data) return
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

    return <YakitSpin spinning={typeLoading}>vitest test page</YakitSpin>
}

export {Vitest__Test__}
