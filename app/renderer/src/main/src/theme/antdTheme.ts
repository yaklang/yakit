import { createElement, useMemo, type ReactNode } from 'react'
import { ConfigProvider, type ThemeConfig } from 'antd'
import { getAllYakitColorVars } from '@/utils/yakitColorVars'
import { useTheme } from '@/hook/useTheme'

/**
 * 用 Yakit CSS 变量驱动 antd 5 Token。
 * hashed: false 方便现有 scss 覆盖；cssVar: true 让下拉等 portal 也能吃到 html 上的 --ant-*。
 *
 * 主色 / 成功 / 警告 / 错误必须用颜色系统解析后的 hex：
 * antd palette 算法解析不了 var()，会算成 #000000。
 *
 * 注意：主渲染端与 Link 端各有一份，主题调整时同步修改两处。
 * 必须按当前主题现算，不能在模块加载时冻结：入口先 import 本文件、后 import useTheme，
 * 此时 dataset.theme 尚未设置；IRify/Memfit 的 GetMainColor 亮暗 hex 不同，
 * .yakit cssVar 还会压过 html 上的 --ant-color-primary。
 */
export function getYakitAntdTheme(theme?: Parameters<typeof getAllYakitColorVars>[0]): ThemeConfig {
  const colors = getAllYakitColorVars(theme)
  return {
    cssVar: { key: 'yakit' },
    hashed: false,
    token: {
      colorPrimary: colors['--Colors-Use-Main-Primary'],
      colorPrimaryHover: 'var(--Colors-Use-Main-Hover)',
      colorPrimaryActive: 'var(--Colors-Use-Main-Pressed)',
      colorPrimaryBg: 'var(--Colors-Use-Main-Bg)',
      colorSuccess: colors['--Colors-Use-Success-Primary'],
      colorSuccessBg: 'var(--Colors-Use-Success-Bg)',
      colorSuccessBorder: 'var(--Colors-Use-Success-Border)',
      colorWarning: colors['--Colors-Use-Warning-Primary'],
      colorWarningBg: 'var(--Colors-Use-Warning-Bg)',
      colorWarningBorder: 'var(--Colors-Use-Warning-Border)',
      colorError: colors['--Colors-Use-Error-Primary'],
      colorInfo: colors['--Colors-Use-Blue-Primary'],
      colorInfoBg: 'var(--Colors-Use-Blue-Bg)',
      colorInfoBorder: 'var(--Colors-Use-Blue-Border)',
      colorText: 'var(--Colors-Use-Neutral-Text-1-Title)',
      colorTextSecondary: 'var(--Colors-Use-Neutral-Text-2-Primary)',
      colorTextTertiary: 'var(--Colors-Use-Neutral-Text-3-Secondary)',
      colorTextQuaternary: 'var(--Colors-Use-Neutral-Text-4-Help-text)',
      colorTextHeading: 'var(--Colors-Use-Neutral-Text-1-Title)',
      colorTextDescription: 'var(--Colors-Use-Neutral-Text-3-Secondary)',
      colorTextDisabled: 'var(--Colors-Use-Neutral-Disable)',
      colorTextPlaceholder: 'var(--Colors-Use-Neutral-Disable)',
      colorBgContainer: 'var(--Colors-Use-Basic-Background)',
      colorBgElevated: 'var(--Colors-Use-Basic-Background)',
      colorBgLayout: 'var(--Colors-Use-Neutral-Bg)',
      colorBgSpotlight: 'var(--Colors-Use-Neutral-Text-1-Title)',
      colorBorder: 'var(--Colors-Use-Neutral-Border)',
      colorBorderSecondary: 'var(--Colors-Use-Neutral-Border)',
      colorSplit: 'var(--Colors-Use-Neutral-Border)',
      colorFill: 'var(--Colors-Use-Neutral-Bg-Hover)',
      colorFillSecondary: 'var(--Colors-Use-Neutral-Bg-Hover)',
      colorFillTertiary: 'var(--Colors-Use-Neutral-Bg)',
      colorFillQuaternary: 'var(--Colors-Use-Neutral-Bg)',
      colorIcon: 'var(--Colors-Use-Neutral-Text-3-Secondary)',
      colorIconHover: 'var(--Colors-Use-Neutral-Text-1-Title)',
      controlItemBgHover: 'var(--Colors-Use-Neutral-Bg-Hover)',
      controlItemBgActive: 'var(--Colors-Use-Main-Bg)',
      controlOutline: 'var(--Colors-Use-Main-Focus)',
      colorLink: 'var(--Colors-Use-Main-Primary)',
      colorLinkHover: 'var(--Colors-Use-Main-Hover)',
      colorLinkActive: 'var(--Colors-Use-Main-Pressed)',
      colorErrorBorder: 'var(--Colors-Use-Error-Border)',
      colorErrorBg: 'var(--Colors-Use-Error-Bg)',
      colorErrorHover: 'var(--Colors-Use-Error-Hover)',
      colorTextLightSolid: 'var(--Colors-Use-Main-On-Primary)',
      colorWhite: 'var(--Colors-Use-Basic-White)',
      borderRadius: 4,
      // 对齐 antd 4：正文 14px / 行高 22px。Yakit 控件自己的 12px 仍由组件 scss 覆盖
      fontSize: 14,
      lineHeight: 22 / 14,
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'",
    },
    components: {
      Form: {
        fontSize: 14,
        labelFontSize: 14,
        labelHeight: 32,
        labelColor: 'var(--Colors-Use-Neutral-Text-1-Title)',
        itemMarginBottom: 16,
        verticalLabelPadding: '0 0 8px',
        labelColonMarginInlineStart: 2,
        labelColonMarginInlineEnd: 8,
      },
      Button: {
        // antd 4 / Yakit 中号按钮图标与文字间距为 4px，antd 5 默认 8px
        iconGap: 4,
      },
      Input: {
        hoverBorderColor: 'var(--Colors-Use-Main-Hover)',
        activeBorderColor: 'var(--Colors-Use-Main-Hover)',
        addonBg: 'var(--Colors-Use-Neutral-Bg)',
      },
      Select: {
        optionSelectedBg: 'var(--Colors-Use-Main-Bg)',
        optionSelectedColor: 'var(--Colors-Use-Main-Primary)',
      },
      Tree: {
        // 对齐 antd 4：缩进 18px，节点高度 24px（antd 5 默认 indentSize = titleHeight = 24）
        indentSize: 18,
        titleHeight: 24,
        nodeHoverBg: 'var(--Colors-Use-Neutral-Bg-Hover)',
        nodeSelectedBg: 'var(--Colors-Use-Main-Primary)',
        nodeSelectedColor: 'var(--Colors-Use-Main-On-Primary)',
        directoryNodeSelectedBg: 'var(--Colors-Use-Main-Primary)',
        directoryNodeSelectedColor: 'var(--Colors-Use-Main-On-Primary)',
      },
      Table: {
        headerBg: 'var(--Colors-Use-Neutral-Bg-Hover)',
        headerColor: 'var(--Colors-Use-Neutral-Text-1-Title)',
        rowHoverBg: 'var(--Colors-Use-Neutral-Bg-Hover)',
        borderColor: 'var(--Colors-Use-Neutral-Border)',
      },
    },
  }
}

export const YakitAntdProvider = ({ children }: { children: ReactNode }) => {
  const { theme } = useTheme()
  const antdTheme = useMemo(() => getYakitAntdTheme(theme), [theme])
  return createElement(
    ConfigProvider,
    { theme: antdTheme, wave: { disabled: true }, button: { autoInsertSpace: false } },
    children,
  )
}
