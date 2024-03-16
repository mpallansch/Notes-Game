"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var sqlite3_1 = __importDefault(require("sqlite3"));
var db = new sqlite3_1.default.Database('death-card.db', sqlite3_1.default.OPEN_READWRITE | sqlite3_1.default.OPEN_CREATE, function (err) {
    if (err) {
        console.error(err.message);
        return;
    }
    console.log('Connected to the death card database.');
    db.run("CREATE TABLE IF NOT EXISTS Users(\n        email TEXT NOT NULL,\n        username TEXT NOT NULL,\n        hashedpassword TEXT NOT NULL,\n        salt TEXT NOT NULL,\n        PRIMARY KEY(email),\n        UNIQUE (email COLLATE NOCASE),\n        UNIQUE (username COLLATE NOCASE)\n    )", function (err) {
        if (err) {
            console.log('Error adding table: Users', err);
        }
    });
    db.run("CREATE TABLE IF NOT EXISTS Resets(\n        email TEXT NOT NULL,\n        token TEXT NOT NULL,\n        date INTEGER NOT NULL,\n        PRIMARY KEY(email),\n        UNIQUE (email COLLATE NOCASE)\n    )", function (err) {
        if (err) {
            console.log('Error adding table: Users', err);
        }
    });
});
