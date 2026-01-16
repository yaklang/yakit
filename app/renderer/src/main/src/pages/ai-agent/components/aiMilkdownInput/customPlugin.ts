import {TextSelection} from "@milkdown/kit/prose/state"
import {$command} from "@milkdown/kit/utils"

/**移除一个偏移量 */
export const removeAIOffsetCommand = $command(`command-remove-offset`, (ctx) => () => (state, dispatch) => {
    const {selection, tr} = state
    if (!(selection instanceof TextSelection)) return false
    const {from} = selection
    tr.deleteRange(from - 1, from)
    dispatch?.(tr.scrollIntoView())
    return true
})

export const aiCustomPlugin = () => {
    return [removeAIOffsetCommand]
}
