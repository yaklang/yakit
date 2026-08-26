import { HotPatchDefaultContent } from '@/defaultConstants/HTTPFuzzerPage'
import { FuzzerRemoteGV } from '@/enums/fuzzer'
import { YakitRoute } from '@/enums/yakitRoute'
import { usePageInfo } from '@/store/pageInfo'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'

const getSharedHotReloadEnabled = async () => {
  try {
    const raw = await getRemoteValue(FuzzerRemoteGV.FuzzerHotCodeSwitchAndCode)
    return raw === 'true'
  } catch (error) {
    return false
  }
}

export const setSharedHotReloadEnabled = (enabled: boolean) => {
  setRemoteValue(FuzzerRemoteGV.FuzzerHotCodeSwitchAndCode, `${enabled}`)
}

export const getWebFuzzerPageList = () => {
  return usePageInfo.getState().pages.get(YakitRoute.HTTPFuzzer)?.pageList || []
}

const getSharedHotReloadOwnerPageInfo = () => {
  const fuzzerPages = getWebFuzzerPageList()
  const owner = fuzzerPages.find((item) => item.pageParamsInfo?.webFuzzerPageInfo?.sharedHotReloadCode)
  return owner?.pageParamsInfo?.webFuzzerPageInfo
}

export const getHotPatchCodeInfo = async () => {
  const sharedHotReloadCode = await getSharedHotReloadEnabled()
  if (!sharedHotReloadCode) {
    return { hotPatchCode: HotPatchDefaultContent, hotPatchOpen: false }
  }

  const ownerPageInfo = getSharedHotReloadOwnerPageInfo()
  if (!ownerPageInfo) {
    setSharedHotReloadEnabled(false)
    return { hotPatchCode: HotPatchDefaultContent, hotPatchOpen: false }
  }

  const disableHotPatch = ownerPageInfo.advancedConfigValue?.disableHotPatch
  const hotPatchOpen = typeof disableHotPatch === 'boolean' ? !disableHotPatch : false
  return {
    hotPatchCode: ownerPageInfo.hotPatchCode || HotPatchDefaultContent,
    hotPatchOpen,
  }
}
