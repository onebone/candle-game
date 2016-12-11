const mysql = require('mysql');
const crypto = require('crypto');

const connection = mysql.createConnection({
	host:       process.env.host || 'localhost',
	user:       process.env.user || 'onebone',
	password:   process.env.password || '1234',
	database:   process.env.database || 'candle'
});

connection.connect((err) => {
	if(err) throw err;
});

connection.query(`CREATE TABLE IF NOT EXISTS scores(
	name VARCHAR(15),
	time BIGINT,
	score INT
);`, (err) => {
	if(err) throw err;
});

class ScoreManager{
	constructor(){
		this.tokens = {};
	}

	addToken(player){
		var token = crypto.randomBytes(64).toString('hex');

		this.tokens[token] = [player, Date.now()];
		return token;
	}

	putScore(token, score){
		if(this.tokens[token]){
			score = parseInt(score);

			connection.query(`INSERT INTO scores (name, time, score) VALUES (${connection.escape(this.tokens[token][0])}, 
								${connection.escape(this.tokens[token][1])},
								${connection.escape(score)})`);
			this.tokens[token] = undefined;
			return true;
		}
		return false;
	}
}

module.exports = ScoreManager;