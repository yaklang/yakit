import { useState } from 'react'
import { YakitModal } from '@/components/yakitUI/YakitModal/YakitModal'
import { useI18nNamespaces } from '@/i18n/useI18nNamespaces'
import { yakitClipboard } from '@/services/electronBridge'
import { isMemfit } from '@/utils/envfile'
import { AIMCPImport } from '../AIMCPImportModal'
import type { AddMCPServerRequest } from '../../type/aiMCP'
import { AIMCPForm } from './AIMCPForm'

interface AIMCPAddModalProps {
  open: boolean
  onClose: () => void
  onSaved: (server: AddMCPServerRequest) => void
  onImported: () => void
}

const readClipboard = () => yakitClipboard.getText()

export const AIMCPAddModal = ({ open, onClose, onSaved, onImported }: AIMCPAddModalProps) => {
  const { t } = useI18nNamespaces(['aiAgent'])
  const [importing, setImporting] = useState(false)
  const [saving, setSaving] = useState(false)

  return (
    <YakitModal
      open={open}
      title={t(importing ? 'AIMCPImport.title' : 'AIMCP.addMcpServer')}
      width={600}
      footer={null}
      bodyStyle={{ padding: 0 }}
      closable={!saving}
      maskClosable={!importing}
      destroyOnHidden
      onCancel={onClose}
      afterClose={() => setImporting(false)}
    >
      <div hidden={importing}>
        <AIMCPForm
          onPasteConfig={isMemfit() ? () => setImporting(true) : undefined}
          onCancel={(server) => {
            onClose()
            if (server) onSaved(server)
          }}
        />
      </div>
      {importing && (
        <AIMCPImport
          config={readClipboard}
          onClose={onClose}
          onImported={onImported}
          onBackToForm={() => setImporting(false)}
          onSavingChange={setSaving}
        />
      )}
    </YakitModal>
  )
}
