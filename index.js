const express = require('express');
const cookieParser = require('cookie-parser')
const { createProxyMiddleware } = require('http-proxy-middleware');
// const crypto = require('crypto-js');
const uuid = require('node-uuid');

const app = express();

app.use(cookieParser());

const Proxies = [
    { 'text': 'web1', 'path': 'test', 'proxy': createProxyMiddleware({ target: 'http://192.168.1.1', changeOrigin: true }) },
    { 'text': 'web2', 'path': 'openwrt', 'proxy': createProxyMiddleware({ target: 'http://192.168.2.1', changeOrigin: true }), 'token': '0000' },
]

const Tokens = {};
setInterval(() => {
    for (key in Tokens) {
        if ((new Date()).getTime() - Tokens[key] > 1800000) {
            console.log('delete token', key);
            delete Tokens[key];
        }
    }
}, 5000);

app.get('/reset', (req, res) => {
    res.clearCookie('mult_server_domain');
    res.clearCookie('mult_server_token')
    res.redirect('/');
});

app.use((req, res, next) => {
    let domain_id = parseInt(req.cookies['mult_server_domain'])
    if (domain_id || domain_id === 0) {
        if (Proxies[domain_id]['token'] && !(req.cookies['mult_server_token'] in Tokens)) {
            next();
        }
        Proxies[domain_id]['proxy'](req, res);
    } else {
        next();
    }

});

const Proxies_new = {};

Proxies.forEach((item, index) => {
    Proxies_new[item['text']] = { 'path': item['path'], 'token': item['token'] ? true : false }
    app.get(`/${item['path']}`, (req, res) => {
        res.cookie('mult_server_domain', index.toString(), {
            path: '/',
        });
        if (item['token']) {
            if (req.query['token'] == item['token']) {
                let timeNow = (new Date()).getTime();
                // let t = crypto.SHA256(timeNow + uuid.v4()).toString();
                let t = uuid.v1();
                Tokens[t] = timeNow;
                res.cookie('mult_server_token', t, {
                    path: '/',
                });
            }else{
                res.end('鉴权失败');
                return;
            }
        }
        res.redirect('/');
    });
});


const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>多服务反代系统</title>
    <style>
        .selection {
            background-color: dodgerblue;
            color: white;
            font-size: xx-large;
            padding: 10px 60px;
            margin-top: 20px;
        }
    </style>
</head>
<body style="margin: 0px 0px;">
    <div id="passwd_dia" style="display: none;position:fixed;left: 50%;top: 50%;transform: translate(-50%, -50%);flex-direction: column;box-shadow: 1px 1px 8px black;">
        <div style="background-color:navy;color: white;font-size: larger;padding: 5px 10px;">密码：</div>
        <div style="padding: 5px;display: flex;">
            <input type="password" id="password">
            <button onclick="passwd_btn()" style="margin-left:2px">ok</button>
        </div>
    </div>
    <div id="container" style="display: flex;flex-direction: column; align-items: center;">
    </div>
    <script>
        const Proxies = ${JSON.stringify(Proxies_new)}
        /*const Proxies = {
            // '66666': { 'path': '66', 'token': true },
        }*/
        const body = document.getElementById("container");
        const passwd_dia = document.getElementById("passwd_dia");
        const password = document.getElementById("password");
        var jump_path = "";
        function clickFun(e) {
            if (Proxies[e.innerText]['token']) {
                jump_path = Proxies[e.innerText]['path'];
                passwd_dia.style.display = 'flex';
            } else {
                window.location.href = Proxies[e.innerText]['path'];
            }
        }
        function passwd_btn() {
            window.location.href = jump_path + "?token=" + password.value;
        }
        for (key in Proxies) {
            body.innerHTML += '<div class="selection" onclick="clickFun(this)">' + key + '</div>'
        }
    </script>
</body>
</html>
`


app.get('/', (req, res) => {
    res.end(html);
});

app.listen(62220, () => {
    console.log('ok')
});
