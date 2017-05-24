"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Ajv = require("ajv");
const pointSchema = {
    "type": "object",
    "properties": {
        "row": {
            "type": "number",
            "minimum": 0,
            "exclusiveMaximum": 100
        },
        "col": {
            "type": "number",
            "minimum": 0,
            "exclusiveMaximum": 100
        }
    }
};
const placeShipSchema = {
    "type": "object",
    "properties": {
        "ship": {
            "type": "number",
            "minimum": 0,
            "exclusiveMaximum": 5
        },
        "dir": {
            "type": "number",
            "minimum": 0,
            "exclusiveMaximum": 4
        },
        "loc": pointSchema
    }
};
const fireParams = {
    "type": "object",
    "properties": {
        "target": pointSchema
    }
};
/**
 * Validates data that comes from the client using JSON schema.
 *
 * @export
 * @class Validator
 */
class Validator {
    constructor() {
        this.ajv = new Ajv(); // options can be passed, e.g. {allErrors: true} 
        this.shipParamsValidator = this.ajv.compile(placeShipSchema);
        this.fireParamsValidator = this.ajv.compile(fireParams);
    }
    validateShipParamaters(raw) {
        let isValid = this.shipParamsValidator(raw);
        return isValid ? raw : null;
    }
    validateFireParamaters(raw) {
        let isValid = this.fireParamsValidator(raw);
        return isValid ? raw : null;
    }
}
exports.Validator = Validator;
