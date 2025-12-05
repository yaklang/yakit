export interface AIMilkdownInputProps {
    /**true 只读 */
    readonly?: boolean
    /**值变化 */
    onChange?: (nextMarkdown: string, prevMarkdown: string) => void
    /**默认值 */
    defaultValue?: string
}
