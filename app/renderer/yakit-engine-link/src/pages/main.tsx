import React from "react"
import {Button, DatePicker, version} from "antd"
import styles from "./main.module.scss"
const {ipcRenderer} = require("electron")

export const Main: React.FC = () => {
    return (
        <div className={styles["my-button"]}>
            <h1>Antd version: {version}</h1>
            <DatePicker />
            <Button
                type='primary'
                style={{marginLeft: 8}}
                onClick={() => {
                    ipcRenderer.send("yakitEngineLinkWin-done", {someData: 123})
                }}
            >
                Primary Button
            </Button>
            <Button
                type='primary'
                style={{marginLeft: 8}}
                onClick={() => {
                    ipcRenderer.invoke("app-exit", {
                        isYakitEngineLinkWin: true,
                        showCloseMessageBox: true,
                        isIRify: false
                    })
                }}
            >
                close App Button
            </Button>
        </div>
    )
}
