import {set} from "./keyDown"
import {v4 as uuidv4} from "uuid"
const ctrl_n = () => {
    console.log("ctrl_n")
}

const ctrl_w = () => {
    console.log("ctrl_w")
}

export const defaultKeyDown = () => {
    set("Control-n", {onlyid: uuidv4(), callback: ctrl_n})
    set("Control-w", {onlyid: uuidv4(), callback: ctrl_w})
}
