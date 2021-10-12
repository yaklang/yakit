import React from "react";
import ReactDOM from "react-dom";
import {Button, Card, Menu, Modal} from "antd";
import "./showByCursor.css"

export interface ByCursorContainerProp {
    content: JSX.Element
}

const cursorContainerId = "yakit-cursor-container";
export const showByCursorContainer = (props: ByCursorContainerProp, x: number, y: number) => {
    const divExisted = document.getElementById(cursorContainerId)
    const div: HTMLDivElement = divExisted ? divExisted as HTMLDivElement : document.createElement("div")
    div.style.left = `${x}px`
    div.style.top = `${y}px`
    div.style.position = 'absolute'
    div.id = cursorContainerId
    div.className = "popup"
    document.body.appendChild(div)

    const destory = () => {
        const unmountResult = ReactDOM.unmountComponentAtNode(div);
        if (unmountResult && div.parentNode) {
            div.parentNode.removeChild(div);
        }
    }

    const render = () => {
        setTimeout(() => {
            document.addEventListener("click", function onClickOutsize() {
                destory()
                document.removeEventListener("click", onClickOutsize)
            })
            ReactDOM.render(<Card bodyStyle={{padding: 0}} bordered={true} hoverable={true}>
                {props.content}
            </Card>, div)
        })
    }
    render();

    return {destroy: destory}
}