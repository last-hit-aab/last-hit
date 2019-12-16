import { Button, Classes, InputGroup, Overlay } from '@blueprintjs/core';
import { remote } from 'electron';
import { Flow, FlowParameter, FlowParameters, FlowParameterValueType } from 'last-hit-types';
import React from 'react';
import styled from 'styled-components';
import IDESettings from '../../common/ide-settings';

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

export default (props: {
	flow: Flow;
	onConfirm: (params: FlowParameters) => void;
	onCancel: () => void;
}): JSX.Element => {
	const { flow, onConfirm, onCancel } = props;
	const close = () => onCancel();

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

		onConfirm(params);
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
				<h3 className="bp3-heading">Flow parameterize</h3>
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
