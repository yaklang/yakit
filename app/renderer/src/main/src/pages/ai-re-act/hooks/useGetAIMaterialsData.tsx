import {useCreation, useMemoizedFn} from "ahooks"
import {GetRandomAIMaterialsResponse} from "./grpcApi"
import {ReactNode, useEffect, useState} from "react"
import {grpcGetRandomAIMaterials} from "@/pages/ai-agent/grpc"
import {AIMaterialsData, RandomAIMaterialsDataProps} from "@/pages/ai-agent/aiChatWelcome/type"
import {
    AIForgeIcon,
    AIKnowledgeBaseIcon,
    AIToolIcon,
    HoverAIForgeIcon,
    HoverAIKnowledgeBaseIcon,
    HoverAIToolIcon
} from "../../ai-agent/aiChatWelcome/icon"
export interface AIRecommendIconByType {
    icon: ReactNode
    hoverIcon: ReactNode
}
export const getAIRecommendIconByType = (type: string) => {
    let icons: AIRecommendIconByType = {
        icon: null,
        hoverIcon: null
    }
    switch (type) {
        case "工具":
            icons.icon = <AIToolIcon />
            icons.hoverIcon = <HoverAIToolIcon />
            break
        case "技能":
            icons.icon = <AIForgeIcon />
            icons.hoverIcon = <HoverAIForgeIcon />
            break
        case "知识库":
            icons.icon = <AIKnowledgeBaseIcon />
            icons.hoverIcon = <HoverAIKnowledgeBaseIcon />
            break
        default:
            break
    }
    return icons
}

interface UseGetAIMaterialsData {
    randomAIMaterials?: GetRandomAIMaterialsResponse
    randomAIMaterialsData: RandomAIMaterialsDataProps
    loadingAIMaterials: boolean
}
interface UseGetAIMaterialsDataEvents {
    onRefresh: () => void
}
function useGetAIMaterialsData(): [UseGetAIMaterialsData, UseGetAIMaterialsDataEvents]

function useGetAIMaterialsData() {
    const [randomAIMaterials, setRandomAIMaterials] = useState<GetRandomAIMaterialsResponse>()
    const [loadingAIMaterials, setLoadingAIMaterials] = useState<boolean>(false)

    useEffect(() => {
        getRandomAIMaterials()
    }, [])

    const getRandomAIMaterials = useMemoizedFn(() => {
        if (loadingAIMaterials) return
        setLoadingAIMaterials(true)
        grpcGetRandomAIMaterials({Limit: 3})
            .then((res) => {
                setRandomAIMaterials(res)
            })
            .finally(() =>
                setTimeout(() => {
                    setLoadingAIMaterials(false)
                }, 200)
            )
    })
    const randomAIMaterialsData: RandomAIMaterialsDataProps = useCreation(() => {
        const tools: AIMaterialsData = {
            type: "工具",
            mentionType: "tool",
            data: (randomAIMaterials?.AITools || []).map((tool) => ({
                type: "工具",
                name: tool.VerboseName || tool.Name,
                description: tool.Description || ""
            }))
        }
        const forges: AIMaterialsData = {
            type: "技能",
            mentionType: "forge",
            data: (randomAIMaterials?.AIForges || []).map((forge) => ({
                type: "技能",
                name: forge.ForgeVerboseName || forge.ForgeName,
                description: forge.Description || ""
            }))
        }
        const knowledgeBases: AIMaterialsData = {
            type: "知识库",
            mentionType: "knowledgeBase",
            data: (randomAIMaterials?.KnowledgeBaseEntries || []).map((knowledgeBase) => ({
                type: "知识库",
                name: knowledgeBase.KnowledgeTitle || knowledgeBase.Summary,
                description: knowledgeBase.KnowledgeDetails || ""
            }))
        }
        return {
            tools,
            forges,
            knowledgeBases
        }
    }, [randomAIMaterials])
    const data: UseGetAIMaterialsData = useCreation(() => {
        return {
            randomAIMaterials,
            randomAIMaterialsData,
            loadingAIMaterials
        }
    }, [randomAIMaterials, randomAIMaterialsData, loadingAIMaterials])

    const onRefresh = useMemoizedFn(() => {
        getRandomAIMaterials()
    })

    const event: UseGetAIMaterialsDataEvents = useCreation(() => {
        return {
            onRefresh
        }
    }, [])

    return [data, event] as const
}

export default useGetAIMaterialsData
