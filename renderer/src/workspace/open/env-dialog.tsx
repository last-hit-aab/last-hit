import {
	Button,
	Classes,
	Colors,
	FormGroup,
	InputGroup,
	Overlay,
	Tab,
	Tabs
} from '@blueprintjs/core';
import React from 'react';
import styled from 'styled-components';
import uuidv4 from 'uuid/v4';
import { getActiveWorkspace } from '../../active';
import UIContext from '../../common/context';
import IDESettings from '../../common/ide-settings';
import { EventTypes } from '../../events';
import { saveWorkspace } from '../../files';
import { ExecuteEnv } from '../../types';

type EditableEnv = ExecuteEnv & { uuid: string };

const {
	gap,
	padding: { body }
} = IDESettings.getStyles();

const EnvTabs = styled(Tabs)`
	height: 100%;
	display: flex;
	flex-direction: column;
	> .bp3-tab-list {
		overflow-x: auto;
		> .bp3-tab {
			padding: ${() => `0 ${gap}px`};
			> div {
				> .bp3-icon {
					margin-right: ${() => `${gap}px`};
				}
				> span {
					user-select: none;
				}
				> button.bp3-button:not([class*='bp3-intent-']) {
					margin-left: ${() => `${gap}px`};
					border-radius: 100%;
					> span.bp3-icon {
						color: inherit;
					}
				}
			}
		}
	}
	> .bp3-tab-panel {
		flex-grow: 1;
		height: 100%;
		overflow: hidden;
		border-top: 1px solid ${() => Colors.DARK_GRAY5};
		margin-top: 0;
		margin-left: -${() => `${body}px`};
		margin-right: -${() => `${body}px`};
		padding-left: ${() => `${body}px`};
		padding-right: ${() => `${body}px`};
		padding-top: ${() => `${body}px`};
	}
`;

const TabPanel = (props: {
	tab: EditableEnv;
	nameChanged: (tab: EditableEnv) => void;
}): JSX.Element => {
	const { tab, nameChanged } = props;

	const [ignored, forceUpdate] = React.useReducer((x: number): number => x + 1, 0);
	const onNameChange = (event: any) => {
		tab.name = event.target.value;
		forceUpdate(ignored);
		nameChanged(tab);
	};
	const onUrlReplacementRegexpChange = (event: any) => {
		tab.urlReplaceRegexp = event.target.value;
		forceUpdate(ignored);
	};
	const onUrlReplacementToChange = (event: any) => {
		tab.urlReplaceTo = event.target.value;
		forceUpdate(ignored);
	};
	const asText = (values: string | string[] | undefined | null): string => {
		if (!values) {
			return '';
		} else if (Array.isArray(values)) {
			return values.join('&&');
		} else {
			return values as string;
		}
	};
	return (
		<div>
			<FormGroup label="Environment Name">
				<InputGroup fill={true} onChange={onNameChange} value={tab.name} />
			</FormGroup>
			<FormGroup label={'URL Replacement Regexp, Use "&&" To Split.'}>
				<InputGroup
					fill={true}
					onChange={onUrlReplacementRegexpChange}
					value={asText(tab.urlReplaceRegexp)}
				/>
			</FormGroup>
			<FormGroup label={'URL Replace To, Use "&&" To Split.'}>
				<InputGroup
					fill={true}
					onChange={onUrlReplacementToChange}
					value={asText(tab.urlReplaceTo)}
				/>
			</FormGroup>
		</div>
	);
};

const TheDialog = (): JSX.Element => {
	const { emitter } = React.useContext(UIContext);
	const close = () => {
		emitter.emit(EventTypes.CLOSE_ENV_DIALOG);
	};

	const [ignored, forceUpdate] = React.useReducer(x => x + 1, 0);
	const [data, setData] = React.useState(() => {
		const settings = getActiveWorkspace()!.getSettings();
		const envs: Array<EditableEnv> = JSON.parse(
			JSON.stringify(
				(() => {
					const envs: Array<EditableEnv> = ((settings.envs || [
						{ name: 'Env-1' },
						{ name: 'Env-2' },
						{ name: 'Env-3' }
					]) as Array<EditableEnv>).filter((env: EditableEnv) => {
						return Object.keys(env).length !== 0;
					});
					while (envs.length < 3) {
						envs.push({ name: `Envs-${envs.length + 1}` } as EditableEnv);
					}
					envs.forEach((env: EditableEnv) => (env.uuid = uuidv4()));
					return envs;
				})()
			)
		);

		return { envs, activeId: envs[0].uuid };
	});
	const handleTabChange = (newTabId: React.ReactText): void => {
		setData({ ...data, activeId: newTabId as string });
	};
	const onNameChanged = (env: EditableEnv): void => forceUpdate(ignored);
	const onConfirmClicked = (): void => {
		const settings = getActiveWorkspace()!.getSettings();
		settings.envs = data.envs.map((env: EditableEnv) => {
			const { uuid, ...rest } = env;
			return rest;
		});
		saveWorkspace();
		close();
	};

	return (
		<Overlay
			isOpen={true}
			className={`${Classes.OVERLAY_CONTAINER} medium`}
			canEscapeKeyClose={false}
			canOutsideClickClose={false}
			autoFocus={true}>
			<div className={`${Classes.CARD} ${Classes.ELEVATION_2}`}>
				<h3 className="bp3-heading">Environment Settings</h3>
				<EnvTabs
					id="envs-tab"
					animate={true}
					onChange={handleTabChange}
					selectedTabId={data.activeId}
					renderActiveTabPanelOnly={true}>
					{data.envs.map((env: EditableEnv, index: number) => {
						return (
							<Tab
								id={env.uuid}
								key={env.uuid}
								title={env.name || `Nonamed ${index + 1}`}
								panel={<TabPanel tab={env} nameChanged={onNameChanged} />}
							/>
						);
					})}
					<Tabs.Expander />
				</EnvTabs>
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

	const [opened, setOpened] = React.useState(false);
	React.useEffect(() => {
		const openMe = (): void => setOpened(true);
		const closeMe = (): void => setOpened(false);

		emitter.on(EventTypes.ASK_OPEN_ENV, openMe).on(EventTypes.CLOSE_ENV_DIALOG, closeMe);

		return () => {
			emitter.off(EventTypes.ASK_OPEN_ENV, openMe).off(EventTypes.CLOSE_ENV_DIALOG, closeMe);
		};
	});

	if (opened) {
		return <TheDialog />;
	} else {
		return <React.Fragment />;
	}
};
