"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var types_1 = require("../../types");
var WorkspaceEventTypes;
(function (WorkspaceEventTypes) {
    WorkspaceEventTypes["ENV_PREPARE"] = "env-prepare";
    WorkspaceEventTypes["STORY_PREPARE"] = "story-prepare";
    WorkspaceEventTypes["FLOW_SHOULD_START"] = "flow-should-start";
    WorkspaceEventTypes["FLOW_ACCOMPLISHED"] = "flow-accomplished";
    WorkspaceEventTypes["STEP_SHOULD_START"] = "step-should-start";
    WorkspaceEventTypes["STEP_ON_ERROR"] = "step-on-error";
    WorkspaceEventTypes["STEP_ACCOMPLISHED"] = "step-accomplished";
    WorkspaceEventTypes["RELOAD_ALL_HANDLERS"] = "reload-all-handlers";
    WorkspaceEventTypes["RELOAD_STORY_HANDLER"] = "reload-story-handler";
    WorkspaceEventTypes["RELOAD_FLOW_HANDLER"] = "reload-flow-handler";
    WorkspaceEventTypes["RELOAD_STEP_HANDLER"] = "reload-step-handler";
})(WorkspaceEventTypes = exports.WorkspaceEventTypes || (exports.WorkspaceEventTypes = {}));
var WorkspaceExtensionEntryPointWrapper = /** @class */ (function (_super) {
    __extends(WorkspaceExtensionEntryPointWrapper, _super);
    function WorkspaceExtensionEntryPointWrapper(entrypoint) {
        var _a;
        var _this = _super.call(this, entrypoint) || this;
        _this.handlers = (_a = {},
            _a[WorkspaceEventTypes.ENV_PREPARE] = entrypoint.handleEnvironmentPrepare,
            _a[WorkspaceEventTypes.STORY_PREPARE] = entrypoint.handleStoryPrepare,
            _a[WorkspaceEventTypes.FLOW_SHOULD_START] = entrypoint.handleFlowShouldStart,
            _a[WorkspaceEventTypes.FLOW_ACCOMPLISHED] = entrypoint.handleFlowAccomplished,
            _a[WorkspaceEventTypes.STEP_SHOULD_START] = entrypoint.handleStepShouldStart,
            _a[WorkspaceEventTypes.STEP_ON_ERROR] = entrypoint.handleStepOnError,
            _a[WorkspaceEventTypes.STEP_ACCOMPLISHED] = entrypoint.handleStepAccomplished,
            _a[WorkspaceEventTypes.RELOAD_ALL_HANDLERS] = entrypoint.handleReloadAllHandlers,
            _a[WorkspaceEventTypes.RELOAD_STORY_HANDLER] = entrypoint.handleReloadStoryHandler,
            _a[WorkspaceEventTypes.RELOAD_FLOW_HANDLER] = entrypoint.handleReloadFlowHandler,
            _a[WorkspaceEventTypes.RELOAD_STEP_HANDLER] = entrypoint.handleReloadStepHandler,
            _a);
        return _this;
    }
    WorkspaceExtensionEntryPointWrapper.prototype.handle = function (event) {
        var handler = this.handlers[event.type];
        if (handler) {
            handler.call(this.getEntrypoint(), event);
        }
        else {
            console.error("Handler not found for event[" + event.type + "]");
            console.error(event);
        }
    };
    return WorkspaceExtensionEntryPointWrapper;
}(types_1.AbstractExtensionEntryPointWrapper));
exports.WorkspaceExtensionEntryPointWrapper = WorkspaceExtensionEntryPointWrapper;
//# sourceMappingURL=workspace.js.map