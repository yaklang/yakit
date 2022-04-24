const axios = require("axios");

const service = axios.create({
  baseURL: "http://yakittest.vaiwan.cn/",
  timeout: 20 * 1000, // 请求超时时间
});

// request拦截器,拦截每一个请求加上请求头
service.interceptors.request.use(
  (config) => {
    // config.headers.post["Content-Type"] = "application/x-www-fromurlencodeed";
    return config;
  },
  (error) => {
    console.log(error);
    Promise.reject(error);
  }
);

// respone拦截器 拦截到所有的response，然后先做一些判断
service.interceptors.response.use(
  (response) => {
    const res = response.data;

    if (!res.ok)
      return Promise.reject(res.reason || "请求失败,请稍等片刻后再次尝试");
    else return response.data;
  },
  (error) => {
    console.log(error);
    return Promise.reject(error);
  }
);

function httpApi(method, url, params) {
  if (!["get", "ppost"].includes(method)) {
    return Promise.reject(`call yak echo failed: ${e}`);
  }

  return service({
    url: url,
    method: method,
    params: method === "get" ? params : undefined,
    data: method === "post" ? params : undefined,
  });
}

module.exports = {
  service,
  httpApi,
};
