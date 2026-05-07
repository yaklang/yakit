import React, { Dispatch, SetStateAction, useEffect } from 'react'
import { type FC } from 'react'

import { useMemoizedFn, useSafeState } from 'ahooks'

import { PlusIcon } from '@/assets/newIcon'
import { YakitButton } from '@/components/yakitUI/YakitButton/YakitButton'
import { YakitDropdownMenu } from '@/components/yakitUI/YakitDropdownMenu/YakitDropdownMenu'
import { KnowledgeBaseFormModal } from './KnowledgeBaseFormModal'
import { Form } from 'antd'
import { ImportModal } from './ImportModal'
import { reseultKnowledgePlugin, useCheckKnowledgePlugin } from '../hooks/useCheckKnowledgePlugin'
import { InstallPluginModal } from './InstallPluginModal/InstallPluginModal'

const AddKnowledgenBaseDropdownMenu: FC<{
  setKnowledgeBaseID: (id: string) => void
  setAddMode: Dispatch<SetStateAction<string[]>>
}> = ({ setKnowledgeBaseID, setAddMode }) => {
  const [form] = Form.useForm()

  const { refresh: binariesToInstallRefresh, ThirdPartyBinaryRunAsync } = useCheckKnowledgePlugin()

  const [createMenuOpen, setCreateMenuOpen] = useSafeState(false)
  const [visible, setVisible] = useSafeState(false)
  const [importVisible, setImportVisible] = useSafeState(false)

  // 新增 / 编辑 知识库弹窗状态及信息管理
  const handOpenKnowledgeBasesModal = () => {
    form.resetFields()
    setVisible((preValue) => !preValue)
  }

  const createKnowledgeBase = useMemoizedFn(async () => {
    try {
      const result = await ThirdPartyBinaryRunAsync()
      const targetInstallPlugins = reseultKnowledgePlugin(result)
      targetInstallPlugins
        ? InstallPluginModal({
            getContainer: '#main-operator-page-body-ai-repository',
            callback: () => {
              binariesToInstallRefresh()
            },
          })
        : handOpenKnowledgeBasesModal()
    } catch (error) {}
  })

  return (
    <React.Fragment>
      <YakitDropdownMenu
        menu={{
          data: [
            {
              key: 'create',
              label: '新建',
            },
            {
              key: 'import',
              label: '导入',
            },
          ],
          onClick: ({ key }) => {
            setCreateMenuOpen(false)
            switch (key) {
              case 'import':
                setImportVisible((prevalue) => !prevalue)
                break
              case 'create':
                createKnowledgeBase()
                break
              default:
                break
            }
          },
        }}
        dropdown={{
          trigger: ['click'],
          placement: 'bottomRight',
          onVisibleChange: (v) => {
            setCreateMenuOpen(v)
          },
          visible: createMenuOpen,
        }}
      >
        <YakitButton
          type="text2"
          icon={<PlusIcon />}
          size="small"
          style={{ height: '26.85px', width: '26.85px' }}
          className="third-step"
        />
      </YakitDropdownMenu>

      <KnowledgeBaseFormModal
        visible={visible}
        title="新增知识库"
        handOpenKnowledgeBasesModal={handOpenKnowledgeBasesModal}
        setKnowledgeBaseID={setKnowledgeBaseID}
        form={form}
        setAddMode={setAddMode}
      />

      <ImportModal visible={importVisible} onVisible={setImportVisible} setAddMode={setAddMode} />
    </React.Fragment>
  )
}

export { AddKnowledgenBaseDropdownMenu }
