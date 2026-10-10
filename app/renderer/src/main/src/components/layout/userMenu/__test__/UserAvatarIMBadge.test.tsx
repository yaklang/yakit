import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { UserAvatarIMBadge } from '../UserAvatarIMBadge'
import type { IMControlBadgeView } from '@/pages/robotControl/status'

vi.mock('@/i18n/useI18nNamespaces', () => ({
  useI18nNamespaces: () => ({ t: (key: string) => (key === 'FuncDomain.unreadMessages' ? '有未读消息' : key) }),
}))

const badge: IMControlBadgeView = {
  visible: true,
  state: 'running',
  color: 'green',
  label: '移动端控制运行中',
  detail: '',
}

describe('UserAvatarIMBadge', () => {
  it('同时展示头像右上未读红点和右下移动端控制状态', () => {
    const onBadgeClick = vi.fn()
    const onMenuClick = vi.fn()
    render(
      <div onClick={onMenuClick}>
        <UserAvatarIMBadge badge={badge} hasUnreadMessage={true} onBadgeClick={onBadgeClick}>
          <span>头像</span>
        </UserAvatarIMBadge>
      </div>,
    )

    expect(screen.getByRole('status', { name: '有未读消息' })).toBeInTheDocument()
    const imControlBadge = screen.getByRole('button', { name: badge.label })
    expect(imControlBadge).toBeInTheDocument()
    fireEvent.click(imControlBadge)
    expect(onBadgeClick).toHaveBeenCalledOnce()
    expect(onMenuClick).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('头像'))
    expect(onMenuClick).toHaveBeenCalledOnce()
  })

  it('无未读消息时不展示红点', () => {
    render(
      <UserAvatarIMBadge badge={{ ...badge, visible: false }} onBadgeClick={vi.fn()}>
        <span>头像</span>
      </UserAvatarIMBadge>,
    )

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
