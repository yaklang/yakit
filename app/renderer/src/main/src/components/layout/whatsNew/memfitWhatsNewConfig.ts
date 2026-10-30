import whatsNew1 from './image/whats-new-1.png'
import whatsNew2 from './image/whats-new-2.png'
import whatsNew3 from './image/whats-new-3.png'

export type MemfitWhatsNewItem = {
  title: string
  description: string
  images?: string
}

/**
 * Memfit 更新说明（仅 isMemfit）。
 * 发版时改 enabled / targetVersion / items。
 * 本机版本 >= targetVersion 且本地未确认过该 targetVersion 则弹（跳过该版本直接装更新版也会弹）。
 * 已确认 targetVersion 后再升版本不弹。
 */
export const MEMFIT_WHATS_NEW: {
  enabled: boolean
  targetVersion: string
  items: MemfitWhatsNewItem[]
} = {
  enabled: true,
  targetVersion: '1.1.1-1030',
  items: [
    {
      title: '模型限免',
      description:
        '官方内置的standard模型将于11月2日–6日开启限免活动，活动期间每日Token使用无限制，欢迎师傅们多多使用。',
      images: whatsNew1,
    },
    {
      title: '任务详情页面增加进度看板',
      description: '任务详情页面新增进度看板，可通过看板直观了解任务执行情况与消耗时间',
      images: whatsNew2,
    },
    {
      title: 'Goal模式增加持续时间设置',
      description:
        'Goal模式增加持续时间设置，可以通过设置目标模式的持续时间来增加任务执行的轮次，以便达到更好的执行效果',
      images: whatsNew3,
    },
  ],
}

export const normalizeWhatsNewVersion = (version?: string) => {
  if (!version) return ''
  return `${version}`.trim().replace(/^v/i, '')
}

const parseWhatsNewVersion = (version: string) => {
  const [base, ...rest] = version.split('-')
  const parts = (base || '').split('.').map((item) => parseInt(item, 10) || 0)
  const suffix = rest.join('-')
  const suffixNum = /^\d+$/.test(suffix) ? parseInt(suffix, 10) : Number.NaN
  return { parts, suffix, suffixNum }
}

/** a > b 返回 1，相等 0，a < b 返回 -1 */
export const compareWhatsNewVersion = (a: string, b: string) => {
  const left = parseWhatsNewVersion(normalizeWhatsNewVersion(a))
  const right = parseWhatsNewVersion(normalizeWhatsNewVersion(b))
  const len = Math.max(left.parts.length, right.parts.length)
  for (let i = 0; i < len; i++) {
    const lv = left.parts[i] || 0
    const rv = right.parts[i] || 0
    if (lv !== rv) return lv > rv ? 1 : -1
  }
  const leftHasNum = !Number.isNaN(left.suffixNum)
  const rightHasNum = !Number.isNaN(right.suffixNum)
  if (leftHasNum && rightHasNum) {
    if (left.suffixNum === right.suffixNum) return 0
    return left.suffixNum > right.suffixNum ? 1 : -1
  }
  if (left.suffix === right.suffix) return 0
  if (!left.suffix) return 1
  if (!right.suffix) return -1
  return left.suffix > right.suffix ? 1 : -1
}

export const shouldShowMemfitWhatsNew = (params: {
  isMemfit: boolean
  enabled: boolean
  targetVersion: string
  currentVersion: string
  ackVersion?: string
  items: MemfitWhatsNewItem[]
}) => {
  if (!params.isMemfit || !params.enabled || !params.items?.length) return false
  const current = normalizeWhatsNewVersion(params.currentVersion)
  const target = normalizeWhatsNewVersion(params.targetVersion)
  if (!current || !target) return false
  if (compareWhatsNewVersion(current, target) < 0) return false
  const ack = normalizeWhatsNewVersion(params.ackVersion)
  if (!ack) return true
  return compareWhatsNewVersion(ack, target) < 0
}
