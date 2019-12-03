import { Button, Classes, Overlay } from '@blueprintjs/core';
import { clipboard, ipcRenderer, IpcRendererEvent, remote } from 'electron';
import { Flow, StartStep, StepType, Story } from 'last-hit-types';
import React from 'react';
import styled from 'styled-components';
import uuidv4 from 'uuid/v4';
import UIContext from '../../common/context';
import Devices from '../../common/device-descriptors';
import { EventTypes } from '../../events';
import { asFlowKey } from '../../files';
import { getStepTypeText } from '../step/utils';

const Placeholder = styled.div`
	flex-grow: 1;
`;

const TheDialog = (props: {
	story: Story;
	flow: Flow;
	isSwitchedFromReplay: boolean;
}): JSX.Element => {
	const { story, flow, isSwitchedFromReplay } = props;
	const { emitter } = React.useContext(UIContext);
	const close = () => {
		emitter.emit(EventTypes.CLOSE_FLOW_RECORD_DIALOG, story, flow);
	};

	// force render
	const [ignored, forceUpdate] = React.useReducer(x => x + 1, 0);

	const handleRecording = (): void => {
		const flowKey = asFlowKey(flow, story);
		ipcRenderer.on(`message-captured-${flowKey}`, (evt, arg) => {
			// add the tail anyway
			flow.steps = flow.steps || [];
			switch (arg.type as StepType) {
				case 'end':
					if (flow.steps.length > 0 && flow.steps[flow.steps.length - 1].type === 'end') {
						// end step already exists
						// may be stop record triggered, and choose the stop and close
						// then puppeteer will disconnect browser manually
						// but browser 'disconnect' event should be invoked anyway, for chromium close/crash or disconnected by puppeteer itself
						return;
					} else {
						setTimeout(() => {
							ipcRenderer.send('disconnect-puppeteer', {
								flowKey
							});
							remote.dialog.showMessageBox(remote.getCurrentWindow(), {
								type: 'warning',
								title: 'Unexpected interruption',
								message:
									'Chromium was closed or crashed, recording stopped. You can play from start and restart recording at last step.'
							});
							close();
						}, 300);
					}
					break;
				case 'page-closed':
					flow.steps.push(arg);
					if (arg.allClosed) {
						// all related pages were closed, disconnect browser and stop recording
						setTimeout(() => {
							stopRecording();
							ipcRenderer.send('disconnect-puppeteer', { flowKey });
							remote.dialog.showMessageBox(remote.getCurrentWindow(), {
								type: 'warning',
								title: 'Unexpected interruption',
								message:
									'All related pages were closed, recording stopped. You can play from start and restart recording at last step.'
							});
							close();
						}, 300);
					}
					break;
				case 'page-switched':
					const { url } = arg;
					if (url === 'about:blank' && flow.steps!.length === 1) {
						// ignore the first about:blank
						return;
					} else {
						for (let index = flow.steps.length - 1; index >= 0; index--) {
							if ((flow.steps[index] as any).url === url) {
								// ignore the page-switched, but not switched
								return;
							}
						}
					}
					flow.steps.push(arg);
					break;
				default:
					flow.steps.push(arg);
					break;
			}
			forceUpdate(ignored);
			emitter.emit(EventTypes.ASK_SAVE_FLOW, story, flow);
		});
	};
	const uninstall = () => {
		const flowKey = asFlowKey(flow, story);
		ipcRenderer.removeAllListeners(`message-captured-${flowKey}`);
	};
	React.useEffect(() => {
		handleRecording();
		return uninstall;
	});
	React.useEffect(() => {
		if (!isSwitchedFromReplay) {
			const step = flow.steps![0] as StartStep;
			const options = {
				url: step.url,
				device: step.device || Devices[0],
				uuid: uuidv4()
			};
			flow.steps = [{ type: 'start', stepIndex: 0, stepUuid: uuidv4(), ...options }];
			emitter.emit(EventTypes.ASK_SAVE_FLOW, story, flow);
			forceUpdate(ignored);
			ipcRenderer.send('launch-puppeteer', {
				...options,
				flowKey: asFlowKey(flow, story)
			});
		}
		// eslint-disable-next-line
	}, [0]);

	const onCaptureScreenshotClicked = (): void => {
		const flowKey = asFlowKey(flow, story);
		const step = flow.steps![flow.steps!.length - 1];
		ipcRenderer.once(`screen-captured-${flowKey}`, (event, arg) => {
			const { error, image } = arg;
			if (error) {
				remote.dialog.showMessageBox(remote.getCurrentWindow(), {
					type: 'error',
					title: 'Capture screenshot',
					message: `Cannot find the page with uuid[${step.uuid}], have you close that?`
				});
			} else {
				remote.dialog.showMessageBox(remote.getCurrentWindow(), {
					type: 'info',
					title: 'Capture screenshot',
					message: 'Screenshot captured'
				});
				step.image = image;
				emitter.emit(EventTypes.ASK_SAVE_FLOW, story, flow);
			}
		});
		ipcRenderer.send('capture-screen', { flowKey, uuid: step.uuid });
	};
	const stopRecording = (): void => {
		flow.steps!.push(JSON.parse(JSON.stringify({ type: 'end' })));
		emitter.emit(EventTypes.ASK_SAVE_FLOW, story, flow);
	};
	const onStopClicked = (): void => {
		stopRecording();
		close();
	};
	const onPickElementClicked = (): void => {
		const step = flow.steps![flow.steps!.length - 1];
		ipcRenderer.once('dom-on-page-picked', (evt: IpcRendererEvent, arg: any) => {
			const { path, error } = arg;
			const step = flow.steps![flow.steps!.length - 1];
			if (error) {
				remote.dialog.showMessageBox(remote.getCurrentWindow(), {
					type: 'error',
					title: 'Pick Element',
					message: `Cannot find the page with uuid[${step.uuid}], have you close that?`
				});
			} else {
				const capturedPath = JSON.stringify(path);
				clipboard.writeText(capturedPath, 'clipboard');
				remote.dialog.showMessageBox(remote.getCurrentWindow(), {
					type: 'error',
					title: 'Pick Element',
					message: `Element path[${capturedPath}] picked, copied to clipboard.`
				});
			}
		});
		ipcRenderer.send('start-pick-dom', { flowKey: asFlowKey(flow, story), uuid: step.uuid });
	};

	return (
		<Overlay
			isOpen={true}
			onClose={close}
			className={`${Classes.OVERLAY_CONTAINER} small`}
			autoFocus={true}>
			<div className={`${Classes.CARD} ${Classes.ELEVATION_2}`}>
				<h3 className="bp3-heading">Flow recording</h3>
				<div>
					<h4 className="bp3-heading">
						#{flow.steps!.length} {getStepTypeText(flow.steps![flow.steps!.length - 1])}
					</h4>
				</div>
				<div className="overlay-placeholder" />
				<div className={Classes.DIALOG_FOOTER_ACTIONS}>
					<Button onClick={onStopClicked} intent="danger">
						Stop
					</Button>
					<Placeholder />
					<Button onClick={onCaptureScreenshotClicked} intent="primary">
						Capture Screenshot
					</Button>
					<Button onClick={onPickElementClicked} intent="primary">
						Pick Element
					</Button>
				</div>
			</div>
		</Overlay>
	);
};

export default (): JSX.Element => {
	const { emitter } = React.useContext(UIContext);

	const [data, setData] = React.useState(
		null as { story: Story; flow: Flow; isSwitchedFromReplay: boolean } | null
	);
	React.useEffect(() => {
		const openMe = (story: Story, flow: Flow, isSwitchedFromReplay: boolean): void =>
			setData({ story, flow, isSwitchedFromReplay });
		const closeMe = (): void => setData(null);
		emitter
			.on(EventTypes.ASK_FLOW_RECORD, openMe)
			.on(EventTypes.CLOSE_FLOW_RECORD_DIALOG, closeMe);

		return () => {
			emitter
				.off(EventTypes.ASK_FLOW_RECORD, openMe)
				.off(EventTypes.CLOSE_FLOW_RECORD_DIALOG, closeMe);
		};
	});

	if (data != null) {
		return <TheDialog {...data} />;
	} else {
		return <React.Fragment />;
	}
};
