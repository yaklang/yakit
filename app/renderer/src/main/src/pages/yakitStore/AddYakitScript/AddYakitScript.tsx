import {YakScriptCreatorForm} from "@/pages/invoker/YakScriptCreator"
import React from "react"
import "./AddYakitScript.scss"

export const AddYakitScript: React.FC = (props) => {
    return (
        <div className='yak-form-content'>
            <YakScriptCreatorForm onCreated={(s) => {}} isCreate={true} />
        </div>
    )
}
