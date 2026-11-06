/** @ mention 与 / ModeSlash：先打开的弹层占有，后触发的只当筛选，不抢占切换 */

export type MilkdownPopupKind = 'mention' | 'modeSlash'

let active: MilkdownPopupKind | null = null
let activeOwner: object | undefined

/** 尝试占有弹层。已被另一方占用时返回 false（调用方应保持自身关闭） */
export function tryClaimMilkdownPopup(kind: MilkdownPopupKind, owner?: object): boolean {
  if (active !== null && (active !== kind || activeOwner !== owner)) return false
  active = kind
  activeOwner = owner
  return true
}

/** 弹层关闭时释放占有 */
export function releaseMilkdownPopup(kind: MilkdownPopupKind, owner?: object): void {
  if (active === kind && (!owner || activeOwner === owner)) {
    active = null
    activeOwner = undefined
  }
}
