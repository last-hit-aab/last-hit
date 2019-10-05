import { faHtml5 } from '@fortawesome/free-brands-svg-icons';
import {
	faEdit,
	faPaperPlane,
	faQuestionCircle,
	faRoute,
	faSnowboarding,
	faSnowman,
	faTimesCircle
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import DialogOpenIcon from '@material-ui/icons/AssignmentLate';
import DialogCloseIcon from '@material-ui/icons/AssignmentTurnedIn';
import PageErrorIcon from '@material-ui/icons/Error';
import FocusIcon from '@material-ui/icons/FilterCenterFocus';
import KeyIcon from '@material-ui/icons/Keyboard';
import ResourceLoadIcon from '@material-ui/icons/Label';
import ResourceUnloadIcon from '@material-ui/icons/LabelOff';
import ScrollIcon from '@material-ui/icons/Motorcycle';
import MouseIcon from '@material-ui/icons/Mouse';
import AjaxIcon from '@material-ui/icons/NetworkCheck';
import PageCreateIcon from '@material-ui/icons/PostAdd';
import React from 'react';
import {
	AjaxStep,
	ChangeStep,
	ClickStep,
	DialogCloseStep,
	DialogOpenStep,
	DomChangeStep,
	EndStep,
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
} from '../../workspace-settings';

const shorternUrl = (url: string): string => {
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
const IGNORED_ATTRS = ['style', 'value', 'lang'];
const shorternTarget = (target: string): string => {
	try {
		if (target === 'document') {
			return 'Document';
		} else if (target) {
			const parser = new DOMParser();
			const xml = parser.parseFromString(target.substr(0, target.length - 1) + '/>', 'text/xml');
			const node = xml.children[0];
			const attrs = node.attributes;
			const array = [];
			for (let index = 0, count = attrs.length; index < count; index++) {
				const attr = attrs.item(index)!;
				array.push({ name: attr.name, value: attr.value });
			}
			return `<${node.tagName} ${array
				.filter(item => !!item.value && !IGNORED_ATTRS.includes(item.name))
				.map(item => `${item.name}="${item.value}"`)
				.join(' ')}/>`;
		}
	} catch (e) {
		console.error(e);
	}
	return target;
};
const DEFAULT_STEP_FORK = {
	icon: <FontAwesomeIcon icon={faQuestionCircle} />,
	label: (step: Step): string => `Step [${step.type}], don't know how to describe it.`
};
const STEP_FORKS = {
	// start & end
	[StepType.START]: {
		icon: <FontAwesomeIcon icon={faSnowboarding} />,
		label: (step: StartStep): string => `Start from ${shorternUrl(step.url)}`
	},
	[StepType.END]: {
		icon: <FontAwesomeIcon icon={faSnowman} />,
		label: (step: EndStep): string => 'Happy Ending!'
	},
	// resource
	[StepType.AJAX]: {
		icon: <AjaxIcon style={{ transform: 'translateY(4px)' }} />,
		label: (step: AjaxStep): string => {
			const { request } = step;
			return `${request.resourceType.toUpperCase()} ${request.method} ${shorternUrl(request.url)}`;
		}
	},
	[StepType.RESOURCE_LOAD]: {
		icon: <ResourceLoadIcon style={{ transform: 'translateY(4px)' }} />,
		label: (step: ResourceLoadStep): string => {
			const { request } = step;
			return `${request.resourceType.toUpperCase()} ${shorternUrl(request.url)}`;
		}
	},
	[StepType.LOAD]: {
		icon: <ResourceLoadIcon style={{ transform: 'translateY(4px)' }} />,
		label: (step: LoadStep): string => `Load resource ${shorternTarget(step.target)}`
	},
	[StepType.UNLOAD]: {
		icon: <ResourceUnloadIcon style={{ transform: 'translateY(4px)' }} />,
		label: (step: UnloadStep): string => `Unload resource ${shorternTarget(step.target)}`
	},
	// page
	[StepType.PAGE_CLOSED]: {
		icon: <FontAwesomeIcon icon={faTimesCircle} />,
		label: (step: PageClosedStep): string => `Page closed, ${shorternUrl(step.url)}`
	},
	[StepType.PAGE_CREATED]: {
		icon: <PageCreateIcon style={{ transform: 'translateY(3px)' }} />,
		label: (step: PageCreatedStep): string => `Page created, ${shorternUrl(step.url)}`
	},
	[StepType.DIALOG_OPEN]: {
		icon: <DialogOpenIcon style={{ transform: 'translateY(6px)' }} />,
		label: (step: DialogOpenStep): string =>
			`${step.dialog.charAt(0).toUpperCase() + step.dialog.slice(1)} opened, ${shorternUrl(step.url)}`
	},
	[StepType.DIALOG_CLOSE]: {
		icon: <DialogCloseIcon style={{ transform: 'translateY(6px)' }} />,
		label: (step: DialogCloseStep): string =>
			`${step.dialog.charAt(0).toUpperCase() + step.dialog.slice(1)} closed, ${shorternUrl(step.url)}`
	},
	[StepType.PAGE_ERROR]: {
		icon: <PageErrorIcon style={{ transform: 'translateY(4px)' }} />,
		label: (step: PageErrorStep): string => `Error occurred in page, ${shorternUrl(step.url)}`
	},
	[StepType.PAGE_SWITCHED]: {
		icon: <FontAwesomeIcon icon={faRoute} />,
		label: (step: PageSwitchStep): string => `Navigate to ${shorternUrl(step.url)}.`
	},
	// dom
	[StepType.CHANGE]: {
		icon: <FontAwesomeIcon icon={faEdit} style={{ transform: 'translateY(-2px)' }} />,
		label: (step: ChangeStep): string => `Value changed to [${step.value}] at ${shorternTarget(step.target)}`
	},
	[StepType.VALUE_CHANGE]: {
		icon: <FontAwesomeIcon icon={faEdit} />,
		label: (step: ChangeStep): string => `Value changed to [${step.value}] at ${shorternTarget(step.target)}`
	},
	[StepType.CLICK]: {
		icon: <MouseIcon style={{ transform: 'translateY(4px)' }} />,
		label: (step: ClickStep): string => `Click on ${shorternTarget(step.target)}.`
	},
	[StepType.DOM_CHANGE]: {
		icon: <FontAwesomeIcon icon={faHtml5} />,
		label: (step: DomChangeStep): string => 'DOM Changed.'
	},
	[StepType.FOCUS]: {
		icon: <FocusIcon style={{ transform: 'translateY(4px)' }} />,
		label: (step: FocusStep): string => `Focus ${shorternTarget(step.target)}.`
	},
	[StepType.MOUSE_DOWN]: {
		icon: <MouseIcon style={{ transform: 'translateY(4px)' }} />,
		label: (step: MouseDownStep): string => `Mouse down on ${shorternTarget(step.target)}.`
	},
	[StepType.KEY_DOWN]: {
		icon: <KeyIcon style={{ transform: 'translateY(4px)' }} />,
		label: (step: MouseDownStep): string => `Key down on ${shorternTarget(step.target)}.`
	},
	[StepType.SCROLL]: {
		icon: <ScrollIcon style={{ transform: 'translateY(4px)' }} />,
		label: (step: ScrollStep): string =>
			`Scroll to [${step.scrollTop},${step.scrollLeft}] on ${shorternTarget(step.target)}.`
	},
	[StepType.SUBMIT]: {
		icon: <FontAwesomeIcon icon={faPaperPlane} />,
		label: (step: Step): string => 'Tranditional sumbit triggered, your deserve it!'
	}
} as { [key in StepType]: { icon: JSX.Element; label: (step: Step) => string } };

export const getStepFork = (step: Step) => {
	return STEP_FORKS[step.type] || DEFAULT_STEP_FORK;
};
export const StepIcon = (props: { step: Step }): JSX.Element => {
	return <span>{getStepFork(props.step).icon}</span>;
};
export const ASSERTABLE_STEPS = [
	StepType.START,
	StepType.CHANGE,
	StepType.CLICK,
	StepType.MOUSE_DOWN,
	StepType.DOM_CHANGE,
	StepType.FOCUS,
	StepType.AJAX,
	StepType.VALUE_CHANGE
];
export const CONDITIONABLE_STEPS = [
	StepType.CHANGE,
	StepType.CLICK,
	StepType.MOUSE_DOWN,
	StepType.DOM_CHANGE,
	StepType.FOCUS,
	StepType.AJAX,
	StepType.VALUE_CHANGE
];
export const IRRELEVANT_STEPS = [
	StepType.AJAX,
	StepType.LOAD,
	StepType.UNLOAD,
	StepType.RESOURCE_LOAD,
	StepType.PAGE_ERROR
];
export enum ReplayType {
	SMART = 1,
	REGULAR = 2,
	STEP = 3,
	NONE = 0
}
