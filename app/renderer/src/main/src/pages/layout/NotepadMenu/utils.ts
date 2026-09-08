import { isEnpriTrace } from '@/utils/envfile'
import i18n from '@/i18n/i18n'
import emiter from '@/utils/eventBus/eventBus'
import { YakitRoute } from '@/enums/yakitRoute'
import { defaultNoteFilter } from '@/defaultConstants/ModifyNotepad'
import { genDefaultPagination } from '@/pages/invoker/schema'
import { grpcQueryNote } from '@/pages/notepadManage/notepadManage/utils'

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

/** 打开最近编辑的记事本，若无则新建 */
export const openLatestOrNewNotepad = () => {
  grpcQueryNote({
    Filter: { ...defaultNoteFilter },
    Pagination: { ...genDefaultPagination(1), OrderBy: 'updated_at', Page: 1 },
  })
    .then((res) => {
      if (res.Data && res.Data.length > 0) {
        const latestNote = res.Data[0]
        emiter.emit(
          'openPage',
          JSON.stringify({
            route: YakitRoute.Modify_Notepad,
            params: { notepadHash: `${latestNote.Id}`, title: latestNote.Title },
          }),
        )
      } else {
        emiter.emit(
          'openPage',
          JSON.stringify({
            route: YakitRoute.Modify_Notepad,
            params: { notepadHash: '' },
          }),
        )
      }
    })
    .catch(() => {
      emiter.emit('openPage', JSON.stringify({ route: YakitRoute.Modify_Notepad }))
    })
}
