let solidOptionPie = {
  title: {
    text: "Referer of a Website",
    subtext: "Fake Data",
    left: "center",
  },
  tooltip: {
    trigger: "item",
  },
  legend: {
    orient: "vertical",
    left: "left",
  },
  series: [
    {
      name: "Access From",
      type: "pie",
      radius: "50%",
      data: [
        { value: 1048, name: "Search Engine" },
        { value: 735, name: "Direct" },
        { value: 580, name: "Email" },
        { value: 484, name: "Union Ads" },
        { value: 300, name: "Video Ads" },
      ],
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: "rgba(0, 0, 0, 0.5)",
        },
      },
    },
  ],
};

const initSolidOptionPie = (content) => {
  const {title,value,color} = content
  // 数据构造
  return solidOptionPie;
};

let optionBar = {
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'shadow'
    }
  },
  xAxis: {
    type: "category",
    data: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  },
  yAxis: {
    type: "value",
  },
  series: [
    {
      data: [120, 200, 150, 80, 70, 110, 130],
      type: "bar",
    },
  ],
};

// 竖向柱状图
const initVerticalOptionBar = (content) => {
  const {title,value,color} = content
  let newOptionBar = JSON.parse(JSON.stringify(optionBar));
  newOptionBar.xAxis.data = title||[]
  newOptionBar.series[0].data = value||[]
  // 数据构造
  return newOptionBar;
};

// 横向柱状图
const initHorizontalOptionBar = (content) => {
  const {title,value,color} = content
  let newOptionBar = JSON.parse(JSON.stringify(optionBar));
  newOptionBar.xAxis.type = "value";
  newOptionBar.yAxis.type = "category";

  // 数据构造
  return newOptionBar;
};
