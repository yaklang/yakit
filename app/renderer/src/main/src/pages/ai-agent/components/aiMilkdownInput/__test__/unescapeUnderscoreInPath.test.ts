import { describe, expect, it, vi } from 'vitest'

// utils.ts 顶部经由 @/components/MilkdownEditor/utils/utils 间接引用了
// window.require('electron')，与本次纯函数测试无关，桩掉以切断副作用导入链。
vi.mock('@/components/MilkdownEditor/utils/utils', () => ({
  imgTypes: ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'],
}))

import { unescapeUnderscoreInPath } from '../utils'

describe('unescapeUnderscoreInPath', () => {
  describe('路径上下文：应反转义 \\_ 为 _', () => {
    it.each([
      ['Windows 盘符路径', 'D:\\\\project\\_work\\_file.txt', 'D:\\\\project\\_work\\_file.txt'.replace(/\\_/g, '_')],
      [
        'Windows 盘符路径带转义下划线',
        'C:\\\\my\\_folder\\_readme.md',
        'C:\\\\my\\_folder\\_readme.md'.replace(/\\_/g, '_'),
      ],
      ['Unix 绝对路径', '/home/user/my\\_project', '/home/user/my_project'],
      ['UNC 路径', '\\\\\\\\server\\\\share\\\\my\\_dir', '\\\\\\\\server\\\\share\\\\my_dir'],
    ])('%s', (_label, input, expected) => {
      expect(unescapeUnderscoreInPath(input)).toBe(expected)
    })

    it('Windows 路径 D:\\work\\_file.txt 反转义后下划线还原', () => {
      // remark-stringify 把 D:\work\_file.txt 中的 _ 转义成 \_
      const input = 'D:\\\\work\\_file.txt'
      const output = unescapeUnderscoreInPath(input)
      expect(output).toBe('D:\\\\work_file.txt')
      expect(output).not.toContain('\\_')
    })

    it('Unix 路径 /var/log/my_app_log 反转义', () => {
      const input = '/var/log/my\\_app\\_log'
      expect(unescapeUnderscoreInPath(input)).toBe('/var/log/my_app_log')
    })
  })

  describe('非路径文本：保持 \\_ 不变', () => {
    it('普通变量名中的下划线不被处理（无转义）', () => {
      // 无反斜杠转义的普通文本原样返回
      expect(unescapeUnderscoreInPath('hello_world')).toBe('hello_world')
    })

    it('防强调转义 a\\_b 保持不变', () => {
      expect(unescapeUnderscoreInPath('a\\_b')).toBe('a\\_b')
    })

    it('markdown 强调上下文中的转义保持不变', () => {
      expect(unescapeUnderscoreInPath('foo\\_bar\\_baz')).toBe('foo\\_bar\\_baz')
    })
  })

  describe('混合内容：仅路径片段被反转义', () => {
    it('路径前有普通文本', () => {
      const input = '文件位于 D:\\\\work\\_file.txt 请查看'
      expect(unescapeUnderscoreInPath(input)).toBe('文件位于 D:\\\\work_file.txt 请查看')
    })

    it('路径与普通转义文本共存', () => {
      const input = '路径 /home/my\\_dir 与变量 a\\_b'
      expect(unescapeUnderscoreInPath(input)).toBe('路径 /home/my_dir 与变量 a\\_b')
    })

    it('多个路径片段各自反转义', () => {
      const input = '源 C:\\\\src\\_a 备份 /bak\\_a'
      expect(unescapeUnderscoreInPath(input)).toBe('源 C:\\\\src_a 备份 /bak_a')
    })
  })

  describe('边界', () => {
    it('空字符串原样返回', () => {
      expect(unescapeUnderscoreInPath('')).toBe('')
    })

    it('纯空白原样返回', () => {
      expect(unescapeUnderscoreInPath('   \t\n')).toBe('   \t\n')
    })

    it('无下划线转义的路径原样返回', () => {
      expect(unescapeUnderscoreInPath('/usr/local/bin')).toBe('/usr/local/bin')
    })

    it('连续空白不丢失', () => {
      const input = 'a\\_b   /path\\_x'
      // a_b 片段非路径保持，/path_x 片段是 Unix 路径反转义
      expect(unescapeUnderscoreInPath(input)).toBe('a\\_b   /path_x')
    })
  })
})
