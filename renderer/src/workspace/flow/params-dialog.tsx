import { Button, ButtonGroup, Classes, InputGroup, MenuItem, Overlay } from '@blueprintjs/core';
import { Select } from '@blueprintjs/select';
import { remote } from 'electron';
import {
	Flow,
	FlowParameter,
	FlowParameters,
	FlowParameterType,
	FlowParameterValueType,
	Story
} from 'last-hit-types';
import React from 'react';
import styled from 'styled-components';
import UIContext from '../../common/context';
import IDESettings from '../../common/ide-settings';
import { EventTypes } from '../../events';

const { gap } = IDESettings.getStyles();

const ParamsGrid = styled.div`
	display: grid;
	grid-template-columns: 200px 1fr 100px 64px;
	grid-row-gap: ${() => `${gap}px`};
	grid-column-gap: ${() => `${gap}px`};
	padding: ${() => `0 ${gap}px`};
	margin: ${() => `0 -${gap}px`};
	max-height: 300px;
	overflow-x: hidden;
	overflow-y: auto;
	> *:nth-child(-n + 4) {
		margin-top: ${() => `${gap}px`};
	}
	> *:nth-last-child(-n + 4) {
		margin-bottom: ${() => `${gap}px`};
	}
`;
const ParamTypeSelect = Select.ofType<FlowParameterType>();
const asParamTypeText = (text: string): string => (text || '').toUpperCase();
const ParamTypeSelectRenderer = (item: FlowParameterType, props: any): JSX.Element | null => {
	const { handleClick, modifiers } = props;
	if (!modifiers.matchesPredicate) {
		return null;
	}
	const text = asParamTypeText(item);
	return <MenuItem text={text} key={text} onClick={handleClick} />;
};

const ParamLine = (props: {
	param: FlowParameter;
	onlyOne: boolean;
	last: boolean;
	onDelete: (param: FlowParameter) => void;
	onAdd: () => void;
}): JSX.Element => {
	const { param, onlyOne, last, onDelete, onAdd } = props;

	const [ignored, forceUpdate] = React.useReducer(x => x + 1, 0);
	const handleChange = (prop: 'name' | 'value') => (event: any) => {
		param[prop] = event.target.value;
		forceUpdate(ignored);
	};
	const handleTypeChange = (type: FlowParameterType): void => {
		param.type = type;
		forceUpdate(ignored);
	};

	const asValueText = (value: FlowParameterValueType): string => {
		return !value ? '' : `${value}`;
	};

	return (
		<React.Fragment>
			<InputGroup fill={true} onChange={handleChange('name')} value={param.name} />
			<InputGroup
				fill={true}
				onChange={handleChange('value')}
				value={asValueText(param.value)}
			/>
			<ParamTypeSelect
				items={['in', 'out', 'both']}
				filterable={false}
				itemRenderer={ParamTypeSelectRenderer}
				onItemSelect={handleTypeChange}
				popoverProps={{ minimal: true }}>
				<Button rightIcon="caret-down" text={asParamTypeText(param.type)} />
			</ParamTypeSelect>
			<ButtonGroup minimal={true}>
				{onlyOne ? null : (
					<Button icon="cross" intent="danger" onClick={() => onDelete(param)} />
				)}
				{last ? <Button icon="plus" intent="primary" onClick={onAdd} /> : null}
			</ButtonGroup>
		</React.Fragment>
	);
};

const TheDialog = (props: { story: Story; flow: Flow }): JSX.Element => {
	const { story, flow } = props;
	const { emitter } = React.useContext(UIContext);
	const close = () => {
		emitter.emit(EventTypes.CLOSE_FLOW_PARAMS_DIALOG, story, flow);
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

		flow.params = params;
		emitter.emit(EventTypes.ASK_SAVE_FLOW, story, flow);
		close();
	};

	const [params, setParams] = React.useState(
		(): FlowParameters => {
			const params = JSON.parse(JSON.stringify(flow.params || []));
			if (params.length === 0) {
				params.push({ type: 'in' } as FlowParameter);
			}
			return params;
		}
	);

	const onDeleteParam = (param: FlowParameter): void => {
		setParams(params.filter(p => p !== param));
	};
	const onAddParam = (): void => {
		params.push({ type: 'in' } as FlowParameter);
		setParams([...params]);
	};

	return (
		<Overlay
			isOpen={true}
			onClose={close}
			canEscapeKeyClose={false}
			canOutsideClickClose={false}
			className={`${Classes.OVERLAY_CONTAINER} medium`}
			autoFocus={true}>
			<div className={`${Classes.CARD} ${Classes.ELEVATION_2}`}>
				<h3 className="bp3-heading">Flow parameterize</h3>
				<ParamsGrid>
					{params.map((param: FlowParameter, index: number) => {
						return (
							<ParamLine
								param={param}
								key={index}
								onlyOne={params.length === 1}
								last={index === params.length - 1}
								onDelete={onDeleteParam}
								onAdd={onAddParam}
							/>
						);
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

export default (): JSX.Element => {
	const { emitter } = React.useContext(UIContext);

	const [data, setData] = React.useState(null as null | { story: Story; flow: Flow });

	React.useEffect(() => {
		const openMe = (story: Story, flow: Flow): void => setData({ story, flow });
		const closeMe = (): void => setData(null);
		emitter
			.on(EventTypes.ASK_FLOW_PARAMS, openMe)
			.on(EventTypes.CLOSE_FLOW_PARAMS_DIALOG, closeMe);

		return () => {
			emitter
				.off(EventTypes.ASK_FLOW_PARAMS, openMe)
				.off(EventTypes.CLOSE_FLOW_PARAMS_DIALOG, closeMe);
		};
	});

	if (data != null) {
		return <TheDialog {...data} />;
	} else {
		return <React.Fragment />;
	}
};
