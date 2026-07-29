// import {fileToChatQuestionStore, useFileToQuestion} from "@/pages/ai-re-act/aiReActChat/store"
import { YakitRoute } from '@/enums/yakitRoute'
import { getCurrentPageTabRouteKey } from '@/utils/getMainOperatorPageBodyContainer'

enum FileListStoreKey {
  FileList = 'fileList',
  Konwledge = 'konwledge',
}

export const routeKey = {
  [YakitRoute.AI_Agent]: FileListStoreKey.FileList,
  [YakitRoute.AI_REPOSITORY]: FileListStoreKey.Konwledge,
}

export const useGetStoreKey = () => {
  return routeKey[getCurrentPageTabRouteKey()]
}
