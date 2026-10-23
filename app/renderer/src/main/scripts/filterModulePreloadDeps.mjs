/** 从 HTML modulepreload 去掉 Monaco；编辑器首次打开再加载。 */
const HEAVY_MODULE_PRELOAD =
  /(?:^|\/)(?:vendor-monaco|monaco-editor|react-monaco-editor|editor\.worker|json\.worker|css\.worker|html\.worker|ts\.worker)[^/]*$/

export function filterModulePreloadDeps(deps) {
  if (!Array.isArray(deps)) return []
  return deps.filter((dep) => {
    if (typeof dep !== 'string') return false
    const path = dep.split('?')[0].split('#')[0]
    return !HEAVY_MODULE_PRELOAD.test(path)
  })
}
