import { YakitRoute } from '@/enums/yakitRoute'
import type { AddYakitScriptPageInfoProps } from '@/store/pageInfo'

export const defaultAddYakitScriptPageInfo: AddYakitScriptPageInfoProps = {
  pluginType: 'yak',
  code: '',
  source: YakitRoute.Plugin_Hub,
}
