"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var cors_1 = require("cors");
var cars_1 = require("./routes/cars");
var swagger_1 = require("./swagger");
var app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: 'http://localhost:4200',
    credentials: true
}));
app.use(express_1.default.json());
app.use('/cars', cars_1.default);
(0, swagger_1.setupSwagger)(app);
var PORT = 3000;
app.listen(PORT, function () {
    console.log("Server running on http://localhost:".concat(PORT));
});
exports.default = app;
