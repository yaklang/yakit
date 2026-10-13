import escapeRegExp from 'lodash/escapeRegExp'

/**
 * 从内网安装包路径解析版本号（带 v 前缀）。
 * 优先按当前发行版名匹配，失败时回退 EnpriTrace- 以兼容旧企业包名；无匹配返回空串。
 */
export const parseIntranetYakitVersionFromPath = (filePath: string, editionNameRaw: string): string => {
  const editionName = escapeRegExp(editionNameRaw.replace(/\s+/g, ''))
  const match = filePath.match(new RegExp(`${editionName}-([\\d.-]+)`)) || filePath.match(/EnpriTrace-([\d.-]+)/)
  const version = match ? match[1] : ''
  const cleanVersion = version.replace(/-$/, '')
  return cleanVersion ? `v${cleanVersion}` : ''
}
