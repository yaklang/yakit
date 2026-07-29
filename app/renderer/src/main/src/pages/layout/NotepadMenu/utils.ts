import { isEnpriTrace } from '@/utils/envfile'
import i18n from '@/i18n/i18n'

export const getNotepadNameByEditionMulLang = () => {
  const isEnterprise = isEnpriTrace()
  const baseKey = isEnterprise ? 'cloudDocs' : 'notepad'
  const lang = i18n.language
  switch (baseKey) {
    case 'cloudDocs':
      switch (lang) {
        case 'en':
          return 'Cloud Docs'
        case 'zh-TW':
          return '雲文檔'
        default:
          return '云文档'
      }
    case 'notepad':
      switch (lang) {
        case 'en':
          return 'Notepad'
        case 'zh-TW':
          return '記事本'
        default:
          return '记事本'
      }
    default:
      return ''
  }
}

export const getNotepadManage = () => {
  const baseName = getNotepadNameByEditionMulLang()
  let result: string = ''
  const lang = i18n.language
  switch (lang) {
    case 'en':
      result = `${baseName} Manage`
      break
    default:
      result = `${baseName}管理`
      break
  }
  return result
}

export const getNotepadAdd = () => {
  const baseName = getNotepadNameByEditionMulLang()
  let result: string = ''
  const lang = i18n.language
  switch (lang) {
    case 'en':
      result = `Add ${baseName}`
      break
    default:
      result = `新建${baseName}`
      break
  }
  return result
}
