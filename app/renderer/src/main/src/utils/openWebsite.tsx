import React from "react";

const {ipcRenderer} = window.require("electron");

export const openExternalWebsite = (u: string) => {
    ipcRenderer.invoke("shell-open-external", u)
}

export const openABSFile = (u: string) => {
    ipcRenderer.invoke("shell-open-abs-file", u)
}

export interface ExternalUrlProp {
    url: string
    title?: React.ReactNode
}

export const ExternalUrl: React.FC<ExternalUrlProp> = (props) => {
    return <a onClick={e => {
        openExternalWebsite(props.url)
    }}>
        {props.title || props.url}
    </a>
};