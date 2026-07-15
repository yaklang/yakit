/**
 * i18n 命名空间枚举。
 * 名称与 `public/locales/zh/` 下的 JSON 文件一一对应，
 * 新增/删除翻译文件时请同步更新此处。
 */
export enum I18nNamespaces {
  link = 'link',
  yakitUi = 'yakitUi',
}

/**
 * 命名空间字符串字面量联合类型。
 * 由 I18nNamespaces 枚举的值推导而来，既兼容枚举成员，
 * 也兼容原始字符串字面量（如 'yakitUi'），便于调用处书写。
 */
export type I18nNamespace = `${I18nNamespaces}`

/** 全部命名空间，便于批量预加载或校验 */
export const ALL_I18N_NAMESPACES: I18nNamespace[] = Object.values(I18nNamespaces)
