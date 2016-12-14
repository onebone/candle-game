const mysql = require('mysql');
const crypto = require('crypto');

const connection = mysql.createConnection({
	host:       process.env.host || 'localhost',
	user:       process.env.user || 'root',
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

	getTopPlayers(top = 5){
		return new Promise((resolve, reject) =>{
			connection.query(`SELECT MAX(score) as score, name FROM scores GROUP BY name ORDER BY score DESC, name;`, (err, rows, fields) => {
				if(err) return reject(err);

				let rank = {};
				for(const row of rows){
					if(top-- > 0){
						rank[row.name] = row.score;
					}else break;
				}

				resolve(rank);
			});
		});
	}
}

module.exports = ScoreManager;
