import { getBrandWebsite, getBrandGithub, isArkiumBrand } from '@/config/brand/brandConfig'

/** 全局访问的网址 */
export enum WebsiteGV {
  /** @name 官网地址 */
  OfficialWebsite = 'https://www.yaklang.com/',
  /** @name 关于我们 */
  AboutUsWebsite = 'https://megavector.cn/aboutUs/',
  /** @name yak-帮助文档地址 */
  YakHelpDocAddress = 'https://www.yaklang.com/docs/intro/',
  /** @name 插件参数-帮助文档地址 */
  PluginParamsHelp = 'https://yaklang.com/products/Plugin-repository/plugins/plugin_create',
  /** @name WebFuzzer-帮助文档地址 */
  WebFuzzerAddress = 'https://www.yaklang.com/products/Web%20Fuzzer/fuzz-sequence',

  /** @name yakit历史安装包地址 */
  YakitHistoryVersionAddress = 'https://github.com/yaklang/yakit/releases',
}

/**
 * 品牌官网地址（用户可见的品牌出口）。
 * - Arkium：返回 brand 官网 https://arkium.app
 * - Yakit：返回传入的 fallback（默认官网），保持现有行为不变
 */
export const getBrandOfficialWebsite = (fallback: string = WebsiteGV.OfficialWebsite): string =>
  isArkiumBrand() ? getBrandWebsite() : fallback

/**
 * 品牌 GitHub 地址。
 * - Arkium：返回 brand GitHub https://github.com/Arkiumapp
 * - Yakit：返回传入的 fallback（默认 yakit 仓库），保持现有行为不变
 */
export const getBrandGithubAddress = (fallback: string = 'https://github.com/yaklang/yakit'): string =>
  isArkiumBrand() ? getBrandGithub() : fallback
