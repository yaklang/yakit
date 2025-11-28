import {AIQuestionQueueCleared, AIQuestionQueueStatusChange} from "@/pages/ai-re-act/hooks/aiRender"

export interface AITaskUpdateNoticeProps {
    item: AIQuestionQueueStatusChange
}

export interface AITaskClearNoticeProps {
    item: AIQuestionQueueCleared
}
