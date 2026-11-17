/** Windows 盘符前补斜杠，并转义 #、?、%，避免被当成网址主机名或被截断。 */
export const toAtomFileUrl = (filePath: string): string => {
  const slashPath = filePath.replace(/\\/g, '/')
  const absolute = slashPath.startsWith('/') ? slashPath : `/${slashPath}`
  return `atom://${absolute
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/')}`
}
