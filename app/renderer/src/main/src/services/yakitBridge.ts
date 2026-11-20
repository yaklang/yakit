/** 主窗口与 link 窗口共用的 preload bridge 读取入口 */
export const getYakitBridge = (): YakitBridge | undefined => window.yakitBridge
