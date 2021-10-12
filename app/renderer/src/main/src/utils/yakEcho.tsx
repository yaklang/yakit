import react from "react";

const {ipcRenderer} = window.require("electron");

export const yakEcho = (onOk?: () => any, onFailed?: (e: any) => any, onFinally?: () => any) => {
    ipcRenderer.invoke("echo-yak", "hello yak? are u ok?").then(onOk).catch(onFailed).finally(onFinally)
}
