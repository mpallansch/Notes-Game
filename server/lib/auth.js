"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var crypto_1 = __importDefault(require("crypto"));
var auth = {
    generateSalt: function (rounds) {
        if (rounds >= 15) {
            throw new Error(rounds + " is greater than 15,Must be less that 15");
        }
        if (typeof rounds !== 'number') {
            throw new Error('rounds param must be a number');
        }
        if (rounds == null) {
            rounds = 12;
        }
        return crypto_1.default.randomBytes(Math.ceil(rounds / 2)).toString('hex').slice(0, rounds);
    },
    hasher: function (password, salt) {
        var hash = crypto_1.default.createHmac('sha512', salt);
        hash.update(password);
        var value = hash.digest('hex');
        return {
            salt: salt,
            hashedpassword: value
        };
    },
    generateToken: function () {
        return new Promise(function (resolve, reject) {
            crypto_1.default.randomBytes(48, function (err, buffer) {
                if (err) {
                    reject();
                    return;
                }
                resolve(buffer.toString('hex'));
            });
        });
    },
    hash: function (password, salt) { },
    compare: function (password, hash) { return false; }
};
auth.hash = function (password, salt) {
    if (password == null || salt == null) {
        throw new Error('Must Provide Password and salt values');
    }
    if (typeof password !== 'string' || typeof salt !== 'string') {
        throw new Error('password must be a string and salt must either be a salt string or a number of rounds');
    }
    return auth.hasher(password, salt);
};
auth.compare = function (password, hash) {
    if (password == null || hash == null) {
        throw new Error('password and hash is required to compare');
    }
    if (typeof password !== 'string' || typeof hash !== 'object') {
        throw new Error('password must be a String and hash must be an Object');
    }
    var passwordData = auth.hasher(password, hash.salt);
    if (passwordData.hashedpassword === hash.hashedpassword) {
        return true;
    }
    return false;
};
exports.default = auth;
