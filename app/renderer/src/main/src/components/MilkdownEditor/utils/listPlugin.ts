import {$command} from "@milkdown/utils"
import {convertSelectionByNode, setWrapInBlockType} from "./utils"
import {listItemSchema, paragraphSchema} from "@milkdown/kit/preset/commonmark"

export const listToParagraphCommand = $command(`listToParagraphCommand`, (ctx) => () => {
    return (state, dispatch) => {
        const command = convertSelectionByNode(paragraphSchema.type(ctx))
        return command(state, dispatch)
    }
})

export const convertToListBullet = $command(`convertToListBullet`, (ctx) => () => {
    return (state, dispatch) => {
        const command = setWrapInBlockType(listItemSchema.type(ctx), {checked: false})
        return command(state, dispatch)
    }
})

export const listCustomPlugin = () => {
    return [listToParagraphCommand, convertToListBullet]
}
