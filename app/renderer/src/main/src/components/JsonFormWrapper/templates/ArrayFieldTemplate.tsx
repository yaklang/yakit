import React from "react"
import {YakitButton, YakitButtonProp} from "../../yakitUI/YakitButton/YakitButton"
import {PlusIcon, TrashIcon} from "@/assets/newIcon"
// import {SolidArrownarrowdownIcon, SolidArrownarrowupIcon} from "@/assets/icon/solid"

const AddButton: React.FC<YakitButtonProp> = (props) => (
    <YakitButton {...props} type="outline1" icon={<PlusIcon />}>
        添加
    </YakitButton>
)

const ArrayFieldTemplate: React.FC<any> = (props: any) => {
    return <DefaultNormalArrayFieldTemplate {...props} />
}

interface ArrayFieldTitleProps {
    TitleField: any
    idSchema: any
    title: string
    required: boolean
}

const ArrayFieldTitle: React.FC<ArrayFieldTitleProps> = (props: ArrayFieldTitleProps) => {
    const {TitleField, idSchema, title, required}: ArrayFieldTitleProps = props

    if (!title) {
        return <div />
    }

    const id = `${idSchema.$id}__title`
    {
        /* <TitleField id={id} title={title} required={required} /> */
    }
    return <div id={id}>{title}</div>
}

interface ArrayFieldDescriptionProps {
    DescriptionField: any
    idSchema: any
    description: string
}

const ArrayFieldDescription: React.FC<ArrayFieldDescriptionProps> = (props: ArrayFieldDescriptionProps) => {
    const {DescriptionField, idSchema, description}: ArrayFieldDescriptionProps = props

    if (!description) {
        return <div />
    }

    const id = `${idSchema.$id}__description`

    return <DescriptionField id={id} description={description} />
}

// Used in the two templates
const DefaultArrayItem: React.FC<any> = (props) => {
    const btnStyle: object = {
        flex: 1,
        paddingLeft: 6,
        paddingRight: 6,
        fontWeight: "bold"
    }
    const {
        index,
        children,
        hasMoveUp,
        hasMoveDown,
        disabled,
        readonly,
        onDropIndexClick,
        hasToolbar,
        onReorderClick,
        hasRemove
    } = props
    return (
        <div key={index}>
            <div>{children}</div>
            {hasToolbar && (
                <div style={{textAlign: "right"}}>
                    {/* {(hasMoveUp || hasMoveDown) && (
                        <YakitButton
                            type='text2'
                            tabIndex={-1}
                            style={btnStyle}
                            disabled={disabled || readonly || !hasMoveUp}
                            onClick={onReorderClick(index, index - 1)}
                            icon={<SolidArrownarrowupIcon />}
                        />
                    )}

                    {(hasMoveUp || hasMoveDown) && (
                        <YakitButton
                            type='text2'
                            tabIndex={-1}
                            style={btnStyle}
                            disabled={disabled || readonly || !hasMoveDown}
                            onClick={onReorderClick(index, index + 1)}
                            icon={<SolidArrownarrowdownIcon />}
                        />
                    )} */}

                    {hasRemove && (
                        <YakitButton
                            danger
                            type='text'
                            tabIndex={-1}
                            style={btnStyle}
                            disabled={disabled || readonly}
                            onClick={onDropIndexClick(index)}
                            icon={<TrashIcon />}
                        />
                    )}
                </div>
            )}
        </div>
    )
}

const DefaultNormalArrayFieldTemplate: React.FC<any> = (props) => {
    const {
        TitleField,
        idSchema,
        title,
        required,
        uiSchema,
        schema,
        items,
        canAdd,
        onAddClick,
        disabled,
        readonly,
        DescriptionField
    } = props

    return (
        <div>
            <ArrayFieldTitle
                key={`array-field-title-${props.idSchema.$id}`}
                TitleField={TitleField}
                idSchema={idSchema}
                title={uiSchema["ui:title"] || title}
                required={required}
            />

            {(uiSchema["ui:description"] || schema.description) && (
                <ArrayFieldDescription
                    key={`array-field-description-${idSchema.$id}`}
                    DescriptionField={DescriptionField}
                    idSchema={idSchema}
                    description={uiSchema["ui:description"] || schema.description}
                />
            )}

            <div key={`array-item-list-${idSchema.$id}`}>
                {items && items.map((p) => DefaultArrayItem(p))}
                {canAdd && (
                    <div style={{textAlign: "right", marginTop: 6}}>
                        <AddButton className='array-item-add' onClick={onAddClick} disabled={disabled || readonly} />
                    </div>
                )}
            </div>
        </div>
    )
}

export default ArrayFieldTemplate
