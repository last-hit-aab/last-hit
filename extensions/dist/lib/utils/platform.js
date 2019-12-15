"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
var LANGUAGE_DEFAULT = 'en';
var _isWindows = false;
var _isMacintosh = false;
var _isLinux = false;
var _isNative = false;
var _isWeb = false;
var _locale = undefined;
var _language = LANGUAGE_DEFAULT;
var _translationsConfigFile = undefined;
var _userAgent = undefined;
var isElectronRenderer = typeof process !== 'undefined' &&
    typeof process.versions !== 'undefined' &&
    typeof process.versions.electron !== 'undefined' &&
    process.type === 'renderer';
// OS detection
if (typeof navigator === 'object' && !isElectronRenderer) {
    _userAgent = navigator.userAgent;
    _isWindows = _userAgent.indexOf('Windows') >= 0;
    _isMacintosh = _userAgent.indexOf('Macintosh') >= 0;
    _isLinux = _userAgent.indexOf('Linux') >= 0;
    _isWeb = true;
    _locale = navigator.language;
    _language = _locale;
}
else if (typeof process === 'object') {
    _isWindows = process.platform === 'win32';
    _isMacintosh = process.platform === 'darwin';
    _isLinux = process.platform === 'linux';
    _locale = LANGUAGE_DEFAULT;
    _language = LANGUAGE_DEFAULT;
    var rawNlsConfig = process.env['VSCODE_NLS_CONFIG'];
    if (rawNlsConfig) {
        try {
            var nlsConfig = JSON.parse(rawNlsConfig);
            var resolved = nlsConfig.availableLanguages['*'];
            _locale = nlsConfig.locale;
            // VSCode's default language is 'en'
            _language = resolved ? resolved : LANGUAGE_DEFAULT;
            _translationsConfigFile = nlsConfig._translationsConfigFile;
        }
        catch (e) { }
    }
    _isNative = true;
}
function PlatformToString(platform) {
    switch (platform) {
        case 0 /* Web */:
            return 'Web';
        case 1 /* Mac */:
            return 'Mac';
        case 2 /* Linux */:
            return 'Linux';
        case 3 /* Windows */:
            return 'Windows';
    }
}
exports.PlatformToString = PlatformToString;
var _platform = 0 /* Web */;
if (_isMacintosh) {
    _platform = 1 /* Mac */;
}
else if (_isWindows) {
    _platform = 3 /* Windows */;
}
else if (_isLinux) {
    _platform = 2 /* Linux */;
}
exports.isWindows = _isWindows;
exports.isMacintosh = _isMacintosh;
exports.isLinux = _isLinux;
exports.isNative = _isNative;
exports.isWeb = _isWeb;
exports.platform = _platform;
exports.userAgent = _userAgent;
function isRootUser() {
    return _isNative && !_isWindows && process.getuid() === 0;
}
exports.isRootUser = isRootUser;
/**
 * The language used for the user interface. The format of
 * the string is all lower case (e.g. zh-tw for Traditional
 * Chinese)
 */
exports.language = _language;
var Language;
(function (Language) {
    function value() {
        return exports.language;
    }
    Language.value = value;
    function isDefaultVariant() {
        if (exports.language.length === 2) {
            return exports.language === 'en';
        }
        else if (exports.language.length >= 3) {
            return exports.language[0] === 'e' && exports.language[1] === 'n' && exports.language[2] === '-';
        }
        else {
            return false;
        }
    }
    Language.isDefaultVariant = isDefaultVariant;
    function isDefault() {
        return exports.language === 'en';
    }
    Language.isDefault = isDefault;
})(Language = exports.Language || (exports.Language = {}));
/**
 * The OS locale or the locale specified by --locale. The format of
 * the string is all lower case (e.g. zh-tw for Traditional
 * Chinese). The UI is not necessarily shown in the provided locale.
 */
exports.locale = _locale;
/**
 * The translatios that are available through language packs.
 */
exports.translationsConfigFile = _translationsConfigFile;
var _globals = typeof self === 'object' ? self : typeof global === 'object' ? global : {};
exports.globals = _globals;
exports.setImmediate = (function defineSetImmediate() {
    if (exports.globals.setImmediate) {
        return exports.globals.setImmediate.bind(exports.globals);
    }
    if (typeof process !== 'undefined' && typeof process.nextTick === 'function') {
        return process.nextTick.bind(process);
    }
    var _promise = Promise.resolve();
    return function (callback) { return _promise.then(callback); };
})();
exports.OS = _isMacintosh
    ? 2 /* Macintosh */
    : _isWindows
        ? 1 /* Windows */
        : 3 /* Linux */;

//# sourceMappingURL=platform.js.map
