import sqlite3 from 'sqlite3';

let db = new sqlite3.Database('death-card.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error(err.message);
        return;
    }

    console.log('Connected to the death card database.');

    db.run(`DROP TABLE GameMetas`, (err) => {
        if(err){
            console.log('Error dropping table: GameMetas', err);
        } else {
            db.run(`CREATE TABLE IF NOT EXISTS GameMetas(
                GameId TEXT NOT NULL,
                JSONData TEXT NOT NULL,
                PRIMARY KEY(GameId),
                UNIQUE (GameId COLLATE NOCASE)
            )`, (err) => {
                if(err){
                    console.log('Error adding table: GameMetas', err);
                }
            });
        }
    });
      
   
});