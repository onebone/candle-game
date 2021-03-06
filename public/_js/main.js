var MAX_CANDLES = 60;
var CANDLE_WIDTH = 10;
var CANDLE_HEIGHT = 60;
var UPDATE_INTERVAL = 20;
var GAME_SECONDS = 120;
var MAX_HEALTH = 4;
var HEART_SIZE = 70;
var IMMORTAL_SECONDS = 3;

var STATUS_PREVIEW = 0;
var STATUS_COUNTDOWN = 1;
var STATUS_ONGOING = 2;
var STATUS_REVIEW = 3;

var MESSAGES = {
	game_score: '점수: ',
	game_over: '게임 종료'
};

var LEVELS = [
	{ // 1
		speed:  5,
		max:    45,
	},
	{ // 2
		speed:  6.5,
		max:    50,
	},
	{ // 3
		speed:  8,
		max:    60,
	},
	{ // 4
		speed: 9,
		max: 65,
	},
	{ // 5
		speed: 10,
		max: 80
	}
];

var deg2rad = Math.PI / 180;

var mouse = {x: 0, y: 0};
document.onmousemove = function(e){
	mouse.x = e.pageX;
	mouse.y = e.pageY;
};

var canvas = null, ctx = null;
var game = null;

var img = new Image();
img.src = "/_img/plqyer.png";

window.onload = function(){
	elements = {
		name: document.getElementById('name'), // input field
		info: document.getElementById('info'), // paragraph,
		nameholder: document.getElementById('nameholder'), // div
		rank: document.getElementById('ranktable')
	};

	canvas = document.getElementById('main');
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;

    ctx = canvas.getContext('2d');

	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';

	setInterval(update, UPDATE_INTERVAL);

	new Game();
};

function update(){
	//games.forEach(function(game){
	//	game.update();
	//});
	game.update();
}

function Game(name){
	//games.push(this);
	game = this;

	this.tick = 0;
	this.maxTick = secondsToTick(GAME_SECONDS);
	this.candles = [];
	this.bar = new StatusBar();
	this.player = new Player(this, name);
	this.health = new Health();

	this.name = '';

	this.token = null;

	this.changeStatus(STATUS_PREVIEW);

	this.field = {
		left: window.innerWidth * (1/15),
		right: window.innerWidth * (14/15),
		bottom: window.innerHeight * (7/8),
		top: window.innerHeight * (1/8)
	};
}

Game.prototype.start = function(){
	this.changeStatus(STATUS_COUNTDOWN);
	this.tick = 0;
};

Game.prototype.update = function(){
	this.tick++;

	ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

	this.draw();

	if(this.status !== STATUS_COUNTDOWN && this.candles.length < MAX_CANDLES && Math.random() < 0.5){ // 50%
		var random = Math.random();

		if(random < 0.50){ // 위 혹은 아래에서 출발
			var y = random < 0.25 ? -CANDLE_HEIGHT : window.innerHeight + CANDLE_HEIGHT;

			this.candles.push(new Candle(new Vector2(Math.floor(Math.random() * window.innerWidth), y),
				new Vector2(Math.floor(Math.random() * window.innerWidth), window.innerHeight + y)));
		}else{ // 왼쪽 혹은 아래에서 출발
			random -= 0.50;

			var x = random < 0.25 ? -CANDLE_WIDTH : window.innerWidth + CANDLE_WIDTH;

			this.candles.push(new Candle(new Vector2(x, Math.floor(Math.random() * window.innerHeight)),
				new Vector2(window.innerWidth + x, Math.floor(Math.random() * window.innerHeight))));
		}
	}

	this.bar.draw();

	this.health.draw();

	var that = this;

	var level = Math.floor(this.tick * LEVELS.length / this.maxTick) % LEVELS.length;
	MAX_CANDLES = LEVELS[level].max; // FIXME: MAX_CANDLES is not constant

	this.candles.forEach(function(candle, index){
		candle.speed = LEVELS[level].speed;

		candle.tick();

		if(candle.to.x === candle.vec.x && candle.to.y === candle.vec.y){
			that.candles.splice(index, 1);
		}
	});

	if(this.status === STATUS_COUNTDOWN){
		var seconds = 3 - tickToSeconds(this.tick);

		this.candles = [];

		if(seconds <= 0){
			this.changeStatus(STATUS_ONGOING);
			this.tick = 0;
		}else{
			this.countdown(seconds);

			this.draw();
			this.bar.draw();
			this.health.draw();
		}
		return;
	}else if(this.status === STATUS_REVIEW){
		this.draw();
		this.bar.draw();
		this.health.draw();

		if(this.tick > secondsToTick(10)){
			this.changeStatus(STATUS_PREVIEW);
		}

		this.showResult();
		return;
	}else if(this.status === STATUS_PREVIEW){
		this.draw();
		this.bar.draw();
		this.health.draw();
		return;
	}

	this.bar.set(this.tick / this.maxTick * 100);
	if(this.tick > this.maxTick){
		this.changeStatus(STATUS_REVIEW);
		return;
	}

	this.player.tick();
};

Game.prototype.changeStatus = function(status){
	if(this.status === status) return;
	this.status = status;
	this.tick = 0;

	switch(this.status){
		case STATUS_PREVIEW:
			this.health.health = MAX_HEALTH;
			this.bar.set(0);
			this.score = 0;
			this.lastScore = 0;

			elements.nameholder.style = '';
			this.name = '';

			var xhr = new XMLHttpRequest();
			xhr.open('POST', '/rank', true);
			xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
			xhr.onreadystatechange = function(){
				if(xhr.readyState === XMLHttpRequest.DONE){
					var res = JSON.parse(xhr.responseText);

					if(!res.status){
						elements.info.innerHTML = '순위 동기화 실패';
					}else{
						var data = res.data;

						elements.rank.innerHTML = '<tr><th>이름</th><th>점수</th></tr>';
						Object.keys(data).reverse().forEach(function(score){
							elements.rank.innerHTML += '<tr><td>' + data[score] + '</td><td>' + score + '</td></tr>';
						});
					}
				}
			};

			xhr.send();
			break;
		case STATUS_COUNTDOWN:
			elements.nameholder.style = 'display: none;';
			break;
		case STATUS_REVIEW:
			var xhr = new XMLHttpRequest();
			xhr.open('POST', '/score', true);
			xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
			xhr.onreadystatechange = function(){
				if(xhr.readyState === XMLHttpRequest.DONE){
					var res = JSON.parse(xhr.responseText);

					if(!res.status){
						alert(res.message || '알 수 없는 이유로 점수 저장 실패 ㅠㅠ');
					}
				}
			};
			xhr.send('score='+ this.score +'&token=' + this.token);
			break;
	}
};

Game.prototype.countdown = function(sec){
	setFontSize(500);
	ctx.fillStyle = 'black';
	ctx.fillText(Math.ceil(sec) + '', window.innerWidth/2, window.innerHeight/2);
};

Game.prototype.showResult = function(){
	if(this.status !== STATUS_REVIEW) return;

	ctx.fillStyle = 'aqua';
	ctx.fillRect(this.field.left, this.field.top, this.field.right - this.field.left, this.field.bottom - this.field.top);
	ctx.fillStyle = 'white';

	setFontSize(100);
	ctx.fillText(MESSAGES.game_over, window.innerWidth/2, window.innerHeight/2 + 150);
	ctx.fillText(MESSAGES.game_score + this.score, window.innerWidth/2, window.innerHeight/2 - 150);
};

Game.prototype.draw = function(){
	// draw field
	ctx.beginPath();
	ctx.moveTo(this.field.left, this.field.top);
	ctx.lineTo(this.field.right, this.field.top);
	ctx.lineTo(this.field.right, this.field.bottom);
	ctx.lineTo(this.field.left, this.field.bottom);
	ctx.lineTo(this.field.left, this.field.top);
	ctx.strokeStyle = 'red';
	ctx.stroke();

	ctx.fillStyle = 'black';
	setFontSize(50);
	ctx.fillText(this.score, window.innerWidth - 100, 50);
	setFontSize(25);
	ctx.fillText(this.name, window.innerWidth - 100, 100);
};

function Player(game){
	this.game = game;

	this.vec = new Vector2(window.innerWidth / 2, window.innerHeight / 2);
	this.scale = new Vector2(40, 40);
}

Player.prototype.update = function(){
	if(!this.boundingBox){
		this.boundingBox = new BoundingBox(0, 0, 0, 0);
	}

	this.boundingBox.set(this.vec.x - this.scale.x/2, this.vec.y - this.scale.y/2, this.vec.x + this.scale.x/2, this.vec.y + this.scale.y/2);
};

Player.prototype.tick = function(){
	mouse.x = Math.min(this.game.field.right, Math.max(mouse.x, this.game.field.left));
	mouse.y = Math.min(this.game.field.bottom, Math.max(mouse.y, this.game.field.top));
	var lastX = this.vec.x;
	var lastY = this.vec.y;
	this.vec.set(mouse.x, mouse.y);

	this.update();

	if(this.game.health.immortal <= 0 || this.game.health.immortal % secondsToTick(0.5) > secondsToTick(0.25)){
		this.draw();
	}
	this.game.health.immortal--;

	var that = this;
	var distance = [];

	var minX, maxX;
	if(lastX - this.vec.x < 0){ // 오른쪽으로 이동
		minX = lastX - this.scale.x/2;
		maxX = this.vec.x + this.scale.x/2;
	}else{
		minX = this.vec.x - this.scale.x/2;
		maxX = lastX + this.scale.x/2;
	}

	var bb = new BoundingBox2(minX, maxX, lastY + this.scale.y/2, lastY - this.scale.y/2, this.vec.y + this.scale.y/2, this.vec.y - this.scale.y/2);
	this.game.candles.forEach(function(candle){
		if(that.game.health.immortal <= 0 && that.game.status === STATUS_ONGOING){
			if(bb.collidesWith(candle.boundingBox)){
				that.game.health.harm();

				if(that.game.health.health <= 0){
					that.game.changeStatus(STATUS_REVIEW);
					return;
				}
				that.game.health.immortal = secondsToTick(IMMORTAL_SECONDS);
			}
		}

		distance.push(candle.vec.distance(that.vec));
	});

	if(this.game.status === STATUS_ONGOING){
		if(this.game.lastScore - this.game.score > 2500 * secondsToTick(1)) this.game.score = 0;

		if(this.game.tick % secondsToTick(1) === 0){
			distance.sort();
			for(var i = 0; i < Math.min(3, distance.length); i++){
				this.game.score += Math.ceil(distance[i] * 0.25);
			}
		}
	}
};

Player.prototype.draw = function(){
	ctx.drawImage(img, this.boundingBox.minX, this.boundingBox.minY, this.boundingBox.maxX - this.boundingBox.minX, this.boundingBox.maxY - this.boundingBox.minY);
	//ctx.fillRect(this.boundingBox.minX, this.boundingBox.minY, this.boundingBox.maxX - this.boundingBox.minX, this.boundingBox.maxY - this.boundingBox.minY);
};

function Candle(pos, to){
    this.vec = pos;
	this.to = to;

	this.scale = new Vector2(15, 90);

	this.speed = 7;

	this.update();
}

Candle.prototype.tick = function(){
	var total = Math.abs(this.vec.x - this.to.x) + Math.abs(this.vec.y - this.to.y);

	var negX = (this.to.x - this.vec.x) > 0 ? 1 : -1;
	var negY = (this.to.y - this.vec.y) > 0 ? 1 : -1;

	var speedX = Math.abs(this.vec.x - this.to.x) * this.speed / total;
	if(Math.abs(this.vec.x - this.to.x) < speedX){
		this.vec.x = this.to.x;
		speedX = 0;
	}

	var speedY = Math.abs(this.vec.y - this.to.y) * this.speed / total;
	if(Math.abs(this.vec.y - this.to.y) < speedY){
		this.vec.y = this.to.y;
		speedY = 0;
	}

	var ratioX = Math.min(Math.abs(this.vec.x - this.to.x), speedX);
	var ratioY = Math.min(Math.abs(this.vec.y - this.to.y), speedY);

	this.move(ratioX * negX, ratioY * negY);
};

Candle.prototype.move = function(dx, dy){
	this.vec.add(dx, dy);

	this.update();
};

Candle.prototype.update = function(){
	if(this.boundingBox === undefined) {
		this.boundingBox = new BoundingBox(this.vec.x, this.vec.y, this.vec.x + this.scale.width, this.vec.y + this.scale.height);
	}

	this.boundingBox.set(this.vec.x, this.vec.y, this.vec.x + CANDLE_WIDTH, this.vec.y + CANDLE_HEIGHT);

	this.draw();
};

Candle.prototype.draw = function(){
	var bottomWidth = CANDLE_WIDTH;
	var bottomHeight = CANDLE_HEIGHT * (1/3);

	ctx.strokeStyle = 'black';
	ctx.strokeRect(this.vec.x, this.vec.y + bottomHeight, bottomWidth, bottomHeight * 2);

	ctx.beginPath();
	ctx.arc(this.vec.x + CANDLE_WIDTH/2, this.vec.y + CANDLE_HEIGHT/7, CANDLE_WIDTH / 2, 0, 180 * deg2rad);

	ctx.moveTo(this.vec.x, this.vec.y + CANDLE_HEIGHT/7);
	ctx.lineTo(this.vec.x + CANDLE_WIDTH/2, this.vec.y);
	ctx.lineTo(this.vec.x + CANDLE_WIDTH, this.vec.y + CANDLE_HEIGHT/7);

	ctx.fillStyle = 'red';
	ctx.fill();


	// TEST
	ctx.fillStyle = 'aqua';
	//ctx.fillRect(this.boundingBox.minX, this.boundingBox.minY, this.boundingBox.maxX - this.boundingBox.minX, this.boundingBox.maxY - this.boundingBox.minY);
};

function StatusBar(){
	this.status = 0;

	this.vec = new Vector2(window.innerWidth / 4, 10);
	this.scale = new Vector2(window.innerWidth / 2, 3);
}

StatusBar.prototype.set = function(v){
	v = v || 0;
	this.status = Math.max(0, Math.min(100, v));
};

StatusBar.prototype.draw = function(){
	ctx.strokeStyle = 'magenta';
	ctx.strokeRect(this.vec.x, this.vec.y + this.scale.y, this.scale.x, this.scale.y);
	ctx.fillStyle = 'magenta';
	ctx.fillRect(this.vec.x, this.vec.y + this.scale.y, this.scale.x * (this.status / 100), this.scale.y);

	ctx.beginPath();
	ctx.moveTo(this.vec.x + this.scale.x * (this.status / 100), this.vec.y + this.scale.y + 10);
	ctx.lineTo(this.vec.x + this.scale.x * (this.status / 100) - 5, this.vec.y + this.scale.y + 18);
	ctx.lineTo(this.vec.x + this.scale.x * (this.status / 100) + 5, this.vec.y + this.scale.y + 18);
	ctx.fillStyle = 'red';
	ctx.fill();
};

function Health(){
	this.vec = new Vector2(window.innerWidth * (2/3), window.innerHeight * (9/10));

	this.health = MAX_HEALTH;
	this.immortal = 0;
}

Health.prototype.harm = function(v){
	if(this.immortal > 0) return;

	this.health -= v || 1;
};

Health.prototype.draw = function(){
	//var x = this.vec.x;
	var y = this.vec.y;

	ctx.strokeStyle = 'red';
	ctx.fillStyle = 'red';

	for(var i = 0; i < MAX_HEALTH; i++){
		var x = this.vec.x + i * HEART_SIZE + 10;

		ctx.beginPath();
		ctx.moveTo(x + HEART_SIZE / 2, y);

		ctx.bezierCurveTo(x, y - HEART_SIZE * 0.3, x + HEART_SIZE / 4, y - HEART_SIZE, x + HEART_SIZE / 2, y - HEART_SIZE / 2);
		ctx.bezierCurveTo(x + HEART_SIZE * 0.75, y - HEART_SIZE, x + HEART_SIZE, y - HEART_SIZE * 0.3, x + HEART_SIZE / 2, y);

		this.health > i ? ctx.fill() : ctx.stroke();
	}
};

function Vector2(x, y){
	this.x = x;
	this.y = y;
}

Vector2.prototype.add = function(x, y){
	this.x += (x || 0);
	this.y += (y || 0);

	return this;
};

Vector2.prototype.set = function(x, y){
	this.x = x || 0;
	this.y = y || 0;
};

Vector2.prototype.distance = function(vec){
	return Math.sqrt(Math.pow(vec.x - this.x, 2) + Math.pow(vec.y - this.y, 2));
};

function BoundingBox(minX, minY, maxX, maxY){
	if(maxX < minX){
		minX = [minX, maxX = minX][0];
	}

	if(maxY < minY){
		minY = [minY, maxY = minY][0];
	}

	this.minX = minX;
	this.minY = minY;
	this.maxX = maxX;
	this.maxY = maxY;
}

/**
 * Checks if bounding box is colliding with other
 * @param bb BoundingBox
 */
BoundingBox.prototype.collidesWith = function(bb){
	if(this.minX < bb.minX && bb.minX < this.maxX || this.minX < bb.maxX && bb.maxX < this.maxX){
		return this.minY < bb.minY && bb.minY < this.maxY || this.minY < bb.maxY && bb.maxY < this.maxY;
	}

	return false;
};

BoundingBox.prototype.set = function(minX, minY, maxX, maxY){
	if(maxX < minX){
		minX = [minX, maxX = minX][0];
	}

	if(maxY < minY){
		minY = [minY, maxY = minY][0];
	}

	this.minX = minX || this.minX;
	this.minY = minY || this.minY;
	this.maxX = maxX || this.maxX;
	this.maxY = maxY || this.maxY;

	return this;
};

function BoundingBox2(minX, maxX, y1, y2, y3, y4){ //  y1------y4
	this.minX = minX;                               //  |        |
	this.maxX = maxX;                               //  y2------y3
	this.y1 = y1;
	this.y2 = y2;
	this.y3 = y3;
	this.y4 = y4;

	if(this.minX > this.maxX){
		this.minX = [this.maxX, this.maxX = this.minX][0];
	}

	if(this.y2 > this.y1){
		this.y1 = [this.y2, this.y2 = this.y1][0];
	}

	if(this.y3 > this.y4){
		this.y3 = [this.y4, this.y4 = this.y3][0];
	}
}

/**
 *
 * @param bb BoundingBox
 * @returns {boolean}
 */
BoundingBox2.prototype.collidesWith = function(bb){
	// maxX != minX

	//var y = ((this.y4 - this.y1) / (this.maxX - this.minX)) * (bb.minX - this.minX) + this.y1;

	var checks = [
		[bb.minX, bb.minY], [bb.maxX, bb.minY],
		[bb.minX, bb.maxY], [bb.maxX, bb.maxY]
	];
	for(var i = 0; i < checks.length; i++){
		var s1 = (this.y1 - this.y2) * Math.abs(checks[i][0] - this.minX);
		var s2 = (this.y4 - this.y3) * Math.abs(checks[i][0] - this.maxX);

		var m1 = (this.y4 - this.y1) / (this.maxX - this.minX);
		var s3 = Math.sqrt(Math.pow(this.maxX - this.minX, 2) + Math.pow(this.y1 - this.y4, 2))
				* Math.abs(checks[i][0] * m1 - checks[i][1] - this.minX * m1 + this.y1) / Math.sqrt(Math.pow(m1, 2) + 1);

		var m2 = (this.y3 - this.y2) / (this.maxX - this.minX);
		var s4 = Math.sqrt(Math.pow(this.maxX - this.minX, 2) + Math.pow(this.y3 - this.y2, 2))
				* Math.abs(checks[i][0] * m2 - checks[i][1] - this.minX * m2 + this.y2) / Math.sqrt(Math.pow(m2, 2) + 2);

		if(s1 + s2 + s3 + s4 <= (this.y1 - this.y2 + this.y4 - this.y3) * (this.maxX - this.minX)){
			return true;
		}
	}
	return false;
};

function secondsToTick(sec){
	return 1000 / UPDATE_INTERVAL * sec;
}

function tickToSeconds(tick){
	return tick * UPDATE_INTERVAL / 1000;
}

function setFontSize(size){
	ctx.font = ctx.font.replace(/\d+px/, size + 'px');
}

var elements = {
	// info: paragraph
	// name: input field
};

function submitName(){
	if(game.status === STATUS_PREVIEW){
		if(!elements.name.value){
			elements.info.innerHTML = '이름을 입력해주세요';
			return;
		}

		var xhr = new XMLHttpRequest();
		xhr.open('POST', '/request', true);
		xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		xhr.onreadystatechange = function(){
			if(xhr.readyState === XMLHttpRequest.DONE){
				var res = JSON.parse(xhr.responseText);

				if(res.status){
					if(!res.token){
						elements.info.innerHTML = '서버가 올바르지 않은 응답을 했습니다.';
						return;
					}
					game.token = res.token;
					game.name = elements.name.value;
					game.start();

					elements.name.value = '';
					elements.info.innerHTML = '';
				}else{
					elements.info.innerHTML = '에러가 있는 것 같습니다.';
				}
			}
		};

		var data = new FormData();
		data.append('name', elements.name.value);
		xhr.send('name='+elements.name.value);
	}
}
