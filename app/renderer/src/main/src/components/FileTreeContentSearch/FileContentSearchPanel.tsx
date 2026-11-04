import styles from './FileContentSearchPanel.module.scss'
import React, { useMemo, useState } from 'react'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { YakitSelect } from '@/components/yakitUI/YakitSelect/YakitSelect'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitCheckbox } from '@/components/yakitUI/YakitCheckbox/YakitCheckbox'
import { useFileContentSearch } from './hooks/useFileContentSearch'
import { resolveOpenHighlights } from './utils'
import type { FileSearchEditorHighlight } from './type'
import type { FileNodeProps } from '@/pages/yakRunner/FileTree/FileTreeType'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
export const FileContentSearchPanel: React.FC<{
  roots: { path: string }[]
  openedFiles: { path: string }[]
  onOpen: (file: FileNodeProps, highlights: FileSearchEditorHighlight[]) => void
}> = ({ roots, openedFiles, onOpen }) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const [scope, setScope] = useState('all')
  const [ignoreCase, setIgnoreCase] = useState(false)
  const searchRoots = useMemo(() => (scope === 'open' ? openedFiles : roots), [scope, roots, openedFiles])
  const search = useFileContentSearch({ roots: searchRoots, ignoreCase })
  return (
    <section aria-label={t('BatchFiles.search')} className={styles.panel}>
      <div className={styles.selectors}>
        <YakitSelect
          wrapperStyle={{ width: '100%', minWidth: 0 }}
          aria-label={t('BatchFiles.scope')}
          value={scope}
          onChange={setScope}
          options={[
            { value: 'all', label: t('BatchFiles.all') },
            { value: 'open', label: t('BatchFiles.open') },
          ]}
        />
        <YakitSelect
          wrapperStyle={{ width: '100%', minWidth: 0 }}
          aria-label={t('BatchFiles.mode')}
          value={search.searchType}
          onChange={search.setSearchType}
          options={[
            { value: 'keyword', label: t('BatchFiles.keyword') },
            { value: 'regexp', label: t('BatchFiles.regex') },
          ]}
        />
      </div>
      <div className={styles.options}>
        <YakitCheckbox
          wrapperClassName={styles.ignoreCase}
          checked={ignoreCase}
          onChange={(e) => setIgnoreCase(e.target.checked)}
        >
          {t('BatchFiles.ignoreCase')}
        </YakitCheckbox>
      </div>
      <YakitInput.Search
        aria-label={t('BatchFiles.search')}
        value={search.keyword}
        onChange={(e) => search.setKeyword(e.target.value)}
        onSearch={(value) => search.onSearch(value)}
        wrapperStyle={{ width: '100%', minWidth: 0 }}
        placeholder={t('BatchFiles.searchPlaceholder')}
        allowClear
      />
      {search.loading && <YakitButton onClick={search.onCancelSearch}>{t('BatchFiles.cancel')}</YakitButton>}
      {search.searched && !search.loading && !search.results.length && <div role="status">{t('BatchFiles.empty')}</div>}
      <div className={styles.results}>
        {search.results.map((file) => (
          <div className={styles.resultFile} key={file.path}>
            <div title={file.path}>
              {file.name || file.path} ({file.searchResult.match_count})
            </div>
            {file.searchResult.results.map((line, index) => (
              <YakitButton
                key={index}
                type="text"
                className={styles.match}
                title={file.path}
                onClick={() =>
                  onOpen(
                    { path: file.path, name: file.name, isFolder: false, icon: 'default' } as FileNodeProps,
                    resolveOpenHighlights(line, file),
                  )
                }
              >
                {line.line}: {line.text}
              </YakitButton>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
