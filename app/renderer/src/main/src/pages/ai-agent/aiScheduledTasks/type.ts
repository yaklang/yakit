export interface AIScheduledTasksProps {
  /**
   * 外层侧栏是否展开可见；侧栏收起是 width:0 折叠（IntersectionObserver 仍视为相交），
   * useInViewport 感知不到收起/展开，需父级显式传入以在重新可见时刷新列表
   */
  visible?: boolean
}
