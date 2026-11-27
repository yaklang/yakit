import { useEffect, useId, useRef, useState } from 'react'
import { useMemoizedFn } from 'ahooks'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitCheckbox } from '@/components/yakitUI/YakitCheckbox/YakitCheckbox'
import { YakitInput } from '@/components/yakitUI/YakitInput/YakitInput'
import { showYakitModal } from '@/components/yakitUI/YakitModal/YakitModalConfirm'
import { YakitSpin } from '@/components/yakitUI/YakitSpin/YakitSpin'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { genDefaultPagination } from '@/pages/invoker/schema'
import { yakitNotify } from '@/utils/notification'
import type { MCPServer } from '../type/aiMCP'
import { getMCPServersById, grpcAddMCPServer, grpcGetAllMCPServers, grpcUpdateMCPServer } from './utils'
import { type MCPImportEntry, parseMCPImportConfig } from './mcpImportConfig'
import styles from './AIMCPImportModal.module.scss'

type ExistingServer = Pick<MCPServer, 'ID' | 'Enable'>
type ImportResult = 'added' | 'updated' | 'saveFailed' | 'serverChanged'

interface ImportRow {
  entry: MCPImportEntry
  existing?: ExistingServer
  selected: boolean
  result?: ImportResult
  connection?: 'checking' | 'connectionFailed' | 'disabled' | number
}

const isSaved = ({ result }: ImportRow) => result === 'added' || result === 'updated'

const getExistingServers = async () => {
  const servers = new Map<string, ExistingServer>()
  let count = 0
  for (let page = 1; ; page++) {
    const response = await grpcGetAllMCPServers(
      { Keyword: '', IsShowToolList: false, Pagination: { ...genDefaultPagination(1000, page), OrderBy: 'id' } },
      true,
    )
    const items = response.MCPServers ?? []
    items.forEach(({ Name, ID, Enable }) => servers.set(Name, { ID, Enable }))
    count += items.length
    if (count >= response.Total) return servers
    if (items.length === 0) throw new Error('Incomplete MCP server list')
  }
}

const checkConnection = async (row: ImportRow, lookup?: Promise<Map<string, ExistingServer> | null>) => {
  const id = (row.existing ?? (await lookup)?.get(row.entry.name))?.ID
  const detail = id ? await getMCPServersById(id, true).catch(() => null) : null
  return detail?.Name === row.entry.name && detail.Enable && !detail.ErrorMsg
    ? (detail.Tools?.length ?? 0)
    : 'connectionFailed'
}

interface AIMCPImportProps {
  config: string | (() => Promise<string>)
  onImported: () => void
  onClose: () => void
  onBackToForm?: () => void
  onSavingChange?: (saving: boolean) => void
}

// Both clipboard imports and app handoffs use the same preview and confirmation.
export const showMCPImportModal = (config: AIMCPImportProps['config'], onImported: AIMCPImportProps['onImported']) => {
  const modal = showYakitModal({
    title: (t) => t('AIMCPImport.title'),
    width: 600,
    footer: null,
    closable: false,
    maskClosable: false,
    content: <AIMCPImport config={config} onImported={onImported} onClose={() => modal.destroy()} />,
  })
  return modal
}

export const AIMCPImport = ({ config, onImported, onClose, onBackToForm, onSavingChange }: AIMCPImportProps) => {
  const { t } = useI18nNamespaces(['aiAgent', 'yakitUi'])
  const notificationKey = useId()
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [rows, setRows] = useState<ImportRow[]>()
  const [operation, setOperation] = useState<'reading' | 'saving' | undefined>('reading')
  const busy = !!operation
  const busyRef = useRef(true)

  const parse = useMemoizedFn(async (value: string) => {
    busyRef.current = true
    setOperation('reading')
    setError('')
    setText(value)
    try {
      const result = parseMCPImportConfig(value)
      if ('error' in result) {
        setError(value.trim() ? result.error : 'emptyClipboard')
        return
      }

      const existing = result.entries.some((entry) => 'server' in entry)
        ? await getExistingServers()
        : new Map<string, ExistingServer>()
      setRows(
        result.entries.map((entry) => ({
          entry,
          existing: existing.get(entry.name),
          selected: 'server' in entry && entry.server.Type !== 'stdio' && !existing.has(entry.name),
        })),
      )
    } catch {
      setError('lookupFailed')
    } finally {
      busyRef.current = false
      setOperation(undefined)
    }
  })

  useEffect(() => {
    let active = true
    Promise.resolve()
      .then(() => {
        if (active) return typeof config === 'string' ? config : config()
      })
      .then(
        (value) => {
          if (active) void parse(value ?? '')
        },
        () => {
          if (!active) return
          setError('clipboardFailed')
          busyRef.current = false
          setOperation(undefined)
        },
      )
    return () => {
      active = false
    }
  }, [config, parse])

  const connectionLabel = (connection: NonNullable<ImportRow['connection']>) =>
    typeof connection === 'number'
      ? t('AIMCPImport.connected', { count: connection })
      : t(connection === 'disabled' ? 'AIMCP.disabledGroup' : `AIMCPImport.${connection}`)

  const notifyImported = (saved: ImportRow[]) =>
    yakitNotify('success', {
      key: notificationKey,
      message: t('AIMCPImport.importedCount', { count: saved.length }),
      description: (
        <ul className={styles['import-result-list']}>
          {saved.map(({ entry, connection, result }) => (
            <li key={entry.name}>
              <strong>{entry.name}</strong>
              <span>{connection === undefined ? t(`AIMCPImport.${result}`) : connectionLabel(connection)}</span>
            </li>
          ))}
        </ul>
      ),
    })

  const save = async () => {
    if (!rows || busyRef.current) return
    busyRef.current = true
    setOperation('saving')
    onSavingChange?.(true)
    setError('')
    let closeAfterSave = false
    try {
      const existing = await getExistingServers()
      const updates = new Map<MCPImportEntry, ImportRow>()
      for (const row of rows) {
        if (!row.selected || !('server' in row.entry)) continue
        const current = existing.get(row.entry.name)
        if (current?.ID !== row.existing?.ID || current?.Enable !== row.existing?.Enable) {
          updates.set(row.entry, { ...row, existing: current, selected: false, result: 'serverChanged' })
          continue
        }

        const server = { ...row.entry.server, Enable: current?.Enable ?? row.entry.server.Enable }
        const response = await (
          current ? grpcUpdateMCPServer({ ...server, ID: current.ID }, true) : grpcAddMCPServer(server, true)
        ).catch(() => null)
        if (!response?.Ok) {
          updates.set(row.entry, { ...row, result: 'saveFailed' })
          continue
        }
        let connection: ImportRow['connection']
        if (!server.Enable) connection = 'disabled'
        else if (server.Type !== 'stdio') connection = 'checking'
        updates.set(row.entry, {
          ...row,
          selected: false,
          result: current ? 'updated' : 'added',
          connection,
        })
      }
      const saved = [...updates.values()].filter(isSaved)
      closeAfterSave = saved.length > 0 && saved.length === updates.size
      if (closeAfterSave) {
        onClose()
        notifyImported(saved)
      } else {
        setRows((current) => current?.map((row) => updates.get(row.entry) ?? row))
      }
      if (saved.length > 0) onImported()

      const lookup = saved.some((row) => row.connection === 'checking' && !row.existing)
        ? getExistingServers().catch(() => null)
        : undefined
      for (const [index, row] of saved.entries()) {
        if (row.connection !== 'checking') continue
        void checkConnection(row, lookup).then((connection) => {
          if (closeAfterSave) {
            saved[index] = { ...row, connection }
            notifyImported(saved)
            return
          }
          setRows((current) => current?.map((item) => (item.entry === row.entry ? { ...item, connection } : item)))
        })
      }
    } catch {
      setError('lookupFailed')
    } finally {
      if (!closeAfterSave) {
        busyRef.current = false
        setOperation(undefined)
      }
      onSavingChange?.(false)
    }
  }

  const imported = rows?.some(isSaved)
  const selected = rows?.some((row) => row.selected)
  return (
    <>
      <div className={styles['import-body']}>
        {rows ? (
          <>
            <div className={styles['import-review-header']}>
              <span className={styles['import-hint']}>{t('AIMCPImport.reviewHint')}</span>
              {!imported && (
                <YakitButton
                  type="text2"
                  disabled={busy}
                  onClick={() => {
                    setRows(undefined)
                    setError('')
                  }}
                >
                  {t('AIMCPImport.editJson')}
                </YakitButton>
              )}
            </div>
            <ul className={styles['import-list']}>
              {rows.map((row) => {
                const { entry, existing, result, connection } = row
                const saved = isSaved(row)
                const server = 'server' in entry ? entry.server : undefined
                let action = 'add'
                if (existing) action = existing.Enable ? 'update' : 'updateDisabled'
                else if (!server?.Enable) action = 'addDisabled'
                const name = entry.name.trim() ? entry.name : t('AIMCPImport.unnamed')
                return (
                  <li key={entry.name} className={styles['import-row']}>
                    {server && (
                      <YakitCheckbox
                        aria-label={existing ? t('AIMCPImport.updateServer', { name }) : name}
                        checked={row.selected}
                        disabled={busy || saved}
                        onChange={(event) => {
                          const checked = event.target.checked
                          setRows((current) =>
                            current?.map((item) => (item.entry === entry ? { ...item, selected: checked } : item)),
                          )
                        }}
                      />
                    )}
                    <div className={styles['import-service']}>
                      <strong>{name}</strong>
                      {'target' in entry && (
                        <span>
                          {server?.Type} · {entry.target}
                        </span>
                      )}
                      {'error' in entry && (
                        <span className={styles['import-error']}>{t(`AIMCPImport.${entry.error}`)}</span>
                      )}
                      {result && !saved && <span className={styles['import-error']}>{t(`AIMCPImport.${result}`)}</span>}
                    </div>
                    {server && (
                      <div className={styles['import-action']}>
                        {t(`AIMCPImport.${saved ? result : action}`)}
                        {connection !== undefined && <span role="status">{connectionLabel(connection)}</span>}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </>
        ) : operation === 'reading' ? (
          <div className={styles['import-loading']} role="status">
            <YakitSpin spinning />
            {t('AIMCPImport.reading')}
          </div>
        ) : (
          <YakitInput.TextArea
            value={text}
            rows={8}
            disabled={busy}
            aria-label={t('AIMCPImport.configLabel')}
            placeholder={t('AIMCPImport.configPlaceholder')}
            onChange={(event) => {
              setText(event.target.value)
              setError('')
            }}
          />
        )}
        {error && (
          <div className={styles['import-error']} role="alert">
            {t(`AIMCPImport.${error}`)}
          </div>
        )}
      </div>
      <div className={styles['import-footer']}>
        {onBackToForm && !imported && (
          <YakitButton
            type="text"
            size="large"
            className={styles['import-back']}
            disabled={operation === 'saving'}
            onClick={onBackToForm}
          >
            {t('AIMCPImport.backToForm')}
          </YakitButton>
        )}
        <YakitButton type="outline2" size="large" disabled={operation === 'saving'} onClick={onClose}>
          {t(imported ? 'YakitButton.close' : 'YakitButton.cancel')}
        </YakitButton>
        {(!imported || selected) && (
          <YakitButton
            type="primary"
            size="large"
            disabled={rows ? !selected : !text.trim()}
            loading={busy}
            onClick={() => {
              if (busyRef.current) return
              if (rows) void save()
              else void parse(text)
            }}
          >
            {t(rows ? 'AIMCPImport.confirm' : 'AIMCPImport.parse')}
          </YakitButton>
        )}
      </div>
    </>
  )
}
