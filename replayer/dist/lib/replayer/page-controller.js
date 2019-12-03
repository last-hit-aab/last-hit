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
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var utils_1 = require("../utils");
var ci_helper_1 = __importDefault(require("./ci-helper"));
var installListenersOnPage = function (page) { return __awaiter(void 0, void 0, void 0, function () {
    var god;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                god = function () {
                    console.log('%c last-hit: %c evaluate on new document start...', 'color:red', 'color:brown');
                    // wechat related
                    (function (window) {
                        if (!/MicroMessenger/i.test(navigator.userAgent)) {
                            return;
                        }
                        var WeixinJSBridgeData = {};
                        var imageData = null;
                        var transformPNG2JPEG = function (base64Image) {
                            return new Promise(function (resolve) {
                                var canvas = document.createElement('canvas');
                                var ctx = canvas.getContext('2d');
                                var image = new Image();
                                image.crossOrigin = 'anonymous';
                                image.onload = function () {
                                    var width = image.width, height = image.height;
                                    canvas.width = width;
                                    canvas.height = height;
                                    ctx.fillStyle = '#fff';
                                    ctx.fillRect(0, 0, width, height);
                                    ctx.drawImage(image, 0, 0, width, height);
                                    resolve(canvas.toDataURL('image/jpeg', 1.0));
                                };
                                image.src = base64Image;
                            });
                        };
                        window.WeixinJSBridge = {
                            invoke: function (event, data, func) {
                                // console.info(event, data);
                                switch (event) {
                                    case 'sendAppMessage':
                                    case 'shareTimeline':
                                        console.log('%c Ready for share', 'color:red', data);
                                        WeixinJSBridgeData[event] = data;
                                        WeixinJSBridgeData[event]._callback = func;
                                        break;
                                    case 'preVerifyJSAPI':
                                        func({});
                                        break;
                                    case 'chooseImage':
                                        var input_1 = document.createElement('input');
                                        input_1.setAttribute('type', 'file');
                                        input_1.style.visibility = 'hidden';
                                        input_1.onchange = function (evt) {
                                            var file = input_1.files[0];
                                            var reader = new FileReader();
                                            reader.onload = function (evt) {
                                                var base64Image = evt.target.result;
                                                if (typeof base64Image === 'string' &&
                                                    base64Image.startsWith('data:image/png;')) {
                                                    // 是PNG, 转成JPEG
                                                    transformPNG2JPEG(base64Image).then(function (base64Image) {
                                                        imageData = base64Image;
                                                        func({ localIds: [0], errMsg: 'chooseImage:ok' });
                                                    });
                                                }
                                                else {
                                                    imageData = base64Image;
                                                    func({ localIds: [0], errMsg: 'chooseImage:ok' });
                                                }
                                            };
                                            reader.readAsDataURL(file);
                                        };
                                        document.body.append(input_1);
                                        // don't click, replayer will invoke change event
                                        // input.click();
                                        break;
                                    case 'getLocalImgData':
                                        func({ localData: imageData, errMsg: 'getLocalImgData:ok' });
                                        break;
                                }
                                // console.log(WeixinJSBridgeData);
                            },
                            on: function (event, func) {
                                func({});
                            }
                        };
                        window.addEventListener('DOMContentLoaded', function (event) {
                            if (document.getElementById('last-hit-bars') != null) {
                                return;
                            }
                            var div = document.createElement('div');
                            div.id = 'last-hit-bars';
                            div.style.position = 'fixed';
                            div.style.display = 'flex';
                            div.style.top = '0';
                            div.style.right = '0';
                            div.style.backgroundColor = 'transparent';
                            div.style.zIndex = '100000';
                            var span = document.createElement('span');
                            span.id = 'last-hit-wechat-share';
                            span.style.height = '24px';
                            span.style.width = '24px';
                            // span.style.border = '1px solid red';
                            span.style.backgroundColor = 'burlywood';
                            span.style.opacity = '0.7';
                            span.style.borderRadius = '100%';
                            span.style.margin = '3px';
                            span.style.boxSizing = 'border-box';
                            span.style.cursor = 'pointer';
                            span.style.fontWeight = 'bold';
                            span.style.lineHeight = '24px';
                            span.style.fontSize = '12px';
                            span.style.color = '#fff';
                            // span.style.transform = 'scale(0.8)';
                            var textSpan = document.createElement('span');
                            textSpan.textContent = 'Share';
                            textSpan.style.lineHeight = '24px';
                            textSpan.style.transform = 'scale(0.7)';
                            textSpan.style.display = 'block';
                            textSpan.style.transformOrigin = 'left';
                            textSpan.style.whiteSpace = 'nowrap';
                            span.append(textSpan);
                            span.onclick = function () {
                                var data = WeixinJSBridgeData['sendAppMessage'];
                                // console.info(data);
                                if (data && data.link) {
                                    // use prepared share data
                                    console.log("%c Share to: %c " + data.link, 'color:red', 'color:brown');
                                    window.open(data.link);
                                    data._callback && data._callback({ errMsg: 'sendAppMessage:ok' });
                                }
                                else {
                                    // use current url
                                    console.log("%c Share to: %c " + location.href, 'color:red', 'color:brown');
                                    window.open(location.href);
                                }
                            };
                            div.append(span);
                            document.body.append(div);
                        });
                    })(window);
                    console.log('%c last-hit: %c evaluate on new document end...', 'color:red', 'color:brown');
                };
                // some pages postpones the page created or popup event. so evaluateOnNewDocument doesn't work.
                // in this case, run evaluate for ensuring the god logic should be install into page
                // anyway, monitors cannot be installed twice, so add varaiable $lhGod on window to prevent
                return [4 /*yield*/, page.evaluateOnNewDocument(god)];
            case 1:
                // some pages postpones the page created or popup event. so evaluateOnNewDocument doesn't work.
                // in this case, run evaluate for ensuring the god logic should be install into page
                // anyway, monitors cannot be installed twice, so add varaiable $lhGod on window to prevent
                _a.sent();
                return [4 /*yield*/, page.evaluate(god)];
            case 2:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); };
exports.controlPage = function (replayer, page, device, uuid) { return __awaiter(void 0, void 0, void 0, function () {
    var setBackground, client;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, installListenersOnPage(page)];
            case 1:
                _a.sent();
                return [4 /*yield*/, page.emulate(device)];
            case 2:
                _a.sent();
                return [4 /*yield*/, page.emulateMedia('screen')];
            case 3:
                _a.sent();
                setBackground = function () {
                    return (document.documentElement.style.backgroundColor = 'rgba(25,25,25,0.8)');
                };
                return [4 /*yield*/, page.evaluate(setBackground)];
            case 4:
                _a.sent();
                return [4 /*yield*/, page.exposeFunction('$lhGetUuid', function () { return uuid; })];
            case 5:
                _a.sent();
                return [4 /*yield*/, page.target().createCDPSession()];
            case 6:
                client = _a.sent();
                if (!device.viewport.isMobile) return [3 /*break*/, 8];
                return [4 /*yield*/, client.send('Emulation.setFocusEmulationEnabled', { enabled: true })];
            case 7:
                _a.sent();
                _a.label = 8;
            case 8: return [4 /*yield*/, client.detach()];
            case 9:
                _a.sent();
                return [4 /*yield*/, ci_helper_1.default.startCoverage(page)];
            case 10:
                _a.sent();
                page.on('load', function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                if (replayer.isOnRecord()) {
                                    // do nothing when on record
                                    return [2 /*return*/];
                                }
                                return [4 /*yield*/, page.evaluate(setBackground)];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                page.on('close', function () { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        if (replayer.isOnRecord()) {
                            // do nothing when on record
                            return [2 /*return*/];
                        }
                        replayer.removePage(page);
                        return [2 /*return*/];
                    });
                }); });
                // page created by window.open or anchor
                page.on('popup', function (newPage) { return __awaiter(void 0, void 0, void 0, function () {
                    var newUrl, steps, currentIndex, currentStep, pageCreateStep;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                if (replayer.isOnRecord()) {
                                    // do nothing when on record
                                    return [2 /*return*/];
                                }
                                newUrl = utils_1.shorternUrl(newPage.url());
                                steps = replayer.getSteps();
                                currentIndex = replayer.getCurrentIndex();
                                currentStep = steps[currentIndex];
                                pageCreateStep = steps
                                    .filter(function (step, index) { return index >= currentIndex; })
                                    .find(function (step) {
                                    return (step.type === 'page-created' &&
                                        (step.forStepUuid === currentStep.stepUuid ||
                                            newUrl === utils_1.shorternUrl(step.url)));
                                });
                                if (pageCreateStep == null) {
                                    replayer
                                        .getLogger()
                                        .error(new Error('Cannot find page created step for current popup, flow is broken for replay.'));
                                    return [2 /*return*/];
                                }
                                replayer.putPage(pageCreateStep.uuid, newPage, true);
                                return [4 /*yield*/, exports.controlPage(replayer, newPage, device, pageCreateStep.uuid)];
                            case 1:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); });
                page.on('dialog', function (dialog) { return __awaiter(void 0, void 0, void 0, function () {
                    var dialogType, currentIndex_1, steps, uuid_1, step, dialogCloseStep, returnValue, currentIndex_2, steps, uuid_2, nextStep;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                if (replayer.isOnRecord()) {
                                    // do nothing when on record
                                    return [2 /*return*/];
                                }
                                dialogType = dialog.type();
                                if (!(dialogType === 'alert')) return [3 /*break*/, 2];
                                // accept is the only way to alert dialog
                                return [4 /*yield*/, dialog.accept('success')];
                            case 1:
                                // accept is the only way to alert dialog
                                _a.sent();
                                return [3 /*break*/, 3];
                            case 2:
                                if (['confirm', 'prompt'].includes(dialogType)) {
                                    currentIndex_1 = replayer.getCurrentIndex();
                                    steps = replayer.getSteps();
                                    uuid_1 = replayer.findUuid(page);
                                    step = steps
                                        .filter(function (step, index) { return index > currentIndex_1; })
                                        .filter(function (step) { return step.type === 'dialog-close'; })
                                        .find(function (step) { return step.uuid === uuid_1; });
                                    if (step == null) {
                                        throw new Error("Cannot find dialog close step for current dialog \"" + dialogType + "\" open, flow is broken for replay.");
                                    }
                                    dialogCloseStep = step;
                                    if (dialogCloseStep.dialog !== dialogType) {
                                        throw new Error("Cannot match dialog type, should be \"" + dialogType + "\", but is \"" + dialogCloseStep.dialog + "\", flow is broken for replay.");
                                    }
                                    returnValue = dialogCloseStep.returnValue;
                                    if (typeof returnValue === 'string') {
                                        // handle click yes for prompt dialog
                                        dialog.accept(returnValue);
                                    }
                                    else if (returnValue) {
                                        // handle click yes for confirm dialog
                                        dialog.accept();
                                    }
                                    else {
                                        // handle click no for both confirm and prompt dialog
                                        dialog.dismiss();
                                    }
                                }
                                else if ('beforeunload' === dialogType) {
                                    currentIndex_2 = replayer.getCurrentIndex();
                                    steps = replayer.getSteps();
                                    uuid_2 = replayer.findUuid(page);
                                    nextStep = steps
                                        .filter(function (step, index) { return index > currentIndex_2; })
                                        // must same uuid
                                        .filter(function (step) { return step.uuid === uuid_2; })
                                        // unload is not captured, but must be filtered, 20191006
                                        .filter(function (step) { return step.type !== 'unload'; })
                                        // the first step which with same page uuid and isn't unload step
                                        .find(function (step, index) { return index === 0; });
                                    if (nextStep == null) {
                                        throw new Error("Cannot find next step for current dialog \"" + dialogType + "\" open, flow is broken for replay.");
                                    }
                                    if (nextStep.type === 'page-closed' || nextStep.type === 'page-switched') {
                                        // seems unload had been performed
                                        dialog.accept();
                                    }
                                    else {
                                        // seems unload had been cancelled
                                        dialog.dismiss();
                                    }
                                }
                                _a.label = 3;
                            case 3: return [2 /*return*/];
                        }
                    });
                }); });
                page.on('request', function (request) {
                    if (replayer.isOnRecord()) {
                        // do nothing when on record
                        return;
                    }
                    replayer.putRequest(replayer.findUuid(page), request);
                });
                page.on('requestfinished', function (request) {
                    if (replayer.isOnRecord()) {
                        // do nothing when on record
                        return;
                    }
                    replayer.offsetRequest(replayer.findUuid(page), request, true);
                });
                page.on('requestfailed', function (request) {
                    if (replayer.isOnRecord()) {
                        // do nothing when on record
                        return;
                    }
                    replayer.offsetRequest(replayer.findUuid(page), request, false);
                });
                return [2 /*return*/];
        }
    });
}); };
//# sourceMappingURL=page-controller.js.map