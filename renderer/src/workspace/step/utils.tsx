import React from 'react';
import {
	AjaxStep,
	ChangeStep,
	ClickStep,
	DialogCloseStep,
	DialogOpenStep,
	DomChangeStep,
	EndStep,
	Flow,
	FocusStep,
	LoadStep,
	MouseDownStep,
	PageClosedStep,
	PageCreatedStep,
	PageErrorStep,
	PageSwitchStep,
	ResourceLoadStep,
	ScrollStep,
	StartStep,
	Step,
	StepType,
	UnloadStep
} from '../../types';

const StepIcons = {
	[StepType.START]: 'search-around',
	[StepType.MOUSE_DOWN]: 'key-escape',
	[StepType.CLICK]: 'key-escape',
	[StepType.VALUE_CHANGE]: 'text-highlight',
	[StepType.CHANGE]: 'text-highlight',
	[StepType.AJAX]: 'exchange',
	[StepType.DOM_CHANGE]: 'grid-view',
	[StepType.SUBMIT]: 'send-to',
	[StepType.END]: 'selection',
	[StepType.PAGE_CLOSED]: 'cube-remove',
	[StepType.PAGE_CREATED]: 'cube-add',
	[StepType.PAGE_ERROR]: 'error',
	[StepType.PAGE_SWITCHED]: 'left-join',
	[StepType.DIALOG_OPEN]: 'add',
	[StepType.DIALOG_CLOSE]: 'remove',
	[StepType.RESOURCE_LOAD]: 'zoom-to-fit',
	[StepType.LOAD]: 'zoom-to-fit',
	[StepType.KEY_DOWN]: 'widget-button',
	[StepType.FOCUS]: 'flag',
	[StepType.SCROLL]: 'comparison',
	[StepType.UNLOAD]: 'undo',
	[StepType.ANIMATION]: 'social-media'
};
const StepTexts = {
	[StepType.START]: (step: StartStep, flow: Flow): string => {
		if (flow.settings && flow.settings.forceDepends) {
			return `Force depends on ${flow.settings.forceDepends.flow}@${flow.settings.forceDepends.story}`;
		}
		return `Start from ${shorternUrl(step.url)}`;
	},
	[StepType.MOUSE_DOWN]: (step: MouseDownStep, flow: Flow): string =>
		`Mouse down on ${shorternTarget(step.target)}.`,
	[StepType.CLICK]: (step: ClickStep, flow: Flow): string =>
		`Click on ${shorternTarget(step.target)}.`,
	[StepType.VALUE_CHANGE]: (step: ChangeStep, flow: Flow): string => {
		if (step.target.match(/type="password"/)) {
			return `Value changed to [**********] at ${shorternTarget(step.target)}`;
		} else {
			return `Value changed to [${step.value}] at ${shorternTarget(step.target)}`;
		}
	},
	[StepType.CHANGE]: (step: ChangeStep, flow: Flow): string => {
		if (step.target.match(/type="password"/)) {
			return `Value changed to [**********] at ${shorternTarget(step.target)}`;
		} else {
			return `Value changed to [${step.value}] at ${shorternTarget(step.target)}`;
		}
	},
	[StepType.AJAX]: (step: AjaxStep, flow: Flow): string => {
		const { request } = step;
		return `${request.resourceType.toUpperCase()} ${request.method} ${shorternUrl(
			request.url
		)}`;
	},
	[StepType.DOM_CHANGE]: (step: DomChangeStep, flow: Flow): string => 'DOM Changed.',
	[StepType.SUBMIT]: (step: Step, flow: Flow): string =>
		'Tranditional sumbit triggered, your deserve it!',
	[StepType.END]: (step: EndStep, flow: Flow): string => 'Happy Ending!',
	[StepType.PAGE_CLOSED]: (step: PageClosedStep, flow: Flow): string =>
		`Page closed, ${shorternUrl(step.url)}`,
	[StepType.PAGE_CREATED]: (step: PageCreatedStep, flow: Flow): string =>
		`Page created, ${shorternUrl(step.url)}`,
	[StepType.PAGE_ERROR]: (step: PageErrorStep, flow: Flow): string =>
		`Error occurred in page, ${shorternUrl(step.url)}`,
	[StepType.PAGE_SWITCHED]: (step: PageSwitchStep, flow: Flow): string =>
		`Navigate to ${shorternUrl(step.url)}.`,
	[StepType.DIALOG_OPEN]: (step: DialogOpenStep, flow: Flow): string => {
		const dialogType = step.dialog || 'Unknown Dialog';
		return `${dialogType.charAt(0).toUpperCase() + dialogType.slice(1)} opened, ${shorternUrl(
			step.url
		)}`;
	},
	[StepType.DIALOG_CLOSE]: (step: DialogCloseStep, flow: Flow): string => {
		const dialogType = step.dialog || 'Unknown Dialog';
		return `${dialogType.charAt(0).toUpperCase() + dialogType.slice(1)} closed, ${shorternUrl(
			step.url
		)}`;
	},
	[StepType.RESOURCE_LOAD]: (step: ResourceLoadStep, flow: Flow): string => {
		const { request } = step;
		return `${request.resourceType.toUpperCase()} ${shorternUrl(request.url)}`;
	},
	[StepType.LOAD]: (step: LoadStep, flow: Flow): string =>
		`Load resource ${shorternTarget(step.target)}`,
	[StepType.KEY_DOWN]: (step: MouseDownStep, flow: Flow): string =>
		`Key down on ${shorternTarget(step.target)}.`,
	[StepType.FOCUS]: (step: FocusStep, flow: Flow): string =>
		`Focus ${shorternTarget(step.target)}.`,
	[StepType.SCROLL]: (step: ScrollStep, flow: Flow): string =>
		`Scroll to [${step.scrollTop},${step.scrollLeft}] on ${shorternTarget(step.target)}.`,
	[StepType.UNLOAD]: (step: UnloadStep, flow: Flow): string =>
		`Unload resource ${shorternTarget(step.target)}`,
	[StepType.ANIMATION]: (step: Step, flow: Flow): string => 'Animation here.'
};

export const getStepIcon = (step: Step) => {
	const icon = StepIcons[step.type];
	return icon || 'help';
};

const StepTypeTransformer = /-|_/g;
export const getStepTypeText = (step: Step): string => step.type.replace(StepTypeTransformer, ' ');
export const getStepText = (step: Step, flow: Flow): JSX.Element => {
	const func = StepTexts[step.type];
	const tooltip = func ? func(step as any, flow) : 'Alien found!';
	return <div title={tooltip}>{getStepTypeText(step)}</div>;
};

export const shorternUrl = (url: string): string => {
	try {
		const parsed = new URL(url);
		parsed.search = '';
		parsed.hash = '';
		return parsed.href;
	} catch {
		// parse fail, not a valid url, return directly
		return url;
	}
};

const CONCERNED_ATTRS = ['id', 'class'];
const shorternTarget = (target: string): string => {
	try {
		if (target === 'document') {
			return 'Document';
		} else if (target) {
			const parser = new DOMParser();
			const xml = parser.parseFromString(
				target.substr(0, target.length - 1) + '/>',
				'text/xml'
			);
			const node = xml.children[0];
			const attrs = node.attributes;
			const array = [];
			for (let index = 0, count = attrs.length; index < count; index++) {
				const attr = attrs.item(index)!;
				array.push({ name: attr.name, value: attr.value });
			}
			return `<${node.tagName} ${array
				.filter(item => !!item.value && CONCERNED_ATTRS.includes(item.name))
				.map(item => `${item.name}="${item.value}"`)
				.join(' ')}/>`;
		}
	} catch (e) {
		console.error(e);
	}
	return target;
};
