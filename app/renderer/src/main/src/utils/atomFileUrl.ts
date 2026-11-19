const WINDOWS_PATH_RE = /^[A-Za-z]:[\\/]|^\\\\/

/** Windows 盘符/UNC 路径转正斜杠并补前导斜杠，转义 #、?、%，避免被当成网址主机名或被截断；POSIX 保留原始反斜杠。 */
export const toAtomFileUrl = (filePath: string): string => {
  const slashPath = WINDOWS_PATH_RE.test(filePath) ? filePath.replace(/\\/g, '/') : filePath
  const absolute = slashPath.startsWith('/') ? slashPath : `/${slashPath}`
  return `atom://${absolute
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/')}`
}
