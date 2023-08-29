import styles from "@/pages/fuzzer/HttpQueryAdvancedConfig/HttpQueryAdvancedConfig.module.scss";
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton";
import {HollowLightningBoltIcon, PlusIcon, TrashIcon} from "@/assets/newIcon";
import React, { ReactNode, useState } from "react";
import {Form, Tooltip} from "antd";
import classNames from "classnames";
import {TerminalPopover} from "@/pages/fuzzer/HttpQueryAdvancedConfig/HttpQueryAdvancedConfig";

interface CustomCodecValueProps {
    customCodecList: string[]
}

interface CustomCodecListProps {
    customCodecValue: CustomCodecValueProps
    onAdd: () => void
    onRemove: (index: number) => void
    onEdit: (index: number) => void
}

export const CustomCodecList: React.FC<CustomCodecListProps> = React.memo((props) => {
    const {customCodecValue, onAdd, onRemove, onEdit} = props
    const {customCodecList} = customCodecValue
    return (
        <>
            <Form.Item name='customCodec' noStyle>
                {customCodecList.map((item, index) => (
                    <div className={styles["matchersList-item"]} key={`${item}-${index}`}>
                        <div className={styles["matchersList-item-heard"]}>
                            <span className={styles["item-id"]}>{item || `data_${index}`}</span>
                            <span>[{customCodecList.find((e) => e)}]</span>
                            <span className={styles["item-number"]}>{item}</span>
                        </div>
                        <CustomCodecListItemOperate
                            onRemove={() => onRemove(index)}
                            onEdit={() => onEdit(index)}
                            popoverContent={
                                <div>111111111111</div>
                            }
                        />
                    </div>
                ))}
            </Form.Item>
            {customCodecList?.length === 0 && (
                <Form.Item wrapperCol={{span: 24}}>
                    <YakitButton
                        type='outline2'
                        onClick={() => onAdd()}
                        icon={<PlusIcon/>}
                        className={styles["plus-button-bolck"]}
                        block
                    >
                        添加
                    </YakitButton>
                </Form.Item>
            )}
        </>
    )
})

interface CustomCodecListItemOperateProps {
    onRemove: () => void
    onEdit: () => void
    popoverContent: ReactNode
}

const CustomCodecListItemOperate: React.FC<CustomCodecListItemOperateProps> = React.memo(
    (props) => {
        const { onRemove, onEdit, popoverContent } = props
        const [visiblePopover, setVisiblePopover] = useState<boolean>(false)
        return (
            <div
                className={classNames(styles["matchersList-item-operate"], {
                    [styles["matchersList-item-operate-hover"]]: visiblePopover
                })}
            >
                <TrashIcon className={styles["trash-icon"]} onClick={() => onRemove()} />

                <Tooltip title='调试'>
                    <HollowLightningBoltIcon
                        className={styles["hollow-lightningBolt-icon"]}
                        onClick={() => {
                            onEdit()
                        }}
                    />
                </Tooltip>
                <TerminalPopover
                    popoverContent={popoverContent}
                    visiblePopover={visiblePopover}
                    setVisiblePopover={setVisiblePopover}
                />
            </div>
        )
    }
)