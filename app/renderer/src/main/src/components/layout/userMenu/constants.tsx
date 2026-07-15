import {
  OutlineDevicemobileIcon,
  OutlineExitIcon,
  OutlineOfficebuildingIcon,
  OutlinePuzzleIcon,
  OutlinePresentationchartlineIcon,
  OutlineQrcodeIcon,
  OutlineShieldexclamationIcon,
  OutlineUserRoundCogIcon,
} from '@/assets/icon/outline'
import { getAllYakitColorVars } from '@/utils/monacoSpec/theme'
import { UserMenuItemType } from '../../CeUserMenu/CeUserMenu'
import type { IMControlBadgeView } from '@/pages/robotControl/status'

/** 随机头像颜色 */
export const randomAvatarColor = () => {
  // const colorArr: string[] = ["#8863F7", "#DA5FDD", "#4A94F8", "#35D8EE", "#56C991", "#F4736B", "#FFB660", "#B4BBCA"]
  const vars = getAllYakitColorVars()
  const var_color_list = [
    '--Colors-Use-Purple-Primary',
    '--Colors-Use-Magenta-Primary',
    '--Colors-Use-Blue-Primary',
    '--Colors-Use-Cyan-Primary',
    '--Colors-Use-Green-Primary',
    '--Colors-Use-Red-Primary',
    '--Colors-Use-Orange-Primary',
    '--Colors-Use-Grey-Primary',
  ]

  const colorArr: string[] = var_color_list.map((it) => vars[it])
  let color: string = colorArr[Math.round(Math.random() * 7)]
  return color
}

export const getMobileControlIconColor = (color: IMControlBadgeView['color']) => {
  switch (color) {
    case 'green':
      return 'var(--Colors-Use-Success-Primary)'
    case 'yellow':
      return 'var(--Colors-Use-Yellow-Primary)'
    case 'red':
      return 'var(--Colors-Use-Error-Primary)'
    case 'gray':
    default:
      return 'var(--Colors-Use-Neutral-Disable)'
  }
}

export const UserMenusMap: Record<string, UserMenuItemType> = {
  divider: { type: 'divider' },
  /** CE用户菜单 */
  singOut: { key: 'sign-out', label: 'FuncDomain.signOut', type: 'danger', icon: <OutlineExitIcon /> },
  pluginAudit: { key: 'plugin-audit', label: 'FuncDomain.pluginAudit', icon: <OutlinePuzzleIcon /> },
  misstatement: { key: 'misstatement', label: 'FuncDomain.misstatement', icon: <OutlineShieldexclamationIcon /> },
  trustList: { key: 'trust-list', label: 'FuncDomain.trustList', icon: <OutlineUserRoundCogIcon /> },
  licenseAdmin: { key: 'license-admin', label: 'FuncDomain.licenseAdmin', icon: <OutlineOfficebuildingIcon /> },
  dataStatistics: {
    key: 'data-statistics',
    label: 'FuncDomain.dataStatistics',
    icon: <OutlinePresentationchartlineIcon />,
  },
  robotControl: {
    key: 'robot-control',
    label: 'FuncDomain.mobileControl',
    icon: <OutlineDevicemobileIcon />,
  },
  /** CE 支付测试 */
  payment: {
    key: 'payment',
    label: 'FuncDomain.payment',
    icon: <OutlineQrcodeIcon />,
  },
  roleAdmin: { key: 'role-admin', label: 'FuncDomain.roleAdmin' },
  accountAdmin: { key: 'account-admin', label: 'FuncDomain.accountAdmin' },
  setPassword: { key: 'set-password', label: 'Main.setPassword' },
  uploadData: { key: 'upload-data', label: 'FuncDomain.uploadData' },
  controlAdmin: { key: 'control-admin', label: 'FuncDomain.controlAdmin' },
  dynamicControl: { key: 'dynamic-control', label: 'FuncDomain.dynamicControl' },
  closeDynamicControl: { key: 'close-dynamic-control', label: 'FuncDomain.closeDynamicControl' },
  holeCollect: { key: 'hole-collect', label: 'FuncDomain.holeCollect' },
  systemConfig: { key: 'system-config', label: 'FuncDomain.systemConfig' },
}
