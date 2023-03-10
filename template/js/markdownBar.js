let tocItems = [];
let tocifyIndex = 0;

const tocifyAdd = (text, level) => {
  if (level <= 4) {
    //标签过小不予展示
    const anchor = `toc${level}${++tocifyIndex}`;
    const item = { anchor, level, text };
    const items = tocItems;

    if (items.length === 0) {
      // 第一个 item 直接 push
      items.push(item);
    } else {
      let lastItem = items.slice(-1); // 最后一个 item

      if (item.level > lastItem.level) {
        // item 是 lastItem 的 children
        for (let i = lastItem.level + 1; i <= 2; i++) {
          const { children } = lastItem;
          if (!children) {
            // 如果 children 不存在
            lastItem.children = [item];
            break;
          }

          lastItem = children.slice(-1); // 重置 lastItem 为 children 的最后一个 item

          if (item.level <= lastItem.level) {
            // item level 小于或等于 lastItem level 都视为与 children 同级
            children.push(item);
            break;
          }
        }
      } else {
        // 置于最顶级
        items.push(item);
      }
    }

    return anchor;
  }
};

reset = () => {
  tocItems = [];
  tocifyIndex = 0;
};

const renderToc = (items) => {
  // 递归 render
  reset();
  return items.map(
    (item) =>
      `<div class="level-${item.level}">
        <a href="#${item.anchor}">
            ${item.text}
            ${item?.children ? renderToc(item.children) : ""}
        </a>
        </div>`
  );
};
