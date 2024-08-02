import React, {forwardRef, useEffect, useImperativeHandle, useMemo, useRef} from "react"
import PropTypes from "prop-types"

import "xterm/css/xterm.css"

// We are using these as types.
// eslint-disable-next-line no-unused-vars
import {Terminal, ITerminalOptions, ITerminalAddon} from "@xterm/xterm"
import {FitAddon} from "@xterm/addon-fit"
import useListenHeight from "@/pages/pluginHub/hooks/useListenHeight"
import styles from "./YakitXterm.module.scss"
import classNames from "classnames"
import {useMemoizedFn, useThrottleFn} from "ahooks"
import {warn} from "@/utils/notification"
import {callCopyToClipboard, getCallCopyToClipboard} from "@/utils/basic"
import {YakitMenuItemType} from "../YakitMenu/YakitMenu"
import {showByRightContext} from "../YakitMenu/showByRightContext"
import useListenWidth from "@/pages/pluginHub/hooks/useListenWidth"
import {System, SystemInfo, handleFetchSystem} from "@/constants/hardware"

export interface YakitXtermRefProps {
    terminal: Terminal
}
interface IProps {
    ref?: React.ForwardedRef<YakitXtermRefProps | undefined>
    isWrite?: boolean
    wrapperClassName?: string
    /**
     * Class name to add to the terminal container.
     */
    className?: string

    /**
     * Options to initialize the terminal with.
     */
    options?: ITerminalOptions

    /**
     * An array of XTerm addons to load along with the terminal.
     */
    addons?: Array<ITerminalAddon>

    /**
     * Adds an event listener for when a binary event fires. This is used to
     * enable non UTF-8 conformant binary messages to be sent to the backend.
     * Currently this is only used for a certain type of mouse reports that
     * happen to be not UTF-8 compatible.
     * The event value is a JS string, pass it to the underlying pty as
     * binary data, e.g. `pty.write(Buffer.from(data, 'binary'))`.
     */
    onBinary?(data: string): void

    /**
     * Adds an event listener for the cursor moves.
     */
    onCursorMove?(): void

    /**
     * Adds an event listener for when a data event fires. This happens for
     * example when the user types or pastes into the terminal. The event value
     * is whatever `string` results, in a typical setup, this should be passed
     * on to the backing pty.
     */
    onData?(data: string): void

    /**
     * Adds an event listener for when a key is pressed. The event value contains the
     * string that will be sent in the data event as well as the DOM event that
     * triggered it.
     */
    onKey?(event: {key: string; domEvent: KeyboardEvent}): void

    /**
     * Adds an event listener for when a line feed is added.
     */
    onLineFeed?(): void

    /**
     * Adds an event listener for when a scroll occurs. The event value is the
     * new position of the viewport.
     * @returns an `IDisposable` to stop listening.
     */
    onScroll?(newPosition: number): void

    /**
     * Adds an event listener for when a selection change occurs.
     */
    onSelectionChange?(): void

    /**
     * Adds an event listener for when rows are rendered. The event value
     * contains the start row and end rows of the rendered area (ranges from `0`
     * to `Terminal.rows - 1`).
     */
    onRender?(event: {start: number; end: number}): void

    /**
     * Adds an event listener for when the terminal is resized. The event value
     * contains the new size.
     */
    onResize?(event: {cols: number; rows: number}): void

    /**
     * Adds an event listener for when an OSC 0 or OSC 2 title change occurs.
     * The event value is the new title.
     */
    onTitleChange?(newTitle: string): void

    /**
     * Attaches a custom key event handler which is run before keys are
     * processed, giving consumers of xterm.js ultimate control as to what keys
     * should be processed by the terminal and what keys should not.
     *
     * @param event The custom KeyboardEvent handler to attach.
     * This is a function that takes a KeyboardEvent, allowing consumers to stop
     * propagation and/or prevent the default action. The function returns
     * whether the event should be processed by xterm.js.
     */
    customKeyEventHandler?(event: KeyboardEvent): boolean
}
const defaultOptions = {
    fontFamily: '"Courier New", Courier, monospace',
    convertEol: true,
    theme: {
        foreground: "#e5c7a9",
        background: "#31343F",
        cursor: "#f6f7ec",

        black: "#121418",
        brightBlack: "#675f54",

        red: "#c94234",
        brightRed: "#ff645a",

        green: "#85c54c",
        brightGreen: "#98e036",

        yellow: "#f5ae2e",
        brightYellow: "#e0d561",

        blue: "#1398b9",
        brightBlue: "#5fdaff",

        magenta: "#d0633d",
        brightMagenta: "#ff9269",

        cyan: "#509552",
        brightCyan: "#84f088",

        white: "#e5c6aa",
        brightWhite: "#f6f7ec"
    }
}
export const TERMINAL_KEYBOARD_Map = {
    KeyV: {
        code: "KeyV",
        key: "v", // 会区分大小写
        ASCII: 86
    },
    KeyC: {
        code: "KeyC",
        key: "c",
        ASCII: 67
    },
    Backspace: {
        code: "Backspace",
        key: "Backspace",
        ASCII: 8
    },
    Enter: {
        code: "Enter",
        key: "Enter",
        ASCII: 13
    },
    NumpadEnter: {
        code: "NumpadEnter",
        key: "Enter",
        ASCII: 13
    }
}
const YakitXterm: React.FC<IProps> = forwardRef((props, ref) => {
    const {isWrite = true, wrapperClassName = "", className = "", options = {}, addons = []} = props
    const terminalDivRef = useRef<HTMLDivElement>(null)
    const terminalRef = useRef<Terminal>(
        new Terminal({
            ...defaultOptions,
            ...options
        })
    )
    const fitAddonRef = useRef<FitAddon>(new FitAddon())
    const loading = useRef<boolean>(false)
    const systemRef = useRef<System | undefined>(SystemInfo.system)

    const terminalDivHeight = useListenHeight(terminalDivRef)
    const terminalDivWidth = useListenWidth(terminalDivRef)

    useImperativeHandle(
        ref,
        () => ({
            terminal: terminalRef.current
        }),
        []
    )

    useEffect(() => {
        if (!systemRef.current) {
            handleFetchSystem(() => (systemRef.current = SystemInfo.system))
        }

        // Load addons if the prop exists.
        if (!addons.length) {
            addons.forEach((addon) => {
                terminalRef.current.loadAddon(addon)
            })
        }
        terminalRef.current.loadAddon(fitAddonRef.current)

        // Create Listeners
        terminalRef.current.onBinary(onBinary)
        terminalRef.current.onCursorMove(onCursorMove)
        terminalRef.current.onData(onData)
        terminalRef.current.onKey(onKey)
        terminalRef.current.onLineFeed(onLineFeed)
        terminalRef.current.onScroll(onScroll)
        terminalRef.current.onSelectionChange(onSelectionChange)
        terminalRef.current.onRender(onRender)
        terminalRef.current.onResize(onResize)
        terminalRef.current.onTitleChange(onTitleChange)

        if (customKeyEventHandler) {
            terminalRef.current.attachCustomKeyEventHandler(customKeyEventHandler)
        }

        if (terminalRef.current && terminalDivRef.current) {
            // Creates the terminal within the container element.
            terminalRef.current.open(terminalDivRef.current)
            fitAddonRef.current.fit()
        }
        return () => {
            terminalRef.current.dispose()
            fitAddonRef.current.dispose()
        }
    }, [])
    useEffect(() => {
        fitAddonRef.current.fit()
    }, [terminalDivHeight, terminalDivWidth])
    const customKeyEventHandler = (e: KeyboardEvent) => {
        if (props.customKeyEventHandler) {
            return props.customKeyEventHandler(e)
        } else {
            return onCustomKeyEventHandler(e)
        }
    }
    const onCustomKeyEventHandler = (e: KeyboardEvent) => {
        if (!terminalRef.current || loading.current) return true
        const isCtrl = systemRef.current === "Darwin" ? e.metaKey : e.ctrlKey
        if (e.type === "keydown") {
            if (isCtrl) {
                if (e.code === TERMINAL_KEYBOARD_Map.KeyC.code) {
                    const select = terminalRef.current.getSelection()
                    return !select
                }
                if (e.code === TERMINAL_KEYBOARD_Map.KeyV.code) {
                    return false
                }
            }
        }

        return true
    }
    const onBinary = (data: string) => {
        if (props.onBinary) props.onBinary(data)
    }
    const onCursorMove = () => {
        if (props.onCursorMove) props.onCursorMove()
    }
    const onData = (data: string) => {
        if (isWrite && props.onData) props.onData(data)
    }
    const onKey = (event: {key: string; domEvent: KeyboardEvent}) => {
        if (props.onKey) props.onKey(event)
    }
    const onLineFeed = () => {
        if (props.onLineFeed) props.onLineFeed()
    }
    const onScroll = (newPosition: number) => {
        if (props.onScroll) props.onScroll(newPosition)
    }
    const onSelectionChange = () => {
        if (props.onSelectionChange) props.onSelectionChange()
    }
    const onRender = (event: {start: number; end: number}) => {
        if (props.onRender) props.onRender(event)
    }
    const onResize = (event: {cols: number; rows: number}) => {
        if (props.onResize) props.onResize(event)
    }
    const onTitleChange = (newTitle: string) => {
        if (props.onTitleChange) props.onTitleChange(newTitle)
    }
    const onCopy = useThrottleFn(
        useMemoizedFn((isShowTip?: boolean) => {
            const selectedText: string = (terminalRef.current && terminalRef.current.getSelection()) || ""
            if (selectedText.length === 0) {
                if (isShowTip) warn("暂无复制内容")
                return
            }
            loading.current = true
            callCopyToClipboard(selectedText, false).finally(() => (loading.current = false))
        }),
        {wait: 200}
    ).run

    const onPaste = useThrottleFn(
        useMemoizedFn(() => {
            if (isWrite) {
                loading.current = true
                getCallCopyToClipboard()
                    .then((str: string) => {
                        if (terminalRef.current) {
                            terminalRef.current.paste(str)
                            terminalRef.current.focus()
                        }
                    })
                    .catch(() => {})
                    .finally(() => (loading.current = false))
            } else {
                warn("不允许编辑")
            }
        }),
        {wait: 200}
    ).run

    const menuData: YakitMenuItemType[] = useMemo(() => {
        return [
            {
                label: "复制",
                key: "copy"
            },
            {
                label: "粘贴",
                key: "paste"
            }
        ] as YakitMenuItemType[]
    }, [])

    const handleContextMenu = useMemoizedFn(() => {
        showByRightContext({
            width: 180,
            type: "grey",
            data: [...menuData],
            onClick: ({key, keyPath}) => {
                switch (key) {
                    case "copy":
                        onCopy(true)
                        break
                    case "paste":
                        onPaste()
                        break
                    default:
                        break
                }
            }
        })
    })
    return (
        <div className={classNames(styles["terminal-box"], wrapperClassName)} onContextMenu={handleContextMenu}>
            <div className={classNames(styles["terminal-box-xterm"], className)} ref={terminalDivRef} />
        </div>
    )
})

YakitXterm.propTypes = {
    className: PropTypes.string,
    options: PropTypes.object,
    addons: PropTypes.array,
    onBinary: PropTypes.func,
    onCursorMove: PropTypes.func,
    onData: PropTypes.func,
    onKey: PropTypes.func,
    onLineFeed: PropTypes.func,
    onScroll: PropTypes.func,
    onSelectionChange: PropTypes.func,
    onRender: PropTypes.func,
    onResize: PropTypes.func,
    onTitleChange: PropTypes.func,
    customKeyEventHandler: PropTypes.func
}

export default YakitXterm
