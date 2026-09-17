import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Tree } from 'antd'
import { LoadingOutlined } from '@ant-design/icons'
import { useMemoizedFn, useSize } from 'ahooks'
import classNames from 'classnames'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitDropdownMenu } from '@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu'
import { YakitEmpty } from '@/components/yakitUI/YakitEmpty/YakitEmpty'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitPopconfirm } from '@/components/yakitUI/YakitPopconfirm/YakitPopconfirm'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { YakitDrawer } from '@/components/yakitUI/YakitDrawer/YakitDrawer'
import { YakitEditor } from '@/components/yakitUI/YakitEditor/YakitEditor'
import { yakitNotify } from '@/utils/notification'
import { setClipboardText } from '@/utils/clipboard'
import { handleOpenFileSystemDialog } from '@/utils/fileSystemDialog'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import {
  FileDefault,
  FileSuffix,
  FolderDefault,
  FolderDefaultExpanded,
  KeyToIcon,
} from '@/pages/yakRunner/FileTree/icon'
import {
  ChevronRightOutlined,
  CloudDownloadOutlined,
  DocumentDuplicateOutlined,
  PlusCircleOutlined,
  RefreshOutlined,
  TrashOutlined,
} from '@yakit-libs/yakit-ui-icons/outline'
import type { CHeaderEntry, CHeaderManagerProps, CHeaderPack, CHeaderTreeNode } from './CHeaderManagerType'
import fileTreeStyles from '../FileTree/FileTree.module.scss'
import styles from './CHeaderManager.module.scss'

const { ipcRenderer } = window.require('electron')

const decodePreviewContent = (content: unknown): string => {
  if (!content) return ''
  if (typeof content === 'string') return content
  const packed = content as { type?: string; data?: number[] }
  if (packed?.data && Array.isArray(packed.data)) {
    return new TextDecoder().decode(Uint8Array.from(packed.data))
  }
  if (content instanceof Uint8Array) {
    return new TextDecoder().decode(content)
  }
  return String(content)
}

const formatSize = (size: number) => {
  if (!size || size <= 0) return ''
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

const packToNode = (pack: CHeaderPack): CHeaderTreeNode => {
  const isDir = pack.Kind === 'directory' || pack.Kind === 'zip'
  return {
    key: `pack:${pack.Name}`,
    title: pack.Name,
    packName: pack.Kind === 'file' ? '' : pack.Name,
    relativePath: pack.Kind === 'file' ? pack.Name : '',
    isDir,
    isPack: true,
    kind: pack.Kind,
    sizeBytes: Number(pack.SizeBytes || 0),
    depth: 1,
    isLeaf: !isDir,
  }
}

const entryToNode = (packName: string, entry: CHeaderEntry, depth: number): CHeaderTreeNode => {
  return {
    key: `entry:${packName}:${entry.RelativePath}`,
    title: entry.Name,
    packName,
    relativePath: entry.RelativePath,
    isDir: !!entry.IsDir,
    isPack: false,
    kind: entry.IsDir ? 'directory' : 'file',
    sizeBytes: Number(entry.SizeBytes || 0),
    depth,
    isLeaf: !entry.IsDir,
  }
}

const filterTree = (nodes: CHeaderTreeNode[], keyword: string): CHeaderTreeNode[] => {
  const kw = keyword.trim().toLowerCase()
  if (!kw) return nodes
  const walk = (list: CHeaderTreeNode[]): CHeaderTreeNode[] => {
    const out: CHeaderTreeNode[] = []
    list.forEach((node) => {
      const children = node.children ? walk(node.children) : undefined
      if (node.title.toLowerCase().includes(kw) || (children && children.length > 0)) {
        out.push({ ...node, children })
      }
    })
    return out
  }
  return walk(nodes)
}

interface CHeaderTreeNodeViewProps {
  info: CHeaderTreeNode
  foucsedKey: string
  expandedKeys: string[]
  onSelected: (node: CHeaderTreeNode) => void
  onExpanded: (expanded: boolean, node: CHeaderTreeNode) => void
  onDelete: (node: CHeaderTreeNode) => void
}

const CHeaderTreeNodeView: React.FC<CHeaderTreeNodeViewProps> = React.memo((props) => {
  const { info, foucsedKey, expandedKeys, onSelected, onExpanded, onDelete } = props
  const { t } = useI18nNamespaces(['yakRunner'])
  const isFoucsed = foucsedKey === info.key
  const isExpanded = expandedKeys.includes(info.key)
  const sizeLabel = formatSize(info.sizeBytes)
  const isZip = info.kind === 'zip' || info.title.toLowerCase().endsWith('.zip')

  const iconImage = useMemo(() => {
    if (isZip) {
      return KeyToIcon._f_zip?.iconPath || KeyToIcon[FileDefault]?.iconPath
    }
    if (info.isDir) {
      const key = isExpanded ? FolderDefaultExpanded : FolderDefault
      return KeyToIcon[key]?.iconPath || KeyToIcon[FolderDefault]?.iconPath
    }
    const ext = info.title.includes('.') ? info.title.split('.').pop()?.toLowerCase() || '' : ''
    const key = FileSuffix[ext] || FileDefault
    return KeyToIcon[key]?.iconPath || KeyToIcon[FileDefault]?.iconPath
  }, [info.isDir, info.title, isExpanded, isZip])

  const handleClick = useMemoizedFn(() => {
    if (info.isLeaf) {
      onSelected(info)
    } else {
      onExpanded(isExpanded, info)
    }
  })

  return (
    <div
      className={classNames(fileTreeStyles['file-tree-node'], styles['c-header-node'], {
        [fileTreeStyles['node-foucsed']]: isFoucsed,
      })}
      style={{ paddingLeft: (info.depth - 1) * 16 + 8 }}
      onClick={handleClick}
    >
      <div
        className={classNames(fileTreeStyles['node-switcher'], {
          [fileTreeStyles['expanded']]: isExpanded,
          [fileTreeStyles['hidden']]: !!info.isLeaf,
        })}
      >
        <ChevronRightOutlined color="currentColor" />
      </div>
      <div className={fileTreeStyles['node-loading']}>
        <LoadingOutlined />
      </div>
      <div className={fileTreeStyles['node-content']}>
        <div className={fileTreeStyles['content-icon']}>{iconImage ? <img src={iconImage} alt="" /> : null}</div>
        <div className={classNames(fileTreeStyles['content-body'], 'yakit-content-single-ellipsis')}>
          <div className={classNames(fileTreeStyles['name'], 'yakit-content-single-ellipsis')} title={info.title}>
            {info.title}
          </div>
          {sizeLabel && info.isPack ? (
            <div
              className={classNames('yakit-content-single-ellipsis', fileTreeStyles['description'])}
              title={sizeLabel}
            >
              {sizeLabel}
            </div>
          ) : null}
        </div>
      </div>
      {info.isPack && (
        <YakitPopconfirm
          title={t('CHeaderManager.deleteConfirm', { name: info.title })}
          onConfirm={() => onDelete(info)}
        >
          <span className={styles['node-extra']} onClick={(e) => e.stopPropagation()}>
            <TrashOutlined color="currentColor" />
          </span>
        </YakitPopconfirm>
      )}
    </div>
  )
})

const CHeaderManager: React.FC<CHeaderManagerProps> = React.memo(() => {
  const { t } = useI18nNamespaces(['yakRunner', 'yakitUi'])
  const [dir, setDir] = useState('')
  const [loading, setLoading] = useState(false)
  const [treeData, setTreeData] = useState<CHeaderTreeNode[]>([])
  const [search, setSearch] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewTitle, setPreviewTitle] = useState('')
  const [previewValue, setPreviewValue] = useState('')
  const [previewTruncated, setPreviewTruncated] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [expandedKeys, setExpandedKeys] = useState<string[]>([])
  const [foucsedKey, setFoucsedKey] = useState('')
  const wrapper = useRef<HTMLDivElement>(null)
  const size = useSize(wrapper)

  const loadPacks = useMemoizedFn(async () => {
    setLoading(true)
    try {
      const dirRes = await ipcRenderer.invoke('GetCHeadersDir', {})
      setDir(dirRes?.Dir || '')
      const listRes = await ipcRenderer.invoke('ListCHeaders', {})
      const packs: CHeaderPack[] = listRes?.Packs || []
      setExpandedKeys([])
      setFoucsedKey('')
      setTreeData(packs.map(packToNode))
    } catch (e) {
      yakitNotify('error', `${e}`)
    } finally {
      setLoading(false)
    }
  })

  useEffect(() => {
    loadPacks()
  }, [])

  const onLoadData = useMemoizedFn((node: CHeaderTreeNode) => {
    if (!node.isDir) return Promise.resolve()
    // Tree 每次展开都会走 loadData（loadedKeys 固定为空），已有子节点时不必重复请求
    if (node.children && node.children.length > 0) return Promise.resolve()
    return ipcRenderer
      .invoke('ListCHeaderEntries', {
        PackName: node.packName,
        RelativePath: node.relativePath,
      })
      .then((res: { Entries?: CHeaderEntry[] }) => {
        const children = (res?.Entries || []).map((item) => entryToNode(node.packName, item, (node.depth || 1) + 1))
        setTreeData((prev) => {
          const patch = (list: CHeaderTreeNode[]): CHeaderTreeNode[] =>
            list.map((item) => {
              if (item.key === node.key) {
                return { ...item, children }
              }
              if (item.children) {
                return { ...item, children: patch(item.children) }
              }
              return item
            })
          return patch(prev)
        })
      })
      .catch((e) => {
        yakitNotify('error', `${e}`)
      })
  })

  const onExpanded = useMemoizedFn((expanded: boolean, node: CHeaderTreeNode) => {
    let arr = [...expandedKeys]
    if (expanded) {
      arr = arr.filter((item) => item !== node.key)
    } else {
      arr = [...arr, node.key]
    }
    setFoucsedKey(node.key)
    setExpandedKeys(arr)
  })

  const onImport = useMemoizedFn(async (kind: 'zip' | 'dir') => {
    try {
      const res = await handleOpenFileSystemDialog({
        title: kind === 'zip' ? t('CHeaderManager.addZip') : t('CHeaderManager.addFolder'),
        properties: kind === 'zip' ? ['openFile'] : ['openDirectory'],
        filters: kind === 'zip' ? [{ name: 'Zip', extensions: ['zip'] }] : undefined,
      })
      if (res.canceled || !res.filePaths?.[0]) return
      const localPath = res.filePaths[0]
      const result = await ipcRenderer.invoke('ImportCHeaderPack', {
        LocalPath: localPath,
        ExtractZip: false,
      })
      if (result && result.Ok === false) {
        yakitNotify('error', result.Reason || t('CHeaderManager.importFailed'))
        return
      }
      yakitNotify('success', t('CHeaderManager.importSuccess'))
      loadPacks()
    } catch (e) {
      yakitNotify('error', `${e}`)
    }
  })

  const onDelete = useMemoizedFn(async (node: CHeaderTreeNode) => {
    try {
      const result = await ipcRenderer.invoke('DeleteCHeaderPack', { Name: node.title })
      if (result && result.Ok === false) {
        yakitNotify('error', result.Reason || t('CHeaderManager.deleteFailed'))
        return
      }
      yakitNotify('success', t('CHeaderManager.deleteSuccess', { name: node.title }))
      loadPacks()
    } catch (e) {
      yakitNotify('error', `${e}`)
    }
  })

  const hasOfficialPack = useMemo(
    () => treeData.some((item) => item.title.toLowerCase() === 'c-std-headers.zip'),
    [treeData],
  )

  const runDownloadOfficial = useMemoizedFn(async (force: boolean) => {
    setDownloading(true)
    try {
      const result = await ipcRenderer.invoke('DownloadOfficialCHeaders', { Force: force })
      if (result && result.Ok === false) {
        yakitNotify('error', result.Reason || t('CHeaderManager.downloadFailed'))
        return
      }
      const version = result?.Version ? ` ${result.Version}` : ''
      yakitNotify('success', t('CHeaderManager.downloadSuccess', { version }))
      loadPacks()
    } catch (e) {
      yakitNotify('error', `${e}`)
    } finally {
      setDownloading(false)
    }
  })

  const onPreview = useMemoizedFn(async (node: CHeaderTreeNode) => {
    if (node.isDir) return
    setFoucsedKey(node.key)
    try {
      const res = await ipcRenderer.invoke('PreviewCHeaderFile', {
        PackName: node.packName,
        RelativePath: node.relativePath,
      })
      setPreviewTitle(node.title)
      setPreviewValue(decodePreviewContent(res?.Content))
      setPreviewTruncated(!!res?.Truncated)
      setPreviewOpen(true)
    } catch (e) {
      yakitNotify('error', `${e}`)
    }
  })

  const shownTree = useMemo(() => filterTree(treeData, search), [treeData, search])
  const editorType =
    previewTitle.toLowerCase().endsWith('.h') || previewTitle.toLowerCase().endsWith('.c') ? 'c' : 'plaintext'

  return (
    <div className={styles['c-header-manager']}>
      <div className={styles['toolbar']}>
        <div className={styles['path-row']}>
          <span className={classNames(styles['path-text'], 'yakit-content-single-ellipsis')} title={dir}>
            {dir || t('CHeaderManager.loadingDir')}
          </span>
          <div className={styles['extra']}>
            <YakitInput.Search
              size="small"
              allowClear
              wrapperStyle={{ width: 200 }}
              placeholder={t('CHeaderManager.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <YakitButton
              type="text2"
              icon={<DocumentDuplicateOutlined color="currentColor" />}
              disabled={!dir}
              onClick={() => setClipboardText(dir)}
            />
            <YakitButton type="text2" icon={<RefreshOutlined color="currentColor" />} onClick={loadPacks} />
            <YakitPopconfirm
              title={t('CHeaderManager.downloadOverwrite')}
              disabled={!hasOfficialPack}
              onConfirm={() => runDownloadOfficial(true)}
            >
              <YakitButton
                type="text2"
                loading={downloading}
                icon={<CloudDownloadOutlined color="currentColor" />}
                title={t('CHeaderManager.downloadOfficial')}
                onClick={() => {
                  if (!hasOfficialPack) {
                    runDownloadOfficial(false)
                  }
                }}
              />
            </YakitPopconfirm>
            <YakitDropdownMenu
              menu={{
                data: [
                  { key: 'zip', label: t('CHeaderManager.addZip') },
                  { key: 'dir', label: t('CHeaderManager.addFolder') },
                ],
                onClick: ({ key }) => onImport(key as 'zip' | 'dir'),
              }}
              dropdown={{ trigger: ['click'], placement: 'bottomLeft' }}
            >
              <YakitButton type="text2" icon={<PlusCircleOutlined color="currentColor" />} />
            </YakitDropdownMenu>
          </div>
        </div>
      </div>
      <div ref={wrapper} className={classNames(styles['tree-wrap'], fileTreeStyles['file-tree'])}>
        {loading && treeData.length === 0 ? (
          <YakitSpin spinning />
        ) : shownTree.length === 0 ? (
          <div className={styles['empty-wrap']}>
            <YakitEmpty title={t('CHeaderManager.emptyTitle')} description={t('CHeaderManager.emptyDesc')} />
            <div style={{ textAlign: 'center', marginTop: 8, display: 'flex', justifyContent: 'center', gap: 8 }}>
              <YakitButton type="primary" size="small" loading={downloading} onClick={() => runDownloadOfficial(false)}>
                {t('CHeaderManager.downloadOfficial')}
              </YakitButton>
              <YakitButton size="small" onClick={() => onImport('zip')}>
                {t('CHeaderManager.addZip')}
              </YakitButton>
            </div>
          </div>
        ) : (
          <Tree
            height={size?.height}
            blockNode
            switcherIcon={<></>}
            expandedKeys={expandedKeys}
            loadData={onLoadData as any}
            // 与文件树一致：避免 loadData 把节点记入 loadedKeys 后无法再次展开
            loadedKeys={[]}
            treeData={shownTree as any}
            fieldNames={{ title: 'title', key: 'key', children: 'children' }}
            titleRender={(node) => (
              <CHeaderTreeNodeView
                info={node as CHeaderTreeNode}
                foucsedKey={foucsedKey}
                expandedKeys={expandedKeys}
                onSelected={onPreview}
                onExpanded={onExpanded}
                onDelete={onDelete}
              />
            )}
          />
        )}
      </div>
      <YakitDrawer
        title={previewTitle}
        placement="right"
        width={560}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        getContainer={document.body}
        destroyOnClose
      >
        {previewTruncated && <div className={styles['preview-tip']}>{t('CHeaderManager.truncated')}</div>}
        <div className={styles['preview-editor']}>
          <YakitEditor type={editorType} value={previewValue} readOnly={true} />
        </div>
      </YakitDrawer>
    </div>
  )
})

export default CHeaderManager
