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
Object.defineProperty(exports, "__esModule", { value: true });
var RequestCounter = /** @class */ (function () {
    function RequestCounter(page, summary, logger) {
        this.requests = [];
        this.offsets = [];
        /** key is url, value is number array */
        this.requestsCreateAt = {};
        /** key is url, value is number array */
        this.requestsOffsetAt = {};
        this.timeout = 60000;
        this.used = 0;
        this.page = page;
        this.summary = summary;
        this.logger = logger;
    }
    RequestCounter.prototype.getPage = function () {
        return this.page;
    };
    RequestCounter.prototype.create = function (request) {
        // logger.log(`Request ${request.url()} created.`);
        this.requests.push(request);
        if (['xhr', 'fetch', 'websocket'].includes(request.resourceType())) {
            var url = request.url();
            var createAt = this.requestsCreateAt[url];
            if (createAt) {
                createAt.push(new Date().getTime());
            }
            else {
                this.requestsCreateAt[url] = [new Date().getTime()];
            }
        }
        // reset used time to 0, ensure timeout is begin from the last created request
        this.used = 0;
    };
    RequestCounter.prototype.offset = function (request, success) {
        var _this = this;
        // logger.log(`Request ${request.url()} offsetted.`);
        this.offsets.push(request);
        if (['xhr', 'fetch', 'websocket'].includes(request.resourceType())) {
            var url_1 = request.url();
            var offsetAt = this.requestsOffsetAt[url_1];
            if (offsetAt) {
                offsetAt.push(new Date().getTime());
            }
            else {
                this.requestsOffsetAt[url_1] = [new Date().getTime()];
            }
            var startTime = (function () {
                var times = _this.requestsCreateAt[url_1];
                return (times ? times[times.length - 1] : 0) || 0;
            })();
            var endTime = (function () {
                var times = _this.requestsOffsetAt[url_1];
                return (times ? times[times.length - 1] : 0) || 0;
            })();
            var usedTime = endTime - startTime;
            // console.log(`Used ${usedTime}ms for url[${url}]`);
            if (success) {
                this.summary.handleAjaxSuccess(url_1, usedTime);
            }
            else {
                this.summary.handleAjaxFail(url_1, usedTime);
            }
        }
    };
    RequestCounter.prototype.clear = function () {
        this.requests = [];
        this.offsets = [];
        this.used = 0;
    };
    RequestCounter.prototype.poll = function (resolve, reject, canResolve) {
        if (canResolve === void 0) { canResolve = false; }
        return __awaiter(this, void 0, void 0, function () {
            var usedTime, msg;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getPage().waitFor(1000)];
                    case 1:
                        _a.sent();
                        this.used += 1000;
                        this.requests.forEach(function (request, index) {
                            return _this.logger.debug("reqeusts check, the request index is " + index + ", request url is " + request.url());
                        });
                        this.offsets.forEach(function (request, index) {
                            return _this.logger.debug("offsets check, the request index is " + index + ", request url is " + request.url());
                        });
                        this.logger.debug("Check all requests are done, currently " + this.requests.length + " created and " + this.offsets.length + " offsetted.");
                        // when the page pop up, the page has been loaded before request interception, then requests length will less than offsets length
                        // RESEARCH might lost one request, don't know why
                        // add logic that gap requests count less or equals 2%, also pass
                        if (this.requests.length <= this.offsets.length ||
                            (this.requests.length - this.offsets.length) / this.requests.length <= 0.02) {
                            if (canResolve) {
                                this.clear();
                                resolve();
                            }
                            else {
                                this.poll(resolve, reject, true);
                            }
                        }
                        else if (this.used > this.timeout) {
                            usedTime = this.used;
                            msg = "Wait for all requests done, " + this.requests.length + " sent and " + this.offsets.length + " received, timeout after " + usedTime + "ms.";
                            this.clear();
                            reject(new Error(msg));
                        }
                        else {
                            this.poll(resolve, reject);
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    RequestCounter.prototype.waitForAllDone = function () {
        var _this = this;
        this.used = 0;
        return new Promise(function (resolve, reject) { return _this.poll(resolve, reject); });
    };
    return RequestCounter;
}());
exports.default = RequestCounter;
//# sourceMappingURL=request-counter.js.map