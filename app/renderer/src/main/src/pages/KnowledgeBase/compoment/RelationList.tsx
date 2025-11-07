import React from "react"
import {Form} from "antd"
import {PlusOutlined} from "@ant-design/icons"
import {DragDropContext, Droppable, Draggable, DropResult} from "@hello-pangea/dnd"
import {TrashIcon} from "@/assets/newIcon"
import {randomString} from "@/utils/randomUtil"
import styles from "../knowledgeBase.module.scss"
import {SolidDragsortIcon} from "@/assets/icon/solid"
import {YakitSelect} from "@/components/yakitUI/YakitSelect/YakitSelect"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"

interface RelationListProps {
    form: any
    disabled?: boolean
}

const {Item} = Form

const RelationList: React.FC<RelationListProps> = ({form, disabled}) => {
    return (
        <Item label='实体关系'>
            <Form.List name='relations'>
                {(fields, {add, remove, move}) => {
                    return (
                        <>
                            <DragDropContext
                                onDragEnd={(result: DropResult) => {
                                    if (!result.destination) return
                                    move(result.source.index, result.destination.index)
                                }}
                            >
                                <Droppable droppableId='relations-droppable'>
                                    {(provided) => (
                                        <div ref={provided.innerRef} {...provided.droppableProps}>
                                            {fields.map((field, index) => {
                                                const item = form.getFieldValue(["relations", field.name])
                                                if (!item?.id) {
                                                    item.id = randomString(12)
                                                    const relations = form.getFieldValue("relations") || []
                                                    relations[index] = item
                                                    form.setFieldsValue({relations})
                                                }
                                                const id = item.id
                                                return (
                                                    <Draggable key={id} draggableId={id} index={index}>
                                                        {(provided, snapshot) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                className={styles["dnd-card"]}
                                                                style={{
                                                                    opacity: snapshot.isDragging ? 0.5 : 1,
                                                                    ...provided.draggableProps.style
                                                                }}
                                                            >
                                                                <div {...provided.dragHandleProps}>
                                                                    <SolidDragsortIcon
                                                                        className={styles["draggable-icon"]}
                                                                    />
                                                                </div>
                                                                <Item
                                                                    key={`concept-${id}`}
                                                                    name={[field.name, "concept"]}
                                                                    style={{marginBottom: 8}}
                                                                >
                                                                    <YakitSelect
                                                                        placeholder='选择概念'
                                                                        disabled={disabled}
                                                                        options={[
                                                                            {
                                                                                value: "concept:schema混淆",
                                                                                label: "concept:schema混淆"
                                                                            },
                                                                            {
                                                                                value: "concept:schema错误",
                                                                                label: "concept:schema错误"
                                                                            }
                                                                        ]}
                                                                    />
                                                                </Item>
                                                                <Item
                                                                    key={`relation-${id}`}
                                                                    name={[field.name, "relation"]}
                                                                    style={{marginBottom: 0}}
                                                                >
                                                                    <YakitInput.TextArea disabled={disabled} rows={1} />
                                                                </Item>
                                                                {!disabled && (
                                                                    <TrashIcon
                                                                        className={styles["dnd-delete-icon"]}
                                                                        onClick={() => remove(field.name)}
                                                                    />
                                                                )}
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                )
                                            })}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </DragDropContext>
                            {!disabled && (
                                <Item>
                                    <YakitButton
                                        type='outline2'
                                        onClick={() =>
                                            add({
                                                id: randomString(12)
                                            })
                                        }
                                        icon={<PlusOutlined />}
                                        block
                                    >
                                        添加
                                    </YakitButton>
                                </Item>
                            )}
                        </>
                    )
                }}
            </Form.List>
        </Item>
    )
}

export default RelationList
