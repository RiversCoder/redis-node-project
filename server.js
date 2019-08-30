const express  = require('express');
const axios = require('axios');
const redis = require('redis');
const path = require('path');

const PORT = process.env.PORT || 5002;
const REDIS_PORT = process.env.PORT || 6379;

const client = redis.createClient(REDIS_PORT);
const app = express();

// 设置静态文件路径
app.use(express.static(path.join(__dirname, 'public')))

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