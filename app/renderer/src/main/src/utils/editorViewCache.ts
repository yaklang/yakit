const PREFIX = 'yakit-editor-view:'

/** 同步读取编辑器视图偏好，供首帧渲染使用；远端配置仍作为最终数据源。 */
export const getEditorViewCache = (key: string): string => {
  if (typeof localStorage === 'undefined') return ''
  try {
    return localStorage.getItem(`${PREFIX}${key}`) || ''
  } catch {
    return ''
  }
}

export const setEditorViewCache = (key: string, value?: string) => {
  if (typeof localStorage === 'undefined') return
  try {
    if (value) localStorage.setItem(`${PREFIX}${key}`, value)
    else localStorage.removeItem(`${PREFIX}${key}`)
  } catch {}
}
