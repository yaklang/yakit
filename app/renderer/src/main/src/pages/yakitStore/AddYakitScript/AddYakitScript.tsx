import {YakScriptCreatorForm} from "@/pages/invoker/YakScriptCreator"
import React from "react"
import "./AddYakitScript.scss"

interface AddYakitScriptProp {
    // 模板类型
    moduleType: string
    content: string
}

export const AddYakitScript: React.FC<AddYakitScriptProp> = ({ moduleType, content }) => {
    return (
        <div className='yak-form-content'>
            <YakScriptCreatorForm onCreated={(s) => {}} isCreate={true} moduleType={moduleType} content={content} />
        </div>
    )
}
