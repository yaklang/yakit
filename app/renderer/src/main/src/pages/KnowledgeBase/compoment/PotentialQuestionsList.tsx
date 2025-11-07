import React from "react"
import {Form} from "antd"
import {PlusOutlined} from "@ant-design/icons"
import {DragDropContext, Droppable, Draggable, DropResult} from "@hello-pangea/dnd"
import {TrashIcon} from "@/assets/newIcon"
import {randomString} from "@/utils/randomUtil"
import styles from "../knowledgeBase.module.scss"
import {SolidDragsortIcon} from "@/assets/icon/solid"
import {YakitInput} from "@/components/yakitUI/YakitInput/YakitInput"
import {YakitButton} from "@/components/yakitUI/YakitButton/YakitButton"

interface RelationListProps {
    form: any
    disabled?: boolean
}

const {Item} = Form

const PotentialQuestionsList: React.FC<RelationListProps> = ({form, disabled}) => {
    return (
        <Item label='潜在问题'>
            <Form.List name='PotentialQuestions'>
                {(fields, {add, remove, move}) => {
                    return (
                        <>
                            <DragDropContext
                                onDragEnd={(result: DropResult) => {
                                    if (!result.destination) return
                                    move(result.source.index, result.destination.index)
                                }}
                            >
                                <Droppable droppableId='PotentialQuestions-droppable'>
                                    {(provided) => (
                                        <div ref={provided.innerRef} {...provided.droppableProps}>
                                            {fields.map((field, index) => {
                                                const item = form.getFieldValue(["PotentialQuestions", field.name])
                                                if (!item?.id) {
                                                    item.id = randomString(12)
                                                    const PotentialQuestions =
                                                        form.getFieldValue("PotentialQuestions") || []
                                                    PotentialQuestions[index] = item
                                                    form.setFieldsValue({PotentialQuestions})
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
                                                                    key={`relation-${id}`}
                                                                    name={[field.name, "relation"]}
                                                                    style={{marginBottom: 0}}
                                                                >
                                                                    <YakitInput
                                                                        disabled={disabled}
                                                                        placeholder='请输入'
                                                                    />
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
                            <Item>
                                <YakitButton
                                    type='outline1'
                                    disabled={disabled}
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
                        </>
                    )
                }}
            </Form.List>
        </Item>
    )
}

export {PotentialQuestionsList}
