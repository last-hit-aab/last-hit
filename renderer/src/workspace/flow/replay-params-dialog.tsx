import { Button, Classes, InputGroup, Overlay, MenuItem, FormGroup } from '@blueprintjs/core';
import { remote } from 'electron';
import {
	Flow,
	FlowParameter,
	FlowParameters,
	FlowParameterValueType,
	Environment
} from 'last-hit-types';
import React, { SyntheticEvent } from 'react';
import styled from 'styled-components';
import IDESettings from '../../common/ide-settings';
import { ItemRenderer, Select } from '@blueprintjs/select';
import { getActiveWorkspace } from '../../active';

const { gap } = IDESettings.getStyles();

const ParamsGrid = styled.div`
	display: grid;
	grid-template-columns: 1fr 200px;
	grid-row-gap: ${() => `${gap}px`};
	grid-column-gap: ${() => `${gap}px`};
	padding: ${() => `0 ${gap}px`};
	margin: ${() => `0 -${gap}px`};
	max-height: 300px;
	overflow-x: hidden;
	overflow-y: auto;
	> *:nth-child(-n + 2) {
		margin-top: ${() => `${gap}px`};
	}
	> *:nth-last-child(-n + 2) {
		margin-bottom: ${() => `${gap}px`};
	}
`;

const ParamLine = (props: { param: FlowParameter }): JSX.Element => {
	const { param } = props;

	const [ignored, forceUpdate] = React.useReducer(x => x + 1, 0);
	const handleChange = (event: any) => {
		param.value = event.target.value;
		forceUpdate(ignored);
	};

	const asValueText = (value: FlowParameterValueType): string => {
		return !value ? '' : `${value}`;
	};

	return (
		<React.Fragment>
			<InputGroup fill={true} value={param.name} readOnly />
			<InputGroup fill={true} onChange={handleChange} value={asValueText(param.value)} />
		</React.Fragment>
	);
};

const EnvSelect = Select.ofType<Environment>();
const renderOwner: ItemRenderer<Environment> = (env, { handleClick, modifiers, query }) => {
	if (!modifiers.matchesPredicate) {
		return null;
	}
	return (
		<MenuItem
			active={modifiers.active}
			disabled={modifiers.disabled}
			key={env.name}
			onClick={handleClick}
			text={env.name}
		/>
	);
};

export default (props: {
	flow: Flow;
	onConfirm: (params: FlowParameters, env: Environment | null) => void;
	onCancel: () => void;
}): JSX.Element => {
	const { flow, onConfirm, onCancel } = props;
	const close = () => onCancel();

	let { envs = [] } = getActiveWorkspace()!.getSettings();
	const envNotNow = { name: 'Not Now' };
	envs = [envNotNow, ...envs];
	const [env, setEnv] = React.useState<Environment>(envs[0]);

	const onEnvSelect = (item: Environment, event?: SyntheticEvent<HTMLElement>): void => {
		setEnv(item);
	};
	const onConfirmClicked = () => {
		const names: Set<string> = new Set<string>(params.map(param => (param.name || '').trim()));
		if (names.has('')) {
			remote.dialog.showMessageBox(remote.getCurrentWindow(), {
				type: 'error',
				title: 'Empty name(s)',
				message: 'Empty name(s) on flow parameters.'
			});
			return;
		}
		if (names.size !== params.length) {
			remote.dialog.showMessageBox(remote.getCurrentWindow(), {
				type: 'error',
				title: 'Duplicated names',
				message: 'Duplicated names on flow parameters.'
			});
			return;
		}

		onConfirm(params, env === envNotNow ? null : env);
	};

	const params: FlowParameters = JSON.parse(JSON.stringify(flow.params || []));

	return (
		<Overlay
			isOpen={true}
			onClose={close}
			canEscapeKeyClose={false}
			canOutsideClickClose={false}
			className={`${Classes.OVERLAY_CONTAINER} small`}
			autoFocus={true}>
			<div className={`${Classes.CARD} ${Classes.ELEVATION_2}`}>
				<h3 className="bp3-heading">Replay Settings</h3>
				<FormGroup label="Environment">
					<EnvSelect
						items={envs}
						itemRenderer={renderOwner}
						filterable={false}
						onItemSelect={onEnvSelect}>
						{/* children become the popover target; render value here */}
						<Button text={env.name} rightIcon="caret-down" />
					</EnvSelect>
				</FormGroup>
				<span>Parameter Values</span>
				<ParamsGrid>
					{params.map((param: FlowParameter, index: number) => {
						return <ParamLine param={param} key={index} />;
					})}
				</ParamsGrid>
				<div className="overlay-placeholder" />
				<div className={Classes.DIALOG_FOOTER_ACTIONS}>
					<Button onClick={close}>Cancel</Button>
					<Button onClick={onConfirmClicked} intent="primary">
						OK
					</Button>
				</div>
			</div>
		</Overlay>
	);
};
