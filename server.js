const express  = require('express');
const axios = require('axios');
const redis = require('redis');
const path = require('path');

const PORT = process.env.PORT || 5002;
const REDIS_PORT = process.env.PORT || 6379;

const client = redis.createClient({
	port: REDIS_PORT,
	password: 'wu5229485'
});
const app = express();


// 注册模板
app.set('views', './views'); // 指定视图所在的位置
app.set('view engine', 'ejs'); // 注册模板引擎
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

// 缓存仓库中间件
function cacheRepos(req, res, next){
	// 判断是否存在参数
	if(!req.query['searchValue']){
		res.render('index', { title: 'Github API', list: []});
		return
	}
	const { searchValue } = req.query;

	// 检测缓存中是否存在当前用户信息
	client.get( searchValue+'-repos', (err, data) => {
		if(err) throw err;
		if(data != null){
			res.render('index', { title: 'Github API', list: JSON.parse(data)});
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


// 测试返回页面
app.use('/', cacheRepos);
app.get('/', async (req, res, next) => {
	// 接收参数
	const { searchValue } = req.query
	const response = await axios.get(`https://api.github.com/users/${searchValue}/repos`)
	const result = response.data
	let list = []
	result.forEach(v => {
		list.push({
			reposName: v.full_name,
			reposUrl: v.html_url,
			lang: v.language,
			fork: v.forks_count,
			star: v.stargazers_count
		})
	})
	// 把数据存入 Redis
	client.set( searchValue+'-repos', JSON.stringify(list) );
	res.render('index', { title: 'Github API', list});
})



app.listen(PORT, () => {
	console.log(`App listening on port ${PORT}.`)
});