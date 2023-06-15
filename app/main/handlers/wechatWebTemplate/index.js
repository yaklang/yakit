const templateStr = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>验证成功</title>
    <style>
      html,
      body {
        font-family: Arial, Helvetica, sans-serif;
        background-color: #f2f2f2;
        height: 100%;
        width: 100%;
        padding: 0px;
        margin: 0px;
      }
      .main {
        height: 100%;
        width: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
      }

      .header {
        position: fixed;
        top: 0;
        height: 60px;
        width: 100%;
        padding: 10px 0 10px 60px;
      }

      .logo-img {
        display: inline-block;
        height: 80px;
        width: 80px;
      }
      .logo-img svg {
        height: 64px;
        width: 64px;
      }

      .container {
        margin: 0 auto;
        max-width: 800px;
        padding: 50px;
        background-color: #ffffff;
        border-radius: 10px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
        text-align: center;
      }

      h1 {
        font-size: 36px;
        color: #444444;
        margin-bottom: 20px;
        margin-top: 0px;
      }

      p {
        font-size: 18px;
        color: #777777;
        line-height: 1.5;
        margin-bottom: 30px;
      }

      a {
        color: #ffffff;
        background-color: #f28b44;
        padding: 10px 20px;
        text-decoration: none;
        border-radius: 5px;
        font-size: 18px;
        transition: all 0.3s ease;
        cursor: pointer;
      }

      a:hover {
        background-color: #f28b44;
      }

      .middle-loading-body {
        min-width: 400px;
        min-height: 350px;
        width: 50%;
        height: 35%;
      }
      .multi-spinner-container {
        width: 150px;
        height: 150px;
        position: relative;
        margin: 30px auto;
        overflow: hidden;
      }
      .multi-spinner-container .multi-spinner {
        position: absolute;
        width: calc(100% - 9.9px);
        height: calc(100% - 9.9px);
        border: 5px solid transparent;
        border-top-color: #ff5722;
        border-radius: 50%;
        -webkit-animation: spin 5s cubic-bezier(0.17, 0.49, 0.96, 0.76) infinite;
        animation: spin 5s cubic-bezier(0.17, 0.49, 0.96, 0.76) infinite;
      }
      .loading-body-title {
        padding-top: 40px;
        height: 50px;
        line-height: 50px;
        text-align: center;
        font-size: 24px;
        font-weight: 600;
      }
      @keyframes spin {
        from {
          -webkit-transform: rotate(0deg);
          transform: rotate(0deg);
        }
        to {
          -webkit-transform: rotate(360deg);
          transform: rotate(360deg);
        }
      }
      .fail-box,
      .succee-box {
        display: none;
      }
    </style>
  </head>
  <body>
    <div class="main">
      <div id="succee" class="container succee-box">
        <div class="logo-img">
          <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M21.6667 5H6.66671C5.78265 5 4.93481 5.35119 4.30968 5.97631C3.68456 6.60143 3.33337 7.44928 3.33337 8.33333V25C3.33337 25.8841 3.68456 26.7319 4.30968 27.357C4.93481 27.9821 5.78265 28.3333 6.66671 28.3333H33.3334C34.2174 28.3333 35.0653 27.9821 35.6904 27.357C36.3155 26.7319 36.6667 25.8841 36.6667 25V20"
              stroke="#56C991"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M13.3334 35H26.6667"
              stroke="#56C991"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M20 28.3334V35"
              stroke="#56C991"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M28.3334 13.3333L36.6667 5"
              stroke="#56C991"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M28.3334 5H36.6667V13.3333"
              stroke="#56C991"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
        <h1>验证成功</h1>
        <p>账号验证成功，点击返回开启Yakit安全之旅。</p>
        <a id="goBackSuccee">返回 Yakit</a>
      </div>

      <div id="fail" class="container fail-box">
        <div class="logo-img">
          <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M21.6667 5H6.66671C5.78265 5 4.93481 5.35119 4.30968 5.97631C3.68456 6.60143 3.33337 7.44928 3.33337 8.33333V25C3.33337 25.8841 3.68456 26.7319 4.30968 27.357C4.93481 27.9821 5.78265 28.3333 6.66671 28.3333H33.3334C34.2174 28.3333 35.0653 27.9821 35.6904 27.357C36.3155 26.7319 36.6667 25.8841 36.6667 25V20"
              stroke="#F7544A"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M13.3334 35H26.6667"
              stroke="#F7544A"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M20 28.3334V35"
              stroke="#F7544A"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M36.6667 5L28.3334 13.3333"
              stroke="#F7544A"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M28.3334 5L36.6667 13.3333"
              stroke="#F7544A"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
        <h1>验证失败</h1>
        <p>请求异常，请返回Yakit重新登录。</p>
        <a id="goBackFail">返回 Yakit</a>
      </div>

      <div id="load" class="middle-loading-body">
        <div class="multi-spinner-container">
          <div class="multi-spinner">
            <div class="multi-spinner">
              <div class="multi-spinner">
                <div class="multi-spinner">
                  <div class="multi-spinner">
                    <div class="multi-spinner"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="loading-body-title">正在登录验证中，请稍等片刻......</div>
      </div>
    </div>

    <script>
      function GetQueryString(name) {
        var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
        var r = window.location.search.substr(1).match(reg); //获取url中"?"符后的字符串并正则匹配
        var context = "";
        if (r != null) context = decodeURIComponent(r[2]);
        reg = null;
        r = null;
        return context == null || context == "" || context == "undefined"
          ? ""
          : context;
      }
      const goBackXhr = () => {
        //1、创建一个 xhr 的对象
        let xhr = new XMLHttpRequest();
        //2、调用xhr中的open()函数,创建一个Ajax的请求
        xhr.open("GET", "/goback");
        //3、调用xhr的send函数，发起请求
        xhr.send();
        //4、监听 onreadystatechange 事件
        xhr.onreadystatechange = function () {
          if (xhr.readyState === 4 && xhr.status === 200) {
            //数据获取成功，获取服务器响应的数据
            console.log("goBack", xhr.responseText);
            window.location.replace("about:blank");
            window.close();
          }
        };
      };
      const judgeSignin = () => {
        //1、创建一个 xhr 的对象
        let xhr = new XMLHttpRequest();
        //2、调用xhr中的open()函数,创建一个Ajax的请求
        xhr.open("GET", "/judgeSignin?code="+GetQueryString("code"));
        //3、调用xhr的send函数，发起请求
        xhr.send();
        //4、监听 onreadystatechange 事件
        xhr.onreadystatechange = function () {
          if (xhr.readyState === 4 && xhr.status === 200) {
            //数据获取成功，获取服务器响应的数据
            const res = JSON.parse(xhr.responseText);
            document.getElementById("load").style.display = "none";
            // 是否登录
            if (res.login) {
              document.getElementById("succee").style.display = "block";
            } else {
              document.getElementById("fail").style.display = "block";
            }
          }
        };
      };
      window.onload = () => {
        judgeSignin();
      };
      document
        .getElementById("goBackSuccee")
        .addEventListener("click", (e) => goBackXhr());
      document
        .getElementById("goBackFail")
        .addEventListener("click", (e) => goBackXhr());
    </script>
  </body>
</html>

`

module.exports = {
    templateStr
}
