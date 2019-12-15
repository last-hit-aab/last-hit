"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
var _typeof = {
    number: 'number',
    string: 'string',
    undefined: 'undefined',
    object: 'object',
    function: 'function'
};
/**
 * @returns whether the provided parameter is a JavaScript Array or not.
 */
function isArray(array) {
    if (Array.isArray) {
        return Array.isArray(array);
    }
    if (array && typeof array.length === _typeof.number && array.constructor === Array) {
        return true;
    }
    return false;
}
exports.isArray = isArray;
/**
 * @returns whether the provided parameter is a JavaScript String or not.
 */
function isString(str) {
    if (typeof str === _typeof.string || str instanceof String) {
        return true;
    }
    return false;
}
exports.isString = isString;
/**
 * @returns whether the provided parameter is a JavaScript Array and each element in the array is a string.
 */
function isStringArray(value) {
    return isArray(value) && value.every(function (elem) { return isString(elem); });
}
exports.isStringArray = isStringArray;
/**
 *
 * @returns whether the provided parameter is of type `object` but **not**
 *	`null`, an `array`, a `regexp`, nor a `date`.
 */
function isObject(obj) {
    // The method can't do a type cast since there are type (like strings) which
    // are subclasses of any put not positvely matched by the function. Hence type
    // narrowing results in wrong results.
    return (typeof obj === _typeof.object &&
        obj !== null &&
        !Array.isArray(obj) &&
        !(obj instanceof RegExp) &&
        !(obj instanceof Date));
}
exports.isObject = isObject;
/**
 * In **contrast** to just checking `typeof` this will return `false` for `NaN`.
 * @returns whether the provided parameter is a JavaScript Number or not.
 */
function isNumber(obj) {
    if ((typeof obj === _typeof.number || obj instanceof Number) && !isNaN(obj)) {
        return true;
    }
    return false;
}
exports.isNumber = isNumber;
/**
 * @returns whether the provided parameter is a JavaScript Boolean or not.
 */
function isBoolean(obj) {
    return obj === true || obj === false;
}
exports.isBoolean = isBoolean;
/**
 * @returns whether the provided parameter is undefined.
 */
function isUndefined(obj) {
    return typeof obj === _typeof.undefined;
}
exports.isUndefined = isUndefined;
/**
 * @returns whether the provided parameter is undefined or null.
 */
function isUndefinedOrNull(obj) {
    return isUndefined(obj) || obj === null;
}
exports.isUndefinedOrNull = isUndefinedOrNull;
/**
 * Asserts that the argument passed in is neither undefined nor null.
 */
function assertIsDefined(arg) {
    if (isUndefinedOrNull(arg)) {
        throw new Error('Assertion Failed: argument is undefined or null');
    }
    return arg;
}
exports.assertIsDefined = assertIsDefined;
function assertAllDefined() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var result = [];
    for (var i = 0; i < args.length; i++) {
        var arg = args[i];
        if (isUndefinedOrNull(arg)) {
            throw new Error("Assertion Failed: argument at index " + i + " is undefined or null");
        }
        result.push(arg);
    }
    return result;
}
exports.assertAllDefined = assertAllDefined;
var hasOwnProperty = Object.prototype.hasOwnProperty;
/**
 * @returns whether the provided parameter is an empty JavaScript Object or not.
 */
function isEmptyObject(obj) {
    if (!isObject(obj)) {
        return false;
    }
    for (var key in obj) {
        if (hasOwnProperty.call(obj, key)) {
            return false;
        }
    }
    return true;
}
exports.isEmptyObject = isEmptyObject;
/**
 * @returns whether the provided parameter is a JavaScript Function or not.
 */
function isFunction(obj) {
    return typeof obj === _typeof.function;
}
exports.isFunction = isFunction;
/**
 * @returns whether the provided parameters is are JavaScript Function or not.
 */
function areFunctions() {
    var objects = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        objects[_i] = arguments[_i];
    }
    return objects.length > 0 && objects.every(isFunction);
}
exports.areFunctions = areFunctions;
function validateConstraints(args, constraints) {
    var len = Math.min(args.length, constraints.length);
    for (var i = 0; i < len; i++) {
        validateConstraint(args[i], constraints[i]);
    }
}
exports.validateConstraints = validateConstraints;
function validateConstraint(arg, constraint) {
    if (isString(constraint)) {
        if (typeof arg !== constraint) {
            throw new Error("argument does not match constraint: typeof " + constraint);
        }
    }
    else if (isFunction(constraint)) {
        try {
            if (arg instanceof constraint) {
                return;
            }
        }
        catch (_a) {
            // ignore
        }
        if (!isUndefinedOrNull(arg) && arg.constructor === constraint) {
            return;
        }
        if (constraint.length === 1 && constraint.call(undefined, arg) === true) {
            return;
        }
        throw new Error("argument does not match one of these constraints: arg instanceof constraint, arg.constructor === constraint, nor constraint(arg) === true");
    }
}
exports.validateConstraint = validateConstraint;
function getAllPropertyNames(obj) {
    var res = [];
    var proto = Object.getPrototypeOf(obj);
    while (Object.prototype !== proto) {
        res = res.concat(Object.getOwnPropertyNames(proto));
        proto = Object.getPrototypeOf(proto);
    }
    return res;
}
exports.getAllPropertyNames = getAllPropertyNames;
function getAllMethodNames(obj) {
    var methods = [];
    for (var _i = 0, _a = getAllPropertyNames(obj); _i < _a.length; _i++) {
        var prop = _a[_i];
        if (typeof obj[prop] === 'function') {
            methods.push(prop);
        }
    }
    return methods;
}
exports.getAllMethodNames = getAllMethodNames;
function createProxyObject(methodNames, invoke) {
    var createProxyMethod = function (method) {
        return function () {
            var args = Array.prototype.slice.call(arguments, 0);
            return invoke(method, args);
        };
    };
    var result = {};
    for (var _i = 0, methodNames_1 = methodNames; _i < methodNames_1.length; _i++) {
        var methodName = methodNames_1[_i];
        result[methodName] = createProxyMethod(methodName);
    }
    return result;
}
exports.createProxyObject = createProxyObject;
/**
 * Converts null to undefined, passes all other values through.
 */
function withNullAsUndefined(x) {
    return x === null ? undefined : x;
}
exports.withNullAsUndefined = withNullAsUndefined;
/**
 * Converts undefined to null, passes all other values through.
 */
function withUndefinedAsNull(x) {
    return typeof x === 'undefined' ? null : x;
}
exports.withUndefinedAsNull = withUndefinedAsNull;

//# sourceMappingURL=types.js.map
