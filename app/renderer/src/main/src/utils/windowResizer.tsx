export const hookWindowResize = (f: (e: UIEvent) => any) => {
  // 修复 editor 的 resize 问题
  const origin = window.onresize
  window.onresize = (e) => {
    f(e)
    // @ts-expect-error 类型定义不完整，需要忽略此行
    if (origin) origin(e)
  }
  return () => {
    window.onresize = origin
  }
}
