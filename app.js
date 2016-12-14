var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
//var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var index = require('./routes/index');

const ScoreManager = require('./token-manager.js');
const manager = new ScoreManager();

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
//app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);

app.post('/request', (req, res) => {
	if(!req.body.name){
		res.send(JSON.stringify({
			'status': false
		}));
		return;
	}
	res.send(JSON.stringify({
		'status': true,
		'token': manager.addToken(req.body.name)
	}));
});

app.post('/score', (req, res) => {
	if(req.body.token){
		if(manager.putScore(req.body.token, req.body.score)){
			res.send(JSON.stringify({
				'status': true
			}));
		}else{
			res.send(JSON.stringify({
				'status': false,
				'message': '점수 저장을 실패하였습니다.',
			}));
		}
	}else{
		res.send(JSON.stringify({
			'status': false,
			'message': '올바르지 않은 요청입니다.',
		}));
	}
});

app.post('/rank', (req, res) => {
	manager.getTopPlayers()
		.then((val) => {
			res.send(JSON.stringify({
				'status': true,
				'data': val
			}));
		}).catch((err) => {
			console.error(err);
			res.send(JSON.stringify({
				'status': false,
				'message': '랭크를 불러오는 데 실패하였습니다.'
			}))
		});
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});

// error handler
app.use(function(err, req, res, next) {
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};

	// render the error page
	res.status(err.status || 500);
	res.render('error');
});

module.exports = app;
