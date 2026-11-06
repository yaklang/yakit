import ytrayGuidePreview from './ytray-guide-preview.webp'
import step1Shared from './ytray-guide-step1.webp'
import step2BrowsersMacos from './ytray-guide-step2-browsers-macos.webp'
import step2BrowsersWindows from './ytray-guide-step2-browsers-windows.webp'
import step3NewInstanceMacos from './ytray-guide-step3-new-instance-macos.webp'
import step3NewInstanceWindows from './ytray-guide-step3-new-instance-windows.webp'
import step3LoadPluginMacos from './ytray-guide-step3-load-plugin-macos.webp'
import step3LoadPluginWindows from './ytray-guide-step3-load-plugin-windows.webp'
import step4ExtensionPairMacos from './ytray-guide-step4-extension-pair-macos.webp'
import step4ExtensionPairWindows from './ytray-guide-step4-extension-pair-windows.webp'
import step4ApproveShared from './ytray-guide-step4-approve.webp'

export type GuidePlatform = 'macos' | 'windows'

/** 空态预览图 */
export { ytrayGuidePreview }

/** 步骤 1、步骤 4 最后一张图两端共用；步骤 2–4a 按平台切换 */
const SHARED_GUIDE_IMAGES = {
  step1: step1Shared,
  step4b: step4ApproveShared,
}

export const GUIDE_PLATFORM_IMAGES: Record<GuidePlatform, Record<string, string>> = {
  macos: {
    ...SHARED_GUIDE_IMAGES,
    step2: step2BrowsersMacos,
    step3a: step3NewInstanceMacos,
    step3b: step3LoadPluginMacos,
    step4a: step4ExtensionPairMacos,
  },
  windows: {
    ...SHARED_GUIDE_IMAGES,
    step2: step2BrowsersWindows,
    step3a: step3NewInstanceWindows,
    step3b: step3LoadPluginWindows,
    step4a: step4ExtensionPairWindows,
  },
}
