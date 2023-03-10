// 构建table
const initTable = (content) => {
  let contentObj = JSON.parse(content);
  //   console.log("contentObj", contentObj);
  let tableStr = `<table class="pure-table">
    <thead>
        <tr>`;
  if (contentObj?.header && Array.isArray(contentObj.header)) {
    contentObj.header.map((item) => {
      tableStr += `<th>${item}</th>`;
    });
  }
  tableStr += `</tr>
    </thead>
    <tbody>`;
  if (contentObj?.data && Array.isArray(contentObj.data)) {
    contentObj.data.map((item, index) => {
      tableStr += `<tr ${index % 2 !== 1 ? 'class="pure-table-odd"' : ""}>`;
      if (Array.isArray(item)) {
        item.map((itemIn) => {
          tableStr += `<td>${itemIn}</td>`;
        });
      }
      tableStr += `</tr>`;
    });
  }
  tableStr += ` </tbody>
    </table>`;
  return tableStr;
};

const isOpenTableFun = (id, index) => {
  const openStatus = $(`#${id}-${index}`).hasClass("open");
  // open点击展开 close点击关闭
  if (openStatus) {
    $(`#${id}-${index}`).removeClass("open").addClass("close");
    $(`#${id}`).css("display", "table-row");
  } else {
    $(`#${id}-${index}`).removeClass("close").addClass("open");
    $(`#${id}`).css("display", "none");
  }
};

// 唯一标识符
function GetUniqueID() {
  // 当前时间转成 36 进制字符串
  var time = Date.now().toString(36);
  // 当前随机数转成 36 进制字符串
  var random = Math.random().toString(36);
  // 去除随机数的 0. 字符串
  random = random.substring(2, random.length);
  // 返回唯一ID
  return random + time;
}

// 构建收缩table
const initExtendTable = (content) => {
  let contentObj = JSON.parse(content);
  //   console.log("contentObj", contentObj);
  let tableStr = `<table class="pure-table">
    <thead>
        <tr>`;
  if (contentObj?.header && Array.isArray(contentObj.header)) {
    contentObj.header.map((item) => {
      tableStr += `<th>${item}</th>`;
    });
  }
  tableStr += `</tr>
    </thead>
    <tbody>`;
  if (contentObj?.data && Array.isArray(contentObj.data)) {
    contentObj.data.map((item, index) => {
      const onlyId = GetUniqueID();
      tableStr += `<tr ${
        index % 2 !== 1
          ? 'class="pure-table-hover pure-table-odd"'
          : 'class="pure-table-hover"'
      } onclick="isOpenTableFun('${onlyId}',${index})">`;
      if (Array.isArray(item)) {
        item.map((itemIn, indexIn) => {
          // 添加扩展图标
          if (indexIn === 0) {
            tableStr += `<td>
          <a id="${onlyId}-${index}" class="open"></a>
          <span style="padding-left:20px">${itemIn}</span>
          </td>`;
          } else {
            tableStr += `<td>${itemIn}</td>`;
          }
        });
      }
      tableStr += `</tr>`;
      // 扩展项
      tableStr +=
        `<tr id="${onlyId}" style="border: 1px solid #cbcbcb;display:none;">
                      <th colspan="4">` +
        initTable(content) +
        // <div style="height: 53px;">
        //   扩展的内容
        // </div>
        `</th>
                   </tr>`;
    });
  }
  tableStr += ` </tbody>
    </table>`;
  return tableStr;
};
