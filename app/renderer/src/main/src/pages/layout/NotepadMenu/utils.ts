import { isEnpriTrace } from '@/utils/envfile'
import i18n from '@/i18n/i18n' // 你的 i18n 初始化文件路径
const tOriginal = i18n.getFixedT(null, ['yakitRoute'])

export const getNotepadNameByEdition = () => {
  /**只要是企业版就显示云文档，不区分其他 */
  if (isEnpriTrace()) {
    return tOriginal('YakitRoute.cloudDocs')
  } else {
    return tOriginal('YakitRoute.notepad')
  }
}
