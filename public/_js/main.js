var MAX_CANDLES = 30;
var CANDLE_WIDTH = 15;
var CANDLE_HEIGHT = 90;
var deg2rad = Math.PI / 180;

var canvas = null, ctx = null;

var candles = [];

window.onload = function(){
	canvas = document.getElementById('main');
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;

    ctx = canvas.getContext('2d');

	setInterval(update, 20);
};

function update(){
	ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

	candles.forEach(function(candle, index){
		candle.tick();

		if(candle.to.x === candle.vec.x && candle.to.y === candle.vec.y){
			candles.splice(index, 1);
		}
	});

	if(candles.length < MAX_CANDLES && Math.random() < 0.5){ // 50%
		var random = Math.random();

		if(random < 0.50){ // 위 혹은 아래에서 출발
			var y = random < 0.25 ? -CANDLE_HEIGHT : window.innerHeight + CANDLE_HEIGHT;

			candles.push(new Candle(new Vector2(Math.floor(Math.random() * window.innerWidth), y),
				new Vector2(Math.floor(Math.random() * window.innerWidth), window.innerHeight + y)));
		}else{ // 왼쪽 혹은 아래에서 출발
			random -= 0.50;

			var x = random < 0.25 ? -CANDLE_WIDTH : window.innerWidth + CANDLE_WIDTH;

			candles.push(new Candle(new Vector2(x, Math.floor(Math.random() * window.innerHeight)),
				new Vector2(window.innerWidth + x, Math.floor(Math.random() * window.innerHeight))));
		}
	}
}

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
	if(this.minX < bb.minX && bb.minX < this.maxX){
		return this.minY < bb.minY && bb.minY < this.maxY;
	}

	return false;
};

BoundingBox.prototype.set = function(minX, minY, maxX, maxY){
	this.minX = minX || this.minX;
	this.minY = minY || this.minY;
	this.maxX = maxX || this.maxX;
	this.maxY = maxY || this.maxY;

	return this;
};