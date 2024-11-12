import {$command} from "@milkdown/utils"
import {convertSelectionByNode} from "./utils"

export const listToCodeCommand = $command(`listToCodeCommand`, (ctx) => () => (state, dispatch) => {
    const command = convertSelectionByNode(state.schema.nodes.code_block)
    return command(state, dispatch)
})

export const codeCustomPlugin = () => {
    return [listToCodeCommand]
}
