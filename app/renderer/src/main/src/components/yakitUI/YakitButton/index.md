## Yakit-Button

提供了六种按钮类型

-   primary按钮：主题按钮
-   secondary2按钮：设计稿查看
-   outline1按钮：设计稿查看
-   outline2按钮：设计稿查看
-   text按钮：设计稿查看
-   text2按钮：设计稿查看

三种颜色状态

-   primary：主题
-   success：成功
-   danger：失败

四种尺寸大小

-   small：-
-   default：-
-   large：-
-   max：-

## API

按钮的属性说明如下：

| 属性    | 说明                  | 类型    | 默认值  | 备注                          |
| ------- | --------------------- | ------- | ------- | ----------------------------- |
| type    | 按钮类型              | string  | primary | -                             |
| colors  | 按钮颜色              | primary | -       | -                             |
| size    | 按钮尺寸              | string  | default | -                             |
| isHover | hover伪类样式是否常驻 | boolean | false   | -                             |
| rest    | 其余属性              | object  | -       | 这些属性参考ant-button组件API |
