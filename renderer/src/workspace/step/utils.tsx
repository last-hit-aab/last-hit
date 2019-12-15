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
	KeydownStep,
	LoadStep,
	MousedownStep,
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
} from 'last-hit-types';
import React from 'react';

const StepIcons = {
	start: 'search-around',
	mousedown: 'key-escape',
	click: 'key-escape',
	change: 'text-highlight',
	ajax: 'exchange',
	'dom-change': 'grid-view',
	end: 'selection',
	'page-closed': 'cube-remove',
	'page-created': 'cube-add',
	'page-error': 'error',
	'page-switched': 'left-join',
	'dialog-open': 'add',
	'dialog-close': 'remove',
	'resource-load': 'zoom-to-fit',
	load: 'zoom-to-fit',
	keydown: 'widget-button',
	focus: 'flag',
	scroll: 'comparison',
	unload: 'undo',
	animation: 'social-media'
} as { [key in StepType]: string };

const StepTexts = {
	start: (step: StartStep, flow: Flow): string => {
		if (flow.settings && flow.settings.forceDepends) {
			return `Force depends on ${flow.settings.forceDepends.flow}@${flow.settings.forceDepends.story}`;
		}
		return `Start from ${shorternUrl(step.url!)}`;
	},
	mousedown: (step: MousedownStep, flow: Flow): string =>
		`Mouse down on ${shorternTarget(step.target)}.`,
	click: (step: ClickStep, flow: Flow): string => `Click on ${shorternTarget(step.target)}.`,
	change: (step: ChangeStep, flow: Flow): string => {
		if (step.target.match(/type="password"/)) {
			return `Value changed to [**********] at ${shorternTarget(step.target)}`;
		} else {
			return `Value changed to [${step.value}] at ${shorternTarget(step.target)}`;
		}
	},
	ajax: (step: AjaxStep, flow: Flow): string => {
		const { request } = step;
		return `${request.resourceType.toUpperCase()} ${request.method} ${shorternUrl(
			request.url
		)}`;
	},
	'dom-change': (step: DomChangeStep, flow: Flow): string => 'DOM Changed.',
	end: (step: EndStep, flow: Flow): string => 'Happy Ending!',
	'page-closed': (step: PageClosedStep, flow: Flow): string =>
		`Page closed, ${shorternUrl(step.url)}`,
	'page-created': (step: PageCreatedStep, flow: Flow): string =>
		`Page created, ${shorternUrl(step.url)}`,
	'page-error': (step: PageErrorStep, flow: Flow): string =>
		`Error occurred in page, ${shorternUrl(step.url)}`,
	'page-switched': (step: PageSwitchStep, flow: Flow): string =>
		`Navigate to ${shorternUrl(step.url)}.`,
	'dialog-open': (step: DialogOpenStep, flow: Flow): string => {
		const dialogType = step.dialog || 'Unknown Dialog';
		return `${dialogType.charAt(0).toUpperCase() + dialogType.slice(1)} opened, ${shorternUrl(
			step.url
		)}`;
	},
	'dialog-close': (step: DialogCloseStep, flow: Flow): string => {
		const dialogType = step.dialog || 'Unknown Dialog';
		return `${dialogType.charAt(0).toUpperCase() + dialogType.slice(1)} closed, ${shorternUrl(
			step.url
		)}`;
	},
	'resource-load': (step: ResourceLoadStep, flow: Flow): string => {
		const { request } = step;
		return `${request.resourceType.toUpperCase()} ${shorternUrl(request.url)}`;
	},
	load: (step: LoadStep, flow: Flow): string => `Load resource ${shorternTarget(step.target)}`,
	keydown: (step: KeydownStep, flow: Flow): string =>
		`Key down on ${shorternTarget(step.target)}.`,
	focus: (step: FocusStep, flow: Flow): string => `Focus ${shorternTarget(step.target)}.`,
	scroll: (step: ScrollStep, flow: Flow): string =>
		`Scroll to [${step.scrollTop},${step.scrollLeft}] on ${shorternTarget(step.target)}.`,
	unload: (step: UnloadStep, flow: Flow): string =>
		`Unload resource ${shorternTarget(step.target)}`,
	animation: (step: Step, flow: Flow): string => 'Animation here.'
} as { [key in StepType]: (step: Step, flow: Flow) => string };

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
