import {YakScriptCreatorForm} from "@/pages/invoker/YakScriptCreator"
import {Route} from "@/routes/routeSpec"
import {Modal} from "antd"
import React, {useEffect, useState} from "react"
import "./index.scss"

const {ipcRenderer} = window.require("electron")

export const AddYakitScript: React.FC = (props) => {
    return (
        <div className='yak-form-content'>
            <YakScriptCreatorForm onCreated={(s) => {}} />
        </div>
    )
}
