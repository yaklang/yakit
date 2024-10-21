import {imageBlockSchema} from "@milkdown/kit/component/image-block"
import {Attrs} from "@milkdown/kit/prose/model"
import {$command} from "@milkdown/kit/utils"

// 创建一个命令，用于插入 imageBlock
export const insertImageBlockCommand = $command("insertImageBlock", (ctx) => (props: Attrs | undefined) => {
    return (state, dispatch) => {
        if (!props) return false
        
        // 创建 imageBlock 节点，并设置 src 和 alt 属性
        const imageNode = imageBlockSchema.type(ctx).create({
            ...props
        })

        // 插入节点
        const transaction = state.tr.replaceSelectionWith(imageNode)
        if (dispatch) {
            dispatch(transaction)
        }

        return true // 表示命令成功执行
    }
})
