import React from "react";
import {showByCursorMenu} from "./showByCursor";

export const scanPacket = (mouseState: {
    screenX: number, screenY: number, pageX: number, pageY: number,
    clientX: number, clientY: number,
}, isHttps: boolean, req: string, rsp?: string) => {
    const m = showByCursorMenu({
        content: [
            {
                title: "123", onClick: () => {
                    alert(1)
                }
            },
        ]
    }, mouseState.pageX, mouseState.pageY)
}