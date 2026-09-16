import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Tree } from 'antd'
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
import { FileDefault, FileSuffix, FolderDefault, KeyToIcon } from '@/pages/yakRunner/FileTree/icon'
import {
  DocumentDuplicateOutlined,
  PlusCircleOutlined,
  RefreshOutlined,
  TrashOutlined,
} from '@yakit-libs/yakit-ui-icons/outline'
import type { CHeaderEntry, CHeaderManagerProps, CHeaderPack, CHeaderTreeNode } from './CHeaderManagerType'
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

const iconForNode = (node: CHeaderTreeNode) => {
  if (node.kind === 'zip' || node.title.toLowerCase().endsWith('.zip')) {
    return KeyToIcon._f_zip?.iconPath || KeyToIcon[FileDefault]?.iconPath
  }
  if (node.isDir) {
    return KeyToIcon[FolderDefault]?.iconPath
  }
  const ext = node.title.includes('.') ? node.title.split('.').pop()?.toLowerCase() || '' : ''
  const key = FileSuffix[ext] || FileDefault
  return KeyToIcon[key]?.iconPath || KeyToIcon[FileDefault]?.iconPath
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
    isLeaf: !isDir,
  }
}

const entryToNode = (packName: string, entry: CHeaderEntry): CHeaderTreeNode => {
  return {
    key: `entry:${packName}:${entry.RelativePath}`,
    title: entry.Name,
    packName,
    relativePath: entry.RelativePath,
    isDir: !!entry.IsDir,
    isPack: false,
    kind: entry.IsDir ? 'directory' : 'file',
    sizeBytes: Number(entry.SizeBytes || 0),
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
  const wrapper = useRef<HTMLDivElement>(null)
  const size = useSize(wrapper)

  const loadPacks = useMemoizedFn(async () => {
    setLoading(true)
    try {
      const dirRes = await ipcRenderer.invoke('GetCHeadersDir', {})
      setDir(dirRes?.Dir || '')
      const listRes = await ipcRenderer.invoke('ListCHeaders', {})
      const packs: CHeaderPack[] = listRes?.Packs || []
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
    return ipcRenderer
      .invoke('ListCHeaderEntries', {
        PackName: node.packName,
        RelativePath: node.relativePath,
      })
      .then((res: { Entries?: CHeaderEntry[] }) => {
        const children = (res?.Entries || []).map((item) => entryToNode(node.packName, item))
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

  const onPreview = useMemoizedFn(async (node: CHeaderTreeNode) => {
    if (node.isDir) return
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

  const titleRender = useMemoizedFn((node: CHeaderTreeNode) => {
    const icon = iconForNode(node)
    const sizeLabel = formatSize(node.sizeBytes)
    return (
      <div className={styles['node']}>
        {icon ? <img className={styles['node-icon']} src={icon} alt="" /> : null}
        <span className={classNames(styles['node-name'], 'yakit-content-single-ellipsis')} title={node.title}>
          {node.title}
          {sizeLabel && node.isPack ? ` (${sizeLabel})` : ''}
        </span>
        {node.isPack && (
          <span className={styles['node-extra']} onClick={(e) => e.stopPropagation()}>
            <YakitPopconfirm
              title={t('CHeaderManager.deleteConfirm', { name: node.title })}
              onConfirm={() => onDelete(node)}
            >
              <YakitButton type="text2" size="small" icon={<TrashOutlined color="currentColor" />} />
            </YakitPopconfirm>
          </span>
        )}
      </div>
    )
  })

  return (
    <div className={styles['c-header-manager']}>
      <div className={styles['toolbar']}>
        <div className={styles['path-row']}>
          <span className={classNames(styles['path-text'], 'yakit-content-single-ellipsis')} title={dir}>
            {dir || t('CHeaderManager.loadingDir')}
          </span>
          <YakitButton
            type="text2"
            size="small"
            icon={<DocumentDuplicateOutlined color="currentColor" />}
            disabled={!dir}
            onClick={() => setClipboardText(dir)}
          />
          <YakitButton type="text2" size="small" icon={<RefreshOutlined color="currentColor" />} onClick={loadPacks} />
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
            <YakitButton type="text2" size="small" icon={<PlusCircleOutlined color="currentColor" />} />
          </YakitDropdownMenu>
        </div>
        <YakitInput.Search
          size="small"
          allowClear
          placeholder={t('CHeaderManager.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div ref={wrapper} className={styles['tree-wrap']}>
        {loading && treeData.length === 0 ? (
          <YakitSpin spinning />
        ) : shownTree.length === 0 ? (
          <div className={styles['empty-wrap']}>
            <YakitEmpty title={t('CHeaderManager.emptyTitle')} description={t('CHeaderManager.emptyDesc')} />
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <YakitButton type="primary" size="small" onClick={() => onImport('zip')}>
                {t('CHeaderManager.addZip')}
              </YakitButton>
            </div>
          </div>
        ) : (
          <Tree
            height={size?.height}
            blockNode
            loadData={onLoadData as any}
            treeData={shownTree as any}
            fieldNames={{ title: 'title', key: 'key', children: 'children' }}
            titleRender={(node) => titleRender(node as CHeaderTreeNode)}
            onSelect={(_, info) => onPreview(info.node as unknown as CHeaderTreeNode)}
          />
        )}
      </div>
      <YakitDrawer
        title={previewTitle}
        placement="right"
        width={560}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        getContainer={document.getElementById('audit-code') || document.body}
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
