/**
 * @param {string} copyText 需要复制的文字,不传的话默认showText
 * @param {string} showText 需要展示的文字
 */
export interface YakitCopyTextProps {
    copyText?: string
    showText: string
    onAfterCopy?: (e: MouseEvent) => void
    iconColor?: string
}