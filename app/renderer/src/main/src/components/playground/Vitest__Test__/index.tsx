import {YakitSpin} from "@/components/yakitUI/YakitSpin/YakitSpin"
import {getRemoteValue} from "@/utils/kv"
import {useSafeState} from "ahooks"
import {FC, useEffect} from "react"
import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"

interface VitestTestProps {
    editorOperationRecord?: string
}

const Vitest__Test__: FC<VitestTestProps> = (props) => {
    const {editorOperationRecord} = props
    const {t} = useI18nNamespaces(["playground"])
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
                        console.error(error)
                    }
                })
                .finally(() => {
                    setTypeLoading(false)
                })
        } else {
            setTypeLoading(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editorOperationRecord])

    return <YakitSpin spinning={typeLoading}>{t("Vitest__Test__.page")}</YakitSpin>
}

export {Vitest__Test__}
