import {$command} from "@milkdown/utils"
import {yakitNotify} from "@/utils/notification"
import {convertSelectionByNode} from "./utils"

export const listToHeadingCommand = $command(
    `listToHeadingCommand`,
    (ctx) =>
        (level: number = 0) =>
        (state, dispatch) => {
            const command = convertSelectionByNode(state.schema.nodes.heading, {level})
            return command(state, dispatch)
        }
)

export const headingCustomPlugin = () => {
    return [listToHeadingCommand]
}
