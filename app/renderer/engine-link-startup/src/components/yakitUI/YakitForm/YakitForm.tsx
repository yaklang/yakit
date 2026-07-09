import { Spin, Divider } from 'antd'
import React, { ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import styles from './YakitForm.module.scss'
import classNames from 'classnames'
import { YakitInput } from '../YakitInput/YakitInput'
import { useDebounceEffect, useMemoizedFn } from 'ahooks'
import { yakitNotify } from '@/utils/notification'
import { getRemoteValue, setRemoteValue } from '@/utils/kv'
import { handleOpenFileSystemDialog, OpenDialogOptions } from '@/utils/fileSystemDialog'
import { FileDraggerProps, YakitDraggerProps } from './YakitFormType'
import { YakitAutoComplete } from '../YakitAutoComplete/YakitAutoComplete'
import { yakitFileSystem } from '@/utils/electronBridge'

/**是否符合接受的文件类型 */
export const isAcceptEligible = (path: string, accept?: string) => {
  const index = path.lastIndexOf('.')
  const fileType = path.substring(index, path.length)
  if (accept === '.*') {
    return index === -1 ? false : true
  }
  return accept ? accept.split(',').includes(fileType) : true
}
/**
 * @description:YakitDragger  支持拖拽:文件/文件夹 文件路径只包括文件夹或者文件的第一级路径, 不包括文件夹下面的子文件路径数;
 * @description 如果需要显示文件中的内容，推荐使用组件:YakitDraggerContent
 * @augments YakitDraggerProps
 * eg:  <YakitFormDraggerContent
        className={styles["plugin-execute-form-item"]}
        formItemProps={{
             name: "Input",
             label: "扫描目标",
             rules: [{required: true}]
        }}
        accept='.txt,.xlsx,.xls,.csv'
        textareaProps={{
            placeholder: "请输入扫描目标，多个目标用“英文逗号”或换行分隔"
        }}
        help='可将TXT、Excel文件拖入框内或'
        disabled={disabled}
    />
 */
export const YakitDragger: React.FC<YakitDraggerProps> = React.memo((props) => {
  const {
    size,
    inputProps = {},
    help,
    uploadFileText,
    uploadFolderText,
    showUploadBtn = true,
    value: fileName,
    onChange: setFileName,
    setContent,
    showDefHelp = true,
    selectType = 'file',
    renderType = 'input',
    textareaProps = {},
    autoCompleteProps = {},
    disabled,
    isShowPathNumber = true,
    multiple = true,
    fileExtensionIsExist = false,
    showExtraHelp = '',
    cacheFilePathKey,
    cacheFolderPathKey,
    helpClassName,
  } = props
  const [uploadLoading, setUploadLoading] = useState<boolean>(false)
  const [name, setName] = useState<string>(fileName || '')
  useDebounceEffect(
    () => {
      setName(fileName || '')
    },
    [fileName],
    { wait: 300 },
  )

  /**文件处理 */
  const getContent = useMemoizedFn((path: string, fileType: string) => {
    if (!path) {
      yakitNotify('error', '请输入路径')
      return
    }
    const index = path.lastIndexOf('.')
    if (fileExtensionIsExist || !!props.accept) {
      if (selectType === 'file' && index === -1) {
        yakitNotify('error', '请输入正确的路径')
        return
      }

      if (props.accept && !props.accept.split(',').includes(fileType)) {
        yakitNotify('error', `仅支持${props.accept}格式的文件`)
        return
      }
    }
    // 设置名字
    if (setFileName) {
      setFileName(path)
    }
    if (selectType === 'file' && setContent) {
      setUploadLoading(true)
      yakitFileSystem
        .fetchFileContent(path)
        .then((res) => {
          setContent(res)
        })
        .catch((err) => {
          yakitNotify('error', `数据获取失败: ${err}`)
          setContent('')
        })
        .finally(() => setTimeout(() => setUploadLoading(false), 200))
    }
  })

  const renderContentValue = useMemoizedFn(() => {
    switch (renderType) {
      case 'textarea':
        return (
          <YakitInput.TextArea
            placeholder={multiple ? '路径支持手动输入,输入多个请用逗号分隔' : '路径支持手动输入'}
            value={fileName || name}
            disabled={disabled}
            {...textareaProps}
            onChange={(e) => {
              setName(e.target.value)
              if (setFileName) setFileName(e.target.value)
              if (textareaProps.onChange) textareaProps.onChange(e)
              e.stopPropagation()
            }}
            onPressEnter={(e) => {
              e.stopPropagation()
              const index = name.lastIndexOf('.')
              if (selectType === 'file' && index === -1 && (fileExtensionIsExist || !!props.accept)) {
                yakitNotify('error', '请输入正确的路径')
                return
              }
              if (fileNumber > 1 && multiple === false) {
                yakitNotify('error', '不支持多选')
                return
              }
              const type = name.substring(index, name.length)
              getContent(name, type)
              if (textareaProps.onPressEnter) textareaProps.onPressEnter(e)
            }}
            onFocus={(e) => {
              e.stopPropagation()
              if (textareaProps.onFocus) textareaProps.onFocus(e)
            }}
            onClick={(e) => {
              e.stopPropagation()
              if (textareaProps.onClick) textareaProps.onClick(e)
            }}
            onBlur={(e) => {
              e.stopPropagation()
              if (!name) return
              const index = name.lastIndexOf('.')
              if (selectType === 'file' && index === -1 && (fileExtensionIsExist || !!props.accept)) {
                yakitNotify('error', '请输入正确的路径')
                return
              }
              if (fileNumber > 1 && multiple === false) {
                yakitNotify('error', '不支持多选')
                return
              }
              const type = name.substring(index, name.length)
              getContent(name, type)
              if (textareaProps.onBlur) textareaProps.onBlur(e)
            }}
          />
        )
      case 'autoComplete':
        return (
          <YakitAutoComplete
            placeholder={multiple ? '路径支持手动输入,输入多个请用逗号分隔' : '路径支持手动输入'}
            value={fileName || name}
            disabled={disabled}
            {...autoCompleteProps}
            onChange={(value, option) => {
              setName(value)
              if (setFileName) setFileName(value)
              if (autoCompleteProps.onChange) autoCompleteProps.onChange(value, option)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.stopPropagation()
                const index = name.lastIndexOf('.')
                if (selectType === 'file' && index === -1 && (fileExtensionIsExist || !!props.accept)) {
                  yakitNotify('error', '请输入正确的路径')
                  return
                }
                if (fileNumber > 1 && multiple === false) {
                  yakitNotify('error', '不支持多选')
                  return
                }
                const type = name.substring(index, name.length)
                getContent(name, type)
              }
            }}
            onFocus={(e) => {
              e.stopPropagation()
              if (autoCompleteProps.onFocus) autoCompleteProps.onFocus(e)
            }}
            onClick={(e) => {
              e.stopPropagation()
              if (autoCompleteProps.onClick) autoCompleteProps.onClick(e)
            }}
            onBlur={(e) => {
              e.stopPropagation()
              if (!name) return
              const index = name.lastIndexOf('.')
              if (selectType === 'file' && index === -1 && (fileExtensionIsExist || !!props.accept)) {
                yakitNotify('error', '请输入正确的路径')
                return
              }
              if (fileNumber > 1 && multiple === false) {
                yakitNotify('error', '不支持多选')
                return
              }
              const type = name.substring(index, name.length)
              getContent(name, type)
              if (autoCompleteProps.onBlur) autoCompleteProps.onBlur(e)
            }}
          />
        )
      default:
        return (
          <YakitInput
            placeholder={multiple ? '路径支持手动输入,输入多个请用逗号分隔' : '路径支持手动输入'}
            size={size}
            value={fileName || name}
            disabled={disabled}
            {...inputProps}
            onChange={(e) => {
              setName(e.target.value)
              if (setFileName) setFileName(e.target.value)
              if (inputProps.onChange) inputProps.onChange(e)
              e.stopPropagation()
            }}
            onPressEnter={(e) => {
              e.stopPropagation()
              const index = name.lastIndexOf('.')
              if (selectType === 'file' && index === -1 && (fileExtensionIsExist || !!props.accept)) {
                yakitNotify('error', '请输入正确的路径')
                return
              }
              if (fileNumber > 1 && multiple === false) {
                yakitNotify('error', '不支持多选')
                return
              }
              const type = name.substring(index, name.length)
              getContent(name, type)
              if (inputProps.onPressEnter) inputProps.onPressEnter(e)
            }}
            onFocus={(e) => {
              e.stopPropagation()
              if (inputProps.onFocus) inputProps.onFocus(e)
            }}
            onClick={(e) => {
              e.stopPropagation()
              if (inputProps.onClick) inputProps.onClick(e)
            }}
            onBlur={(e) => {
              e.stopPropagation()
              if (!name) return
              const index = name.lastIndexOf('.')
              if (selectType === 'file' && index === -1 && (fileExtensionIsExist || !!props.accept)) {
                yakitNotify('error', '请输入正确的路径')
                return
              }
              if (fileNumber > 1 && multiple === false) {
                yakitNotify('error', '不支持多选')
                return
              }
              const type = name.substring(index, name.length)
              getContent(name, type)
              if (inputProps.onBlur) inputProps.onBlur(e)
            }}
          />
        )
    }
  })

  const renderContent = useMemoizedFn((helpNode: ReactNode) => {
    return (
      <Spin spinning={uploadLoading}>
        {renderContentValue()}
        <div
          className={classNames(styles['dragger-help-middle'], {
            [styles['dragger-help-small']]: size === 'small',
            [styles['dragger-help-large']]: size === 'large',
          })}
        >
          {(showDefHelp && <>{helpNode}</>) || <></>}
        </div>
      </Spin>
    )
  })

  const cacheFilePathRef = useRef<string>('')
  const cacheFolderPathRef = useRef<string>('')
  // 获取缓存的文件路径
  useEffect(() => {
    if (cacheFilePathKey) {
      getRemoteValue(cacheFilePathKey).then((value) => {
        if (value) {
          cacheFilePathRef.current = value
        }
      })
    }
    if (cacheFolderPathKey) {
      getRemoteValue(cacheFolderPathKey).then((value) => {
        if (value) {
          cacheFolderPathRef.current = value
        }
      })
    }
  }, [])

  /**
   * @description 选择文件夹
   */
  const onUploadFolder = useMemoizedFn(() => {
    if (disabled) return
    const properties: OpenDialogOptions['properties'] = ['openDirectory']
    if (multiple !== false) {
      properties.push('multiSelections')
    }
    let option: OpenDialogOptions = {
      title: '请选择文件夹',
      properties,
    }
    if (cacheFolderPathRef.current) {
      option.defaultPath = cacheFolderPathRef.current
    }
    handleOpenFileSystemDialog(option).then((data) => {
      const filesLength = data.filePaths.length
      if (filesLength) {
        const absolutePath = data.filePaths.map((p) => p.replace(/\\/g, '\\')).join(',')
        if (cacheFolderPathKey && !multiple) {
          cacheFolderPathRef.current = absolutePath
          setRemoteValue(cacheFolderPathKey, absolutePath)
        }
        // 设置名字
        if (setFileName) setFileName(absolutePath)
      }
    })
  })
  /**选择文件 */
  const onUploadFile = useMemoizedFn(() => {
    if (disabled) return
    const properties: OpenDialogOptions['properties'] = ['openFile']
    if (multiple !== false) {
      properties.push('multiSelections')
    }
    let option: OpenDialogOptions = {
      title: '请选择文件',
      properties,
    }
    if (cacheFilePathRef.current) {
      option.defaultPath = cacheFilePathRef.current
    }
    handleOpenFileSystemDialog(option).then((data) => {
      const filesLength = data.filePaths.length
      let acceptFlag = true
      if (filesLength) {
        const absolutePath: string[] = []
        data.filePaths.forEach((p) => {
          const path = p.replace(/\\/g, '\\')
          if (fileExtensionIsExist || !!props.accept) {
            if (isAcceptEligible(path, props.accept || '.*')) {
              absolutePath.push(path)
            } else {
              acceptFlag = false
            }
          } else {
            absolutePath.push(path)
          }
        })

        if (props.accept && !acceptFlag) {
          yakitNotify('error', `仅支持${props.accept}格式的文件`)
        }
        const result = absolutePath.join(',')
        if (cacheFilePathKey && !multiple) {
          cacheFilePathRef.current = result
          setRemoteValue(cacheFilePathKey, result)
        }
        // 设置名字
        if (setFileName) setFileName(result)
      }
    })
  })
  /**拖拽文件夹后的路径回显文本处理 */
  const afterFolderDrop = useMemoizedFn((e) => {
    const { files = [] } = e.dataTransfer
    let paths: string[] = []
    let isNoFit: string[] = []
    const filesLength = files.length
    if (multiple === false && filesLength > 1) {
      yakitNotify('error', '不支持多选')
      return
    }
    for (let index = 0; index < filesLength; index++) {
      const element = files[index]
      const path = element.path || ''
      const number = path.lastIndexOf('.')
      if (number !== -1) {
        isNoFit.push(path)
      } else {
        paths.push(path)
      }
    }
    if (isNoFit.length > 0) {
      yakitNotify('error', '已自动过滤不符合条件的数据')
    }
    if (filesLength > isNoFit.length && setFileName) setFileName(paths.join(','))
  })
  /**拖拽文件后的处理 */
  const afterFileDrop = useMemoizedFn((e) => {
    const { files = [] } = e.dataTransfer
    let paths: string[] = []
    let isNoFit: string[] = []
    const filesLength = files.length
    if (multiple === false && filesLength > 1) {
      yakitNotify('error', '不支持多选')
      return
    }
    for (let index = 0; index < filesLength; index++) {
      const element = files[index]
      const path = element.path || ''
      if (fileExtensionIsExist || !!props.accept) {
        if (isAcceptEligible(path, props.accept || '.*')) {
          paths.push(path)
        } else {
          isNoFit.push(path)
        }
      } else {
        paths.push(path)
      }
    }
    if (isNoFit.length > 0) {
      yakitNotify('error', '已自动过滤不符合条件的数据')
    }
    if (filesLength > isNoFit.length && setFileName) setFileName(paths.join(','))
  })
  /**拖拽文件/文件夹的路径回显 */
  const afterAllDrop = useMemoizedFn((e) => {
    const { files = [] } = e.dataTransfer
    let paths: string[] = []
    const filesLength = files.length
    if (multiple === false && filesLength > 1) {
      yakitNotify('error', '不支持多选')
      return
    }
    for (let index = 0; index < filesLength; index++) {
      const element = files[index]
      const path = element.path || ''
      paths.push(path)
    }
    if (setFileName) setFileName(paths.join(','))
  })
  const fileNumber = useMemo(() => {
    let arr: string[] = []
    try {
      const path = fileName || name
      arr = path ? path.split(',') : []
    } catch (error) {
      yakitNotify('error', '文件路径数识别错误,请以逗号进行分割')
    }
    return arr.length
  }, [fileName, name])
  return (
    <>
      {selectType === 'file' && (
        <FileDragger onDrop={afterFileDrop}>
          {renderContent(
            <div className={classNames(styles['form-item-help'], helpClassName)}>
              <span>
                {help || '可将文件拖入框内或点击此处'}
                {showUploadBtn && (
                  <span
                    className={classNames(styles['dragger-help-active'], {
                      [styles['dragger-help-active-disabled']]: disabled,
                    })}
                    onClick={(e) => {
                      e.stopPropagation()
                      onUploadFile()
                    }}
                  >
                    {uploadFileText || '上传文件'}
                  </span>
                )}
              </span>
              {isShowPathNumber && (
                <span>
                  识别到
                  <span className={styles['dragger-help-number']}>{fileNumber}</span>
                  个文件路径
                </span>
              )}
              {showExtraHelp}
            </div>,
          )}
        </FileDragger>
      )}
      {selectType === 'folder' && (
        <FileDragger onDrop={afterFolderDrop}>
          {renderContent(
            <div className={styles['form-item-help']}>
              <span>
                {help || '可将文件拖入框内或点击此处'}
                {showUploadBtn && (
                  <span
                    className={classNames(styles['dragger-help-active'], {
                      [styles['dragger-help-active-disabled']]: disabled,
                    })}
                    onClick={(e) => {
                      e.stopPropagation()
                      onUploadFolder()
                    }}
                  >
                    {uploadFolderText || '上传文件夹'}
                  </span>
                )}
              </span>
              {isShowPathNumber && (
                <span>
                  识别到
                  <span className={styles['dragger-help-number']}>{fileNumber}</span>
                  个文件路径
                </span>
              )}
              {showExtraHelp}
            </div>,
          )}
        </FileDragger>
      )}
      {selectType === 'all' && (
        <FileDragger onDrop={afterAllDrop}>
          {renderContent(
            <div className={styles['form-item-help']}>
              <span>
                {help || '可将文件拖入框内或点击此处'}
                {showUploadBtn && (
                  <>
                    <span
                      className={classNames(styles['dragger-help-active'], {
                        [styles['dragger-help-active-disabled']]: disabled,
                      })}
                      onClick={(e) => {
                        e.stopPropagation()
                        onUploadFile()
                      }}
                    >
                      {uploadFileText || '上传文件'}
                    </span>
                    <Divider type="vertical" />
                    <span
                      className={classNames(styles['dragger-help-active'], {
                        [styles['dragger-help-active-disabled']]: disabled,
                      })}
                      onClick={(e) => {
                        e.stopPropagation()
                        onUploadFolder()
                      }}
                    >
                      {uploadFolderText || '上传文件夹'}
                    </span>
                  </>
                )}
              </span>
              {isShowPathNumber && (
                <span>
                  识别到
                  <span className={styles['dragger-help-number']}>{fileNumber}</span>
                  个文件路径
                </span>
              )}
              {showExtraHelp}
            </div>,
          )}
        </FileDragger>
      )}
    </>
  )
})

const FileDragger: React.FC<FileDraggerProps> = React.memo((props) => {
  const { disabled, multiple, onDrop, className, children } = props
  return (
    <div
      onDropCapture={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (disabled) return
        const { files = [] } = e.dataTransfer
        const filesLength = files.length
        if (multiple === false && filesLength > 1) {
          yakitNotify('error', '不允许多选')
          return
        }
        if (onDrop) onDrop(e)
      }}
      className={classNames(styles['yakit-dragger'], className)}
    >
      {children}
    </div>
  )
})
