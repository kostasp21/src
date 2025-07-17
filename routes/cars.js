"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var db_1 = require("../db");
var validate_1 = require("../middleware/validate");
var carSchema_1 = require("../validation/carSchema");
//import { authenticateToken } from './middleware/authenticateToken';
var router = (0, express_1.Router)();
/**
 * @swagger
 * tags:
 *   name: Cars
 *   description: Διαχείριση αυτοκινήτων
 */
/**
 * @swagger
 * /cars:
 *   get:
 *     summary: Λήψη όλων των αυτοκινήτων
 *     tags: [Cars]
 *     responses:
 *       200:
 *         description: Λίστα με όλα τα αυτοκίνητα
 */
// GET όλα τα αυτοκίνητα
router.get('/', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, brand, model, min_price, max_price, filters, values, whereClause, result, err_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.query, brand = _a.brand, model = _a.model, min_price = _a.min_price, max_price = _a.max_price;
                filters = [];
                values = [];
                if (brand) {
                    values.push("%".concat(brand, "%"));
                    filters.push("brand ILIKE $".concat(values.length));
                }
                if (model) {
                    values.push("%".concat(model, "%"));
                    filters.push("model ILIKE $".concat(values.length));
                }
                if (min_price) {
                    values.push(min_price);
                    filters.push("price_per_day >= $".concat(values.length));
                }
                if (max_price) {
                    values.push(max_price);
                    filters.push("price_per_day <= $".concat(values.length));
                }
                whereClause = filters.length > 0 ? "WHERE ".concat(filters.join(' AND ')) : '';
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, db_1.default.query("SELECT * FROM cars ".concat(whereClause), values)];
            case 2:
                result = _b.sent();
                res.json(result.rows);
                return [3 /*break*/, 4];
            case 3:
                err_1 = _b.sent();
                console.error('Error searching cars:', err_1);
                res.status(500).json({ error: 'Σφάλμα κατά την αναζήτηση αυτοκινήτων' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * @swagger
 * /cars/{id}:
 *   get:
 *     summary: Λήψη αυτοκινήτου με βάση το ID
 *     tags: [Cars]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Το αυτοκίνητο
 *       404:
 *         description: Δεν βρέθηκε
 */
// GET ένα αυτοκίνητο με βάση το car_id
router.get('/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, result, err_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                id = req.params.id;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, db_1.default.query('SELECT * FROM cars WHERE car_id = $1', [id])];
            case 2:
                result = _a.sent();
                if (result.rows.length === 0) {
                    return [2 /*return*/, res.status(404).json({ error: 'Το αυτοκίνητο δεν βρέθηκε' })];
                }
                res.json(result.rows[0]);
                return [3 /*break*/, 4];
            case 3:
                err_2 = _a.sent();
                console.error(err_2);
                res.status(500).json({ error: 'Σφάλμα κατά την ανάκτηση του αυτοκινήτου' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * @swagger
 * /cars:
 *   post:
 *     summary: Δημιουργία νέου αυτοκινήτου
 *     tags: [Cars]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - brand
 *               - model
 *               - price_per_day
 *               - quantity
 *             properties:
 *               brand:
 *                 type: string
 *               model:
 *                 type: string
 *               description:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               price_per_day:
 *                 type: number
 *               quantity:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Επιτυχής δημιουργία
 */
// POST νέο αυτοκίνητο
router.post('/', (0, validate_1.validateBody)(carSchema_1.carSchema), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, brand, model, description, date, price_per_day, quantity, result, err_3;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, brand = _a.brand, model = _a.model, description = _a.description, date = _a.date, price_per_day = _a.price_per_day, quantity = _a.quantity;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, db_1.default.query("INSERT INTO cars (brand, model, description, date, price_per_day, quantity)\n       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *", [brand, model, description, date, price_per_day, quantity])];
            case 2:
                result = _b.sent();
                res.status(201).json(result.rows[0]);
                return [3 /*break*/, 4];
            case 3:
                err_3 = _b.sent();
                console.error(err_3);
                res.status(500).json({ error: 'Σφάλμα κατά την εισαγωγή του αυτοκινήτου' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * @swagger
 * /cars/{id}:
 *   put:
 *     summary: Ενημέρωση αυτοκινήτου
 *     tags: [Cars]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               brand:
 *                 type: string
 *               model:
 *                 type: string
 *               description:
 *                 type: string
 *               date:
 *                 type: string
 *               price_per_day:
 *                 type: number
 *               quantity:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Επιτυχής ενημέρωση
 *       404:
 *         description: Δεν βρέθηκε
 */
// PUT ενημέρωση αυτοκινήτου
router.put('/:id', (0, validate_1.validateBody)(carSchema_1.carSchema), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, brand, model, description, date, price_per_day, quantity, result, err_4;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                id = req.params.id;
                _a = req.body, brand = _a.brand, model = _a.model, description = _a.description, date = _a.date, price_per_day = _a.price_per_day, quantity = _a.quantity;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, db_1.default.query("UPDATE cars SET brand = $1, model = $2, description = $3, date = $4, price_per_day = $5, quantity = $6\n       WHERE car_id = $7 RETURNING *", [brand, model, description, date, price_per_day, quantity, id])];
            case 2:
                result = _b.sent();
                if (result.rows.length === 0) {
                    return [2 /*return*/, res.status(404).json({ error: 'Το αυτοκίνητο δεν βρέθηκε για ενημέρωση' })];
                }
                res.json(result.rows[0]);
                return [3 /*break*/, 4];
            case 3:
                err_4 = _b.sent();
                console.error(err_4);
                res.status(500).json({ error: 'Σφάλμα κατά την ενημέρωση του αυτοκινήτου' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * @swagger
 * /cars/{id}:
 *   delete:
 *     summary: Διαγραφή αυτοκινήτου
 *     tags: [Cars]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Επιτυχής διαγραφή
 *       404:
 *         description: Δεν βρέθηκε
 */
// DELETE αυτοκίνητο
router.delete('/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, result, err_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                id = req.params.id;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, db_1.default.query('DELETE FROM cars WHERE car_id = $1 RETURNING *', [id])];
            case 2:
                result = _a.sent();
                if (result.rows.length === 0) {
                    return [2 /*return*/, res.status(404).json({ error: 'Το αυτοκίνητο δεν βρέθηκε για διαγραφή' })];
                }
                res.json({ message: 'Το αυτοκίνητο διαγράφηκε επιτυχώς', car: result.rows[0] });
                return [3 /*break*/, 4];
            case 3:
                err_5 = _a.sent();
                console.error(err_5);
                res.status(500).json({ error: 'Σφάλμα κατά τη διαγραφή του αυτοκινήτου' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
