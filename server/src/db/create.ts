import sqlite3 from 'sqlite3';

let db = new sqlite3.Database('death-card.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error(err.message);
        return;
    }

    console.log('Connected to the death card database.');

    // db.run(`CREATE TABLE IF NOT EXISTS Users(
    //     email TEXT NOT NULL,
    //     username TEXT NOT NULL,
    //     hashedpassword TEXT NOT NULL,
    //     salt TEXT NOT NULL,
    //     PRIMARY KEY(email),
    //     UNIQUE (email COLLATE NOCASE),
    //     UNIQUE (username COLLATE NOCASE)
    // )`, (err) => {
    //     if(err){
    //         console.log('Error adding table: Users', err);
    //     }
    // });

    db.run(`CREATE TABLE IF NOT EXISTS Users (
        UserId INTEGER PRIMARY KEY AUTOINCREMENT,
        EmailAddress varchar(512) NOT NULL,
        UserName varchar(512) NOT NULL,
        Password varchar(512) NOT NULL,
        Salt varchar(512) NOT NULL,
        UNIQUE (EmailAddress COLLATE NOCASE),
        UNIQUE (UserName COLLATE NOCASE)
      )`, (err) => {
        if(err){
            console.log('Error adding table: Users', err);
        }
    });
      

    db.run(`CREATE TABLE IF NOT EXISTS Resets(
        email TEXT NOT NULL,
        token TEXT NOT NULL,
        date INTEGER NOT NULL,
        PRIMARY KEY(email),
        UNIQUE (email COLLATE NOCASE)
    )`, (err) => {
        if(err){
            console.log('Error adding table: Users', err);
        }
    });
      
    db.run(`CREATE TABLE IF NOT EXISTS GameMetas(
        GameId TEXT NOT NULL,
        JSONData TEXT NOT NULL,
        PRIMARY KEY(GameId),
        UNIQUE (GameId COLLATE NOCASE)
    )`, (err) => {
        if(err){
            console.log('Error adding table: Users', err);
        }
    });
});