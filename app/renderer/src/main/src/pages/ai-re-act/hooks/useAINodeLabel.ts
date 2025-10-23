import {useI18nNamespaces} from "@/i18n/useI18nNamespaces"
import {useCreation} from "ahooks"
import {AIOutputI18n} from "./grpcApi"

function useAINodeLabel(params: AIOutputI18n) {
    const {i18n} = useI18nNamespaces([])
    const language = useCreation(() => {
        try {
            return i18n.language.charAt(0).toUpperCase() + i18n.language.slice(1)
        } catch (error) {
            return "Zh"
        }
    }, [i18n.language])
    const nodeLabel = useCreation(() => {
        return params[language]
    }, [language, params])
    return {nodeLabel}
}

export default useAINodeLabel
