## Redis 缓存请求内容，优化 API 接口性能
---
在我们日常的接口开发过程中，或者第三方请求的过程中，每次刷新页面都会重新请求接口，而且大部分接口短时间内是不会变化的；
在某些场景下，我们需要转发某些第三方的API接口；所以在多次请求的情况下，就会造成很大资源浪费，也不利于WEB应用交互性能优化；
我们这章节呢，将会使用`Redis`对第三方请求内容做个一个定期缓存，在某个时限内，我们将会直接从本地Redis取出我们的数据，传递给
我们的客户端，这样就可以极大的我们的接口性能
本章节呢，主要涉及到以下的知识点：

* windows下安装Redis
* Redis命令行工具使用
* express本地服务搭建
* github api 接口封装
* redis接口内容缓存

## 安装 Redis

首先我们需要安装`redis`，当然目前我的系统是`win10`，所以我们需要去到如下链接下载：

* 文档页面：https://github.com/microsoftarchive/redis
* 下载页面：http://github.com/MSOpenTech/redis/releases

我们可以下载最新的版本`3.2.100`，如下图所示：

图片占位符

下载好这个 `Redis-x64-3.2.100.msi` 软件，双击安装，勾选上添加到环境变量复选框，一直往下`next` ，即可

## 安装依赖

接下来我们需要初始化我们的项目目录，且安装我们依赖

```shell
    cnpm init -y
    cnpm install -S axiso redis express
```

## 编辑代码`server.js`

```js
const express  = require('express');
const axios = require('axios');
const redis = require('redis');

const PORT = process.env.PORT || 5000;
const REDIS_PORT = process.env.PORT || 6379;

const client = redis.createClient(REDIS_PORT);
const app = express();


// 缓存中间件
function cache(req, res, next){
    const { username } = req.params;
    console.log(username);
    // 检测缓存中是否存在当前用户信息
    client.get( username, (err, data) => {
        if(err) throw err;
        if(data != null){
            res.send( `<h3>${username} has ${data} github repos.</h3>` )
        }else{
            next()
        }
    })
}

// 接口请求 github data
app.use('/repos/:username', cache);
app.get('/repos/:username', async (req, res, next) => {
    try{
        console.log('Requesting data...');
        const { username } = req.params;
        const response = await axios.get(`https://api.github.com/users/${username}`);
        const result = response.data
        const reposNumber = result.public_repos;
        
        // 把数据存入 Redis
        client.set( username, reposNumber );
        res.send(`<h3>${username} has ${reposNumber} github repos.</h3>`);
        
    }catch(e){
        console.error(e)
        res.status(500)
    }
});


app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}.`)
});
````




