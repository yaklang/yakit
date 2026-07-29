---
title: YakitAutoComplete
subtitle: 自动完成
---

YakitAutoComplete 下拉选择列表。

## API

### YakitAutoCompleteProps

| 参数                   | 说明                                                           | 类型                                          | 默认值   |
| ---------------------- | -------------------------------------------------------------- | --------------------------------------------- | -------- |
| size                   | 菜单类型                                                       | YakitSizeType                                 | "middle" |
| cacheHistoryDataKey    | 缓存数据 key值(目前只支持tags类型)                             | string                                        | -        |
| cacheHistoryListLength | 缓存数据 list(option数组)的长度(cacheHistoryDataKey存在才有效) | number                                        | -        |
| ref                    | -                                                              | React.ForwardedRef<YakitAutoCompleteRefProps> | -        |

## ref 提供设置缓存的方法，提供获取缓存值得方法；

> onSetRemoteValues:是否要缓存需要外界通过ref得方式调用这个方法

| 方法              | 说明           |
| ----------------- | -------------- |
| onSetRemoteValues | 设置缓存得方法 |
| onGetRemoteValues | 获取缓存得方法 |
