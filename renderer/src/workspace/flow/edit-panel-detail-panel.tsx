import { Button, FormGroup, InputGroup, MenuItem, Switch } from '@blueprintjs/core';
import { Select } from '@blueprintjs/select';
import { AjaxStep, Device, Flow, StartStep, Step, Story } from 'last-hit-types';
import React from 'react';
import styled from 'styled-components';
import uuidv4 from 'uuid/v4';
import UIContext from '../../common/context';
import Devices from '../../common/device-descriptors';
import IDESettings from '../../common/ide-settings';
import { EventTypes } from '../../events';
import { getStepTypeText } from '../step/utils';
import EditPanelBottomBar from './edit-panel-detail-panel-bottom-bar';

const {
	padding: { body }
} = IDESettings.getStyles();

type FieldDefinition = {
	label: string;
	propName: string;
	writeable: boolean;
	helpText?: string;
};
const Container = styled.div`
	grid-row: 1 / span 2;
	grid-column: 2;
	display: flex;
	flex-direction: column;
	height: 100%;
	overflow: hidden;
`;

const Panel = styled.div`
	flex-grow: 1;
	height: 100%;
	padding: ${() => `${body}px 0 0 ${body}px`};
	display: flex;
	flex-direction: column;
	> h3 {
		text-transform: uppercase;
	}
`;

const FieldPanel = styled.div`
	flex-grow: 1;
	height: 100%;
	overflow-y: auto;
	overflow-x: hidden;
	padding-top: ${() => `${body}px`};
	padding-right: ${() => `${body}px`};
	> .bp3-form-group.bp3-inline {
		> .bp3-label {
			width: 160px;
		}
		> .bp3-form-content {
			flex-grow: 1;
		}
	}
`;

const buildStepFieldDefinitions = (flow: Flow, step: Step): Array<FieldDefinition> => {
	const forceDependency = !!(flow.settings && flow.settings.forceDepends);
	const properties: Array<FieldDefinition> = [
		{
			label: 'Human Reading',
			propName: 'human',
			writeable: true,
			helpText: 'Human reading text, make step more understandable.'
		}
	];

	switch (step.type) {
		case 'change':
			properties.push({
				label: 'Value',
				propName: 'value',
				writeable: true
			});
			properties.push({
				label: 'Checked',
				propName: 'checked',
				writeable: true,
				helpText: 'Only on checkbox and radio button.'
			});
			properties.push({
				label: 'Force Blur',
				propName: 'forceBlur',
				writeable: true,
				helpText: 'Force trigger blur after change done.'
			});
		// eslint-disable-next-line
		case 'click':
		case 'mousedown':
		case 'keydown':
		case 'focus':
		case 'scroll':
			properties.push({
				label: 'XPath',
				propName: 'path',
				writeable: true
			});
			properties.push({
				label: 'CSS Path',
				propName: 'csspath',
				writeable: true
			});
			properties.push({
				label: 'Custom Path',
				propName: 'custompath',
				writeable: true,
				helpText: 'Custom path of element.'
			});
			properties.push({
				label: 'Target',
				propName: 'target',
				writeable: true
			});
			break;
		case 'start':
			if (!forceDependency) {
				properties.push({
					label: 'URL',
					propName: 'url',
					writeable: true
				});
				properties.push({
					label: 'Device',
					propName: 'device',
					writeable: true
				});
				properties.push({
					label: 'Wechat',
					propName: 'wechat',
					writeable: true
				});
			}
			break;
		case 'page-created':
			properties.push({
				label: 'For',
				propName: 'forStepUuid',
				writeable: true,
				helpText: 'Provide page uuid matching in replayer.'
			});
		// eslint-disable-next-line
		case 'end':
		case 'page-closed':
		case 'page-error':
		case 'page-switched':
		case 'dialog-open':
		case 'dialog-close':
			break;
		case 'ajax':
			properties.push({
				label: 'URL',
				propName: 'url',
				writeable: false
			});
			break;
		case 'dom-change':
		case 'resource-load':
		case 'load':
		case 'unload':
		case 'animation':
			break;
	}
	properties.push({
		label: 'Sleep After',
		propName: 'sleep',
		writeable: true,
		helpText: 'Time waiting after step done, in millisecond.'
	});
	properties.push(
		...[
			{
				label: 'Step UUID',
				propName: 'stepUuid',
				writeable: false,
				helpText: 'Identity of step.'
			},
			{
				label: 'Page UUID',
				propName: 'uuid',
				writeable: false,
				helpText: 'Identity of page.'
			},
			{
				label: 'Step Index',
				propName: 'stepIndex',
				writeable: false
			}
		]
	);
	return properties;
};

const getValueFromStep = (step: Step, propName: string): string | boolean | undefined => {
	switch (true) {
		case step.type === 'ajax' && propName === 'url':
			return (((step as AjaxStep).request || {}) as any).url;
		case step.type === 'start' && propName === 'wechat':
			const { device: { wechat = false } = {} } = step as StartStep;
			return wechat;
		case step.type === 'start' && propName === 'device':
			const { device: { name = Devices[0].name } = {} } = step as StartStep;
			return name;
		default:
			return (step as any)[propName];
	}
};
const setValueToStep = (step: Step, propName: string, value: string | boolean): void => {
	switch (true) {
		case step.type === 'ajax' && propName === 'url':
			const ajax = step as AjaxStep;
			let request = ajax.request;
			if (!request) {
				request = { url: value } as any;
			} else {
				request.url = value as string;
			}
			break;
		case step.type === 'start' && propName === 'wechat':
			{
				const { device = {} } = step as StartStep;
				(step as StartStep).device = { ...device, wechat: value as boolean } as Device;
			}
			break;
		case step.type === 'start' && propName === 'device':
			{
				const { device: { wechat = false } = {} } = step as StartStep;
				const device = Devices.find(device => device.name === value);
				(step as StartStep).device = { ...device, wechat } as Device;
			}
			break;
		default:
			(step as any)[propName] = value;
			break;
	}
};

const isBooleanProperty = (propName: string): boolean =>
	['wechat', 'forceBlur', 'checked'].includes(propName);
const DeviceSelect = Select.ofType<Device>();
const DeviceSelectRenderer = (item: Device, props: any): JSX.Element | null => {
	const { handleClick, modifiers } = props;
	if (!modifiers.matchesPredicate) {
		return null;
	}
	return <MenuItem text={item.name} key={item.name} onClick={handleClick} />;
};
const DeviceSelectPredicator = (
	query: string,
	device: Device,
	index?: number,
	exactMatch?: boolean
): boolean => {
	const normalizedTitle = device.name.toLowerCase();
	const normalizedQuery = query.toLowerCase();

	if (exactMatch) {
		return normalizedTitle === normalizedQuery;
	} else {
		return normalizedTitle.indexOf(normalizedQuery) >= 0;
	}
};

export default (props: { story: Story; flow: Flow; step: Step }): JSX.Element => {
	const { story, flow, step } = props;
	const { emitter } = React.useContext(UIContext);

	// force render
	const [ignored, forceUpdate] = React.useReducer(x => x + 1, 0);

	const handleValueChange = (propName: string) => (
		event: React.ChangeEvent<HTMLInputElement>
	): void => {
		if (isBooleanProperty(propName)) {
			setValueToStep(step, propName, event.target.checked);
		} else {
			setValueToStep(step, propName, event.target.value);
		}
		emitter.emit(EventTypes.ASK_SAVE_FLOW, story, flow);
		// forceUpdate(ignored);
		emitter.emit(EventTypes.STEP_CONTENT_CHANGED, story, flow, step);
	};
	const handleDeviceChange = (device: Device): void => {
		setValueToStep(step, 'device', device.name);
		emitter.emit(EventTypes.ASK_SAVE_FLOW, story, flow);
		forceUpdate(ignored);
	};

	const stepIndex = flow.steps!.indexOf(step) + 1;

	const getPropEditor = (step: Step, field: FieldDefinition): JSX.Element => {
		switch (true) {
			case (step.type === 'start' && field.propName === 'wechat') ||
				(step.type === 'change' && ['forceBlur', 'checked'].includes(field.propName)):
				return (
					<Switch
						defaultChecked={getValueFromStep(step, field.propName) as boolean}
						onChange={handleValueChange(field.propName)}
					/>
				);
			case step.type === 'start' && field.propName === 'device':
				return (
					<DeviceSelect
						items={Devices}
						itemPredicate={DeviceSelectPredicator}
						itemRenderer={DeviceSelectRenderer}
						onItemSelect={handleDeviceChange}
						popoverProps={{ minimal: true }}>
						<Button rightIcon="caret-down" text={getValueFromStep(step, 'device')} />
					</DeviceSelect>
				);
			default:
				return (
					<InputGroup
						defaultValue={getValueFromStep(step, field.propName) as string}
						readOnly={!field.writeable}
						onChange={handleValueChange(field.propName)}
					/>
				);
		}
	};

	return (
		<Container>
			<Panel>
				<h3 className="bp3-heading">
					# {stepIndex} {getStepTypeText(step)}
				</h3>
				<FieldPanel>
					{buildStepFieldDefinitions(flow, step).map(field => {
						return (
							<FormGroup
								helperText={field.helpText}
								label={field.label}
								inline={true}
								disabled={!field.writeable}
								key={uuidv4()}>
								{getPropEditor(step, field)}
							</FormGroup>
						);
					})}
				</FieldPanel>
			</Panel>
			<EditPanelBottomBar story={story} flow={flow} step={step} />
		</Container>
	);
};
