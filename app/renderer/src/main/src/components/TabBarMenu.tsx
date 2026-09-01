import type React from 'react'
import { Menu, Dropdown } from 'antd'

export interface MenuInfoProps {
  key: string
  title: string
}

export const TabBarMenu = (
  props: any,
  TabBarDefault: any,
  menuList: MenuInfoProps[],
  callback: (id: any, key: any) => void,
) => {
  const tabBarMenu = (id: any) => {
    return (
      <Menu
        onClick={({ key }) => callback(id, key)}
        items={menuList.map((item) => ({ key: item.key, label: item.title }))}
      />
    )
  }

  return (
    <TabBarDefault
      {...props}
      children={(barNode: React.ReactElement) => {
        return (
          <Dropdown popupRender={() => tabBarMenu(barNode.key)} trigger={['contextMenu']}>
            {barNode}
          </Dropdown>
        )
      }}
    />
  )
}
