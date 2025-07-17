"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var pg_1 = require("pg");
var pool = new pg_1.Pool({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres25',
    database: 'postgres',
});
exports.default = pool;
