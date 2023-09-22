
var config = {
    mode: "fixed_servers",
    rules: {
      singleProxy: {
        scheme: "http",
        host: "127.0.0.1",
        port: parseInt(8083)
      },
    }
  };

chrome.proxy.settings.set({value: config, scope: "regular"}, function() {});

function callbackFn(details) {
return {
    authCredentials: {
        username: "admin",
        password: "123"
    }
};
}

chrome.webRequest.onAuthRequired.addListener(
        callbackFn,
        {urls: ["<all_urls>"]},
        ['blocking']
);
