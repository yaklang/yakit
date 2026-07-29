/** 轻量工具，避免 ModelInfo 等组件拉取整个 utils 模块 */

export const getModelName = (name: string) => {
  return name?.replace(/^memfit-|-free$/g, '') || ''
}
