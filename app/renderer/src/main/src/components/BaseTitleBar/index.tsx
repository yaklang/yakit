import {type FC, useState, useEffect, MouseEvent, ReactNode, useCallback} from "react"
import {
    MacUIOpCloseSvgIcon,
    MacUIOpMaxSvgIcon,
    MacUIOpMinSvgIcon,
    MacUIOpRestoreSvgIcon,
    WinUIOpCloseSvgIcon,
    WinUIOpMaxSvgIcon,
    WinUIOpMinSvgIcon,
    WinUIOpRestoreSvgIcon
} from "../layout/icons"
import styles from "./index.module.scss"
import classNames from "classnames"

const {ipcRenderer} = window.require("electron")

// 平台图标类型
interface IconSet {
    min: ReactNode
    max: ReactNode
    restore: ReactNode
    close: ReactNode
}

const TitleBar: FC = () => {
    const [isMaximized, setIsMaximized] = useState(false)
    const [icons, setIcons] = useState<IconSet | null>(null)
    const [isDarwin, setIsDarwin] = useState(true)

    useEffect(() => {
        const fetchIcons = async () => {
            try {
                const systemName = await ipcRenderer.invoke("fetch-system-name")
                const isMac = systemName === "Darwin"
                setIsDarwin(isMac)
                setIcons(
                    isMac
                        ? {
                              min: <MacUIOpMinSvgIcon />,
                              max: <MacUIOpMaxSvgIcon />,
                              restore: <MacUIOpRestoreSvgIcon />,
                              close: <MacUIOpCloseSvgIcon />
                          }
                        : {
                              min: <WinUIOpMinSvgIcon />,
                              max: <WinUIOpMaxSvgIcon />,
                              restore: <WinUIOpRestoreSvgIcon />,
                              close: <WinUIOpCloseSvgIcon />
                          }
                )
            } catch (error) {
                console.log("fetch-system-name:", error)
            }
        }
        fetchIcons()
    }, [])

    const minimize = () => ipcRenderer.send("minimize-childWin")

    const maximizeRestore = useCallback(() => {
        if (isDarwin) {
            ipcRenderer.invoke("UIOperate-childWin", "full")
        } else {
            ipcRenderer.send(isMaximized ? "restore-childWin" : "maximize-childWin")
        }
        setIsMaximized((prev) => !prev)
    }, [isDarwin, isMaximized])

    const close = () => ipcRenderer.send("close-childWin")

    /** 双击 header 空白处时触发 */
    const handleDoubleClick = (e: MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement
        if (target.closest("svg") || target.classList.contains(styles["icon-divider"])) return
        maximizeRestore()
    }

    if (!icons) return null

    return (
        <div className={styles.header} onDoubleClick={handleDoubleClick}>
            <div
                className={classNames(styles.icons, {
                    [styles["icons-darwin"]]: isDarwin,
                    [styles["icons-win"]]: !isDarwin
                })}
            >
                {isDarwin ? (
                    <>
                        <div onClick={close}>{icons.close}</div>
                        <div onClick={minimize}>{icons.min}</div>
                        <div onClick={maximizeRestore}>{isMaximized ? icons.restore : icons.max}</div>
                    </>
                ) : (
                    <>
                        <div onClick={minimize}>{icons.min}</div>
                        <div hidden={isDarwin} className={styles["icon-divider"]} />
                        <div onClick={maximizeRestore}>{isMaximized ? icons.restore : icons.max}</div>
                        <div hidden={isDarwin} className={styles["icon-divider"]} />
                        <div onClick={close}>{icons.close}</div>
                    </>
                )}
            </div>
        </div>
    )
}

export default TitleBar
