import type React from 'react'
import { forwardRef, memo, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import type { TextareaForFile, TextareaForImage, PluginImageTextareaProps } from './PluginImageTextareaType'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { failed } from '@/utils/notification'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { PaperClipOutlined, PhotographOutlined, XOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import { Input, Upload } from 'antd'
import { PaperAirplaneSolid } from '@yakit-libs/yakit-ui-icons/solid'
import cloneDeep from 'lodash/cloneDeep'
import { httpDeleteOSSResource, httpUploadImgBase64 } from '@/apiUtils/http'
import type { TextAreaRef } from 'antd/lib/input/TextArea'
import { ImagePreviewList } from '@/pages/pluginHub/utilsUI/UtilsTemplate'
import { handleOpenFileSystemDialog } from '@/utils/fileSystemDialog'
import { getLocalFileLinkInfo } from '@/components/MilkdownEditor/CustomFile/utils'
import {
  DISPOSAL_ATTACHMENT_EXTENSIONS,
  getDisposalAttachmentTypeHint,
  MAX_ATTACHMENT_SIZE,
  validateDisposalAttachmentName,
} from '@/utils/disposalAttachment'
import { DisposalFileList } from '@/components/DisposalFileList/DisposalFileList'

import classNames from 'classnames'
import styles from './PluginImageTextarea.module.scss'

export const ImgMaxSize = 1 * 1024 * 1024

export const PluginImageTextarea: React.FC<PluginImageTextareaProps> = memo(
  forwardRef((props, ref) => {
    const {
      className,
      loading,
      type = 'comment',
      maxLength = 6,
      onSubmit,
      onUploadImage,
      onUploadFile,
      quotation,
      delQuotation,
    } = props
    const { t } = useI18nNamespaces(['components'])
    const [files, setFiles] = useState<TextareaForFile[]>([])
    const [fileLoading, setFileLoading] = useState(false)
    const fileBusyRef = useRef(false)
    const uploadVersionRef = useRef(0)

    useEffect(
      () => () => {
        uploadVersionRef.current += 1
      },
      [],
    )

    useImperativeHandle(
      ref,
      () => ({
        getData: getData,
        onClear: onClear,
      }),
      [],
    )

    const getData = useMemoizedFn(() => {
      if (fileBusyRef.current) {
        failed(t('DisposalAttachment.uploading'))
        return null
      }
      if (imgLoading) {
        failed('图片正在上传中, 请稍候在操作...')
        return null
      }
      if (delLoading.current) {
        failed('图片正在删除中, 请稍候在操作...')
        return null
      }

      return {
        value: value,
        imgs: cloneDeep(imgs),
        ...(onUploadFile ? { files: cloneDeep(files) } : {}),
      }
    })
    const onClear = useMemoizedFn(() => {
      handleDelQuotation()
      setValue('')
      setImgs([])
      uploadVersionRef.current += 1
      fileBusyRef.current = false
      setFileLoading(false)
      setFiles([])
    })

    const onReply = useMemoizedFn(() => {
      if (loading) return
      const data = getData()
      if (!data) return
      onSubmit && onSubmit(data)
    })

    const handleUploadFile = useMemoizedFn(async () => {
      if (!onUploadFile || fileBusyRef.current || imgLoading || loading) return
      const upload = onUploadFile
      const version = uploadVersionRef.current
      fileBusyRef.current = true
      setFileLoading(true)
      try {
        const selected = await handleOpenFileSystemDialog({
          title: t('DisposalAttachment.uploadDialogTitle'),
          filters: [{ name: t('DisposalAttachment.supportedFiles'), extensions: DISPOSAL_ATTACHMENT_EXTENSIONS }],
          properties: ['openFile'],
        })
        const path = selected.filePaths[0]
        if (selected.canceled || !path || version !== uploadVersionRef.current) return
        validateDisposalAttachmentName(path)
        const { size } = await getLocalFileLinkInfo(path, true)
        if (version !== uploadVersionRef.current) return
        if (size > MAX_ATTACHMENT_SIZE) throw new Error(t('DisposalAttachment.sizeLimit'))
        const url = await upload(path)
        if (version !== uploadVersionRef.current) return
        setFiles((current) => [
          ...current,
          { url, size, name: path.split(/[\\/]/).pop() || t('DisposalAttachment.attachment') },
        ])
      } catch (error) {
        if (version === uploadVersionRef.current)
          failed(t('DisposalAttachment.uploadFailedWithReason', { error: String(error) }))
      } finally {
        if (version === uploadVersionRef.current) {
          fileBusyRef.current = false
          setFileLoading(false)
        }
      }
    })

    /** ----------  引用相关功能 Start ---------- */
    const handleDelQuotation = useMemoizedFn(() => {
      delQuotation && delQuotation()
    })
    /** ---------- 引用相关功能 End ---------- */

    /** ----------  编辑内容相关 Start ---------- */
    // 文本内容相关
    const textAreaRef = useRef<TextAreaRef>(null)
    const [value, setValue] = useState<string>('')
    const contentLength = useMemo(() => {
      return value.length
    }, [value])

    /** ---------- 编辑内容相关 End ---------- */

    /** ----------  编辑图片相关 Start ---------- */
    const [imgLoading, setImgLoading] = useState<boolean>(false)
    const [imgs, setImgs] = useState<TextareaForImage[]>([])
    const imgsLength = useMemo(() => {
      return imgs.length
    }, [imgs])

    // 生成图片信息
    const generateImageInfo = useMemoizedFn((image: File) => {
      if (imgsLength >= maxLength) {
        failed(`最多上传${maxLength}张图片`)
        return
      }
      if (!image) {
        return
      }
      if (imgLoading || fileBusyRef.current || loading) {
        failed('图片正在上传中, 请稍候在操作...')
        return
      }

      if (image.size > ImgMaxSize) {
        failed('图片大小不能超过1M')
        return
      }

      setImgLoading(true)
      const render = new FileReader()
      render.onload = (e) => {
        if (!e || !e.target) {
          failed('无法识别图片，请重试')
          setTimeout(() => {
            setImgLoading(false)
          }, 100)
          return
        }
        const base64 = e.target.result || ''
        const img = new Image()
        img.onload = () => {
          const { width, height } = img
          const imgInfo = { filename: image.name || 'image.png', contentType: image.type || 'image/png' }
          const uploadPromise = onUploadImage
            ? onUploadImage({ base64: base64 as string, imgInfo })
            : httpUploadImgBase64({
                base64: base64 as string,
                imgInfo,
                type: type === 'comment' ? 'comment' : 'plugins',
              })
          uploadPromise
            .then((res) => {
              setImgs((arr) => arr.concat([{ url: res, width, height }]))
            })
            .finally(() => {
              setTimeout(() => {
                setImgLoading(false)
              }, 100)
            })
        }
        img.src = URL.createObjectURL(image)
      }
      render.readAsDataURL(image)
    })
    // 监听粘贴图片
    const handlePaste = useMemoizedFn((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const pasteItems = e.clipboardData?.items || []
      for (let i = 0; i < pasteItems.length; i++) {
        const item = pasteItems[i]
        if (item.kind === 'file' && item.type.indexOf('image') !== -1) {
          e.preventDefault()
          e.stopPropagation()
          const image = item.getAsFile() as File
          generateImageInfo(image)
        }
      }
    })

    const delLoading = useRef<boolean>(false)
    const setDelLoading = useMemoizedFn((value: boolean) => {
      delLoading.current = value
    })
    // 删除图片资源
    const handleDelImgs: (url: string) => Promise<void> = useMemoizedFn((url) => {
      return new Promise((resolve, reject) => {
        const [name, path] = url.split('/').reverse()
        if (!name || !path) {
          failed(`删除图片异常，异常值: ${url}`)
          reject()
          return
        }
        const fileName = `${path}/${name}`
        httpDeleteOSSResource({ file_name: [fileName] })
          .then(() => {
            resolve()
          })
          .catch(reject)
      })
    })
    /** ----------  编辑图片相关 End ---------- */

    /** ----------  操作相关 Start ---------- */
    const [textareaFocus, setTextareaFocus] = useState<boolean>(false)

    // 文本区域聚焦状态
    const handleFocus = useMemoizedFn(() => {
      setTextareaFocus(true)
      textAreaRef.current!.focus({ cursor: 'end' })
    })
    // 文本区域失焦状态
    const handleBlur = useMemoizedFn(() => {
      setTextareaFocus(false)
    })

    // 文本区域聚焦后光标设置到文本内容最后
    const handleTextareaFocus = useMemoizedFn(() => {
      !textareaFocus && textAreaRef.current!.focus({ cursor: 'end' })
    })
    /** ---------- 操作相关 End ---------- */

    return (
      <div
        className={classNames(
          styles['plugin-image-textarea'],
          {
            [styles['plugin-image-textarea-focus']]: textareaFocus,
          },
          className,
        )}
        onClick={handleTextareaFocus}
      >
        {!!quotation && (
          <div className={styles['plugin-image-textarea-quotation']}>
            <div className={styles['del-btn']} onClick={handleDelQuotation}>
              <XOutlined color="currentColor" />
            </div>
            <div className={styles['divider-style']}></div>
            <div className={styles['content-style']}>
              <div
                className={classNames(styles['text-style'], 'yakit-content-single-ellipsis')}
                title={quotation.content}
              >
                {`回复 ${quotation.userName} : ${quotation.content}`}
              </div>
              {quotation.imgs && quotation.imgs.length > 0 && <div>{`[图片] * ${quotation.imgs?.length}`}</div>}
              {!!quotation.files?.length && (
                <div title={quotation.files.map((file) => file.name).join('、')}>
                  {t('DisposalAttachment.quote', { count: quotation.files.length })}
                </div>
              )}
            </div>
          </div>
        )}

        <Input.TextArea
          ref={textAreaRef}
          className={styles['plugin-image-textarea-body']}
          value={value}
          variant="borderless"
          autoSize={{ minRows: 1, maxRows: 3 }}
          placeholder="说点什么...(tip: 可以粘贴图片了)"
          spellCheck={false}
          maxLength={150}
          onPaste={handlePaste}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={(e) => setValue(e.target.value)}
        />

        {imgsLength > 0 && (
          <ImagePreviewList
            isDel={true}
            imgs={imgs}
            setImgs={setImgs}
            setDelLoading={setDelLoading}
            onDel={handleDelImgs}
          />
        )}

        <DisposalFileList
          files={files}
          onRemove={loading ? undefined : (index) => setFiles((current) => current.filter((_, i) => i !== index))}
          editable
        />

        <div className={styles['plugin-image-textarea-footer-operate']}>
          <div className={styles['upload-actions']}>
            <Upload
              accept="image/jpeg,image/png,image/jpg,image/gif"
              multiple={false}
              disabled={loading || fileLoading || imgLoading || imgsLength >= 6}
              showUploadList={false}
              beforeUpload={(file: any) => {
                if ('image/jpeg,image/png,image/jpg,image/gif'.indexOf(file.type) === -1) {
                  failed('仅支持上传图片格式为：image/jpeg,image/png,image/jpg,image/gif')
                  return false
                }
                if (file) {
                  generateImageInfo(file)
                }
                return false
              }}
            >
              <YakitButton
                disabled={loading || fileLoading || imgsLength >= 6}
                loading={imgLoading}
                icon={<PhotographOutlined color="currentColor" />}
                type="text2"
              />
            </Upload>
            {onUploadFile && (
              <YakitButton
                title={t('DisposalAttachment.uploadHint', { types: getDisposalAttachmentTypeHint() })}
                aria-label={t('DisposalAttachment.upload')}
                disabled={loading || fileLoading || imgLoading}
                loading={fileLoading}
                icon={<PaperClipOutlined color="currentColor" />}
                type="text2"
                onClick={handleUploadFile}
              />
            )}
          </div>

          <div className={styles['right-footer']}>
            <div className={styles['content-length']}>{contentLength}/150</div>
            {type === 'comment' && (
              <YakitButton
                loading={loading}
                disabled={imgLoading || fileLoading || (contentLength === 0 && imgsLength === 0 && files.length === 0)}
                onClick={onReply}
              >
                <PaperAirplaneSolid color="currentColor" />
                {quotation ? '回复' : '发布评论'}
              </YakitButton>
            )}
          </div>
        </div>
      </div>
    )
  }),
)
