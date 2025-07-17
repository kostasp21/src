"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBody = void 0;
var validateBody = function (schema) {
    return function (req, res, next) {
        var error = schema.validate(req.body, { abortEarly: false }).error;
        if (error) {
            return res.status(400).json({
                error: 'Σφάλμα επικύρωσης',
                details: error.details.map(function (d) { return d.message; }),
            });
        }
        next();
    };
};
exports.validateBody = validateBody;
