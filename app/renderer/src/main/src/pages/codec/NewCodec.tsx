import React, {useEffect, useRef, useState} from "react"
import {Divider, Tooltip} from "antd"
import {} from "@ant-design/icons"
import {useGetState} from "ahooks"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import styles from "./NewCodec.module.scss"
import {failed, success, warn, info} from "@/utils/notification"
import classNames from "classnames"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitCheckbox} from "@/components/yakitUI/YakitCheckbox/YakitCheckbox"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {SolidPlayIcon} from "@/assets/icon/solid"
import {YakEditor} from "@/utils/editors"
import {SideBarCloseIcon, SideBarOpenIcon} from "@/assets/newIcon"
import {
    OutlineArrowBigUpIcon,
    OutlineArrowscollapseIcon,
    OutlineArrowsexpandIcon,
    OutlineClockIcon,
    OutlineDocumentduplicateIcon,
    OutlineImportIcon,
    OutlineSearchIcon,
    OutlineStorageIcon
} from "@/assets/icon/outline"
import {YakitEmpty} from "@/components/yakitUI/YakitEmpty/YakitEmpty"
import {YakitResizeBox} from "@/components/yakitUI/YakitResizeBox/YakitResizeBox"
const {ipcRenderer} = window.require("electron")

interface NewCodecRightEditorBoxProps {
    isExpand: boolean
    setExpand: (v: boolean) => void
}
// codec右边编辑器
export const NewCodecRightEditorBox: React.FC<NewCodecRightEditorBoxProps> = (props) => {
    const {isExpand, setExpand} = props
    const Expand = () => (
        <div
            className={styles["expand-box"]}
            onClick={() => {
                setExpand && setExpand(!isExpand)
            }}
        >
            {isExpand ? <OutlineArrowscollapseIcon /> : <OutlineArrowsexpandIcon />}
        </div>
    )
    return (
        <div className={styles["new-codec-editor-box"]}>
            <YakitResizeBox
                isVer={true}
                isShowDefaultLineStyle={false}
                lineDirection='bottom'
                lineStyle={{backgroundColor: "#f0f1f3", height: 4}}
                firstNodeStyle={{padding: 0}}
                secondNodeStyle={{padding: 0}}
                firstNode={
                    <div className={classNames(styles["input-box"], styles["editor-box"])}>
                        <div className={styles["header"]}>
                            <div className={styles["title"]}>Input</div>
                            <div className={styles["extra"]}>
                                <div className={styles["extra-icon"]}>
                                    <OutlineImportIcon />
                                </div>
                                <Divider type={"vertical"} style={{margin: "4px 0px 0px"}} />
                                <div className={styles["clear"]}>清空</div>
                            </div>
                        </div>
                        <div className={styles["editor"]}>
                            <YakEditor
                                type='plaintext'
                                noMiniMap={true}
                                value={""}
                                setValue={(content: string) => {
                                    // setEditorValue(content)
                                }}
                                // loading={loading}
                                noWordWrap={true}
                            />
                        </div>
                    </div>
                }
                secondNode={
                    <div className={classNames(styles["output-box"], styles["editor-box"])}>
                        <div className={styles["header"]}>
                            <div className={styles["title"]}>Output</div>
                            <div className={styles["extra"]}>
                                <div className={styles["extra-icon"]}>
                                    <OutlineStorageIcon />
                                </div>
                                <div className={styles["extra-icon"]}>
                                    <OutlineArrowBigUpIcon />
                                </div>
                                <div className={styles["extra-icon"]}>
                                    <OutlineDocumentduplicateIcon />
                                </div>
                                <Divider type={"vertical"} style={{margin: "4px 0px 0px"}} />
                                {Expand()}
                            </div>
                        </div>
                        <div className={styles["editor"]}>
                            <YakEditor
                                type='plaintext'
                                readOnly={true}
                                value={""}
                                noMiniMap={true}
                                setValue={(content: string) => {
                                    // setEditorValue(content)
                                }}
                                // loading={loading}
                                noWordWrap={true}
                            />
                        </div>
                    </div>
                }
            />
        </div>
    )
}

interface NewCodecMiddleRunListProps {}
// codec中间可执行列表
export const NewCodecMiddleRunList: React.FC<NewCodecMiddleRunListProps> = (props) => {
    return (
        <div className={styles["new-codec-run-list"]}>
            <div className={styles["header"]}>
                <div className={styles["title"]}>
                    编解码顺序<span className={styles["count"]}>0</span>
                </div>
                <div className={styles["extra"]}>
                    <div className={styles["extra-icon"]}>
                        <OutlineStorageIcon />
                    </div>
                    <div className={styles["extra-icon"]}>
                        <OutlineClockIcon />
                    </div>
                    <Divider type={"vertical"} style={{margin: "4px 0px 0px"}} />
                    <div className={styles["clear"]}>清空</div>
                </div>
            </div>
            <div className={styles["run-list"]}>
                <div className={styles["no-data"]}>
                    <YakitEmpty title='请从左侧列表拖入要使用的 Codec 工具' />
                </div>
            </div>
            <div className={styles["run-box"]}>
                <YakitCheckbox
                    checked={true}
                    // onChange={(e) =>
                    //     onCheck( e.target.checked)
                    // }
                >
                    自动执行
                </YakitCheckbox>
                <YakitButton size='max' className={styles["run-box-btn"]} icon={<SolidPlayIcon />}>
                    立即执行
                </YakitButton>
            </div>
        </div>
    )
}

interface NewCodecLeftDragListProps {}
// codec左边拖拽列表
export const NewCodecLeftDragList: React.FC<NewCodecLeftDragListProps> = (props) => {
    const [fold, setFold] = useState<boolean>(true)
    return (
        <>
            {fold ? (
                <div className={styles["new-codec-drag-list"]}>
                    <div className={styles["header"]}>
                        <div className={styles["title"]}>Codec 分类</div>
                        <div className={classNames(styles["extra"], styles["fold-icon"])}>
                            <Tooltip placement='top' title='向左收起'>
                                <SideBarCloseIcon
                                    className={styles["fold-icon"]}
                                    onClick={() => {
                                        setFold(false)
                                    }}
                                />
                            </Tooltip>
                        </div>
                    </div>
                    <div className={styles["search"]}>
                        <YakitInput
                            prefix={
                                <div className={styles["prefix"]}>
                                    <OutlineSearchIcon />
                                </div>
                            }
                            style={{width: "100%"}}
                            placeholder='请输入关键词搜索'
                            value={""}
                            onChange={(e) => {
                                // setDictionariesName(e.target.value)
                            }}
                        />
                    </div>
                    <div className={styles["left-drag-list"]}></div>
                </div>
            ) : (
                <div className={classNames(styles["drag-list-hidden"])}>
                    <div className={styles["open-box"]}>
                        <Tooltip placement='right' title='向右展开'>
                            <SideBarOpenIcon
                                className={styles["fold-icon"]}
                                onClick={() => {
                                    setFold(true)
                                }}
                            />
                        </Tooltip>
                    </div>
                </div>
            )}
        </>
    )
}

export interface NewCodecProps {}
const NewCodec: React.FC<NewCodecProps> = (props) => {
    // 是否全部展开
    const [isExpand, setExpand] = useState<boolean>(false)
    return (
        <div className={styles["new-codec"]}>
            {!isExpand && (
                <>
                    <NewCodecLeftDragList />
                    <NewCodecMiddleRunList />
                </>
            )}
            <NewCodecRightEditorBox isExpand={isExpand} setExpand={setExpand} />
        </div>
    )
}
export default NewCodec
