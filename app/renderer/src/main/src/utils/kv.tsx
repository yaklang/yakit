import React from "react";

const {ipcRenderer} = window.require("electron");

export const saveValue = (k: string, value: any) => {
    ipcRenderer.invoke("set-value", k, value).then(() => {
    });
}

export const getValue = (k: string) => {
    return ipcRenderer.invoke("get-value", k)
}