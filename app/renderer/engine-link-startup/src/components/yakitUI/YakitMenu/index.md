---
title: YakitMenu
subtitle: 导航菜单
---

为页面和功能提供导航的菜单列表。

## API

### Menu

| 参数           | 说明                             | 类型                   | 默认值    |
| -------------- | -------------------------------- | ---------------------- | --------- |
| data           | 菜单内容                         | YakitMenuItemType\[]   | -         |
| width          | 菜单项最小宽度                   | number                 | 128       |
| type           | 菜单类型                         | "primary"\|"grey"      | "primary" |
| isHint         | 是否鼠标悬浮展示文字内容弹窗     | boolean                | false     |
| popupClassName | 外层装饰类                       | string                 | -         |
| size           | 菜单尺寸                         | "default"\|"rightMenu" | -         |
| menuprop       | ant-menu其余api属性(参考ant官网) | -                      | -         |

### YakitMenuItemType

> type YakitMenuItemType = [YakitMenuItemProps](#YakitMenuItemProps) | [YakitMenuItemDividerProps](#YakitMenuItemDividerProps);

#### YakitMenuItemProps

| 参数     | 说明                             | 类型                  | 默认值 |
| -------- | -------------------------------- | --------------------- | ------ |
| label    | 菜单展示内容                     | string \| ReactNode   | -      |
| key      | 菜单选项值                       | string                | -      |
| disabled | 是否禁用                         | boolean               | false  |
| children | 子菜单数据                       | YakitMenuItemType\[]  | -      |
| itemIcon | 菜单icon                         | ReactNode             | -      |
| title    | tooltip提示，不填默认用label     | string                | -      |
| type     | 单项菜单类型(只在叶子节点时有效) | "success" \| "danger" | -      |

#### YakitMenuItemDividerProps

| 参数 | 说明       | 类型      | 默认值    |
| ---- | ---------- | --------- | --------- |
| type | 分割线类型 | "divider" | "divider" |
