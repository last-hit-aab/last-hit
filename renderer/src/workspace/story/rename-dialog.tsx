import { Button, Classes, FormGroup, InputGroup, Overlay } from '@blueprintjs/core';
import { remote } from 'electron';
import { Story } from 'last-hit-types';
import React from 'react';
import UIContext from '../../common/context';
import { EventTypes } from '../../events';
import { renameStory } from '../../files';
import { isFlowsAllOnIdle } from '../flow/utils';

const TheDialog = (props: { story: Story }): JSX.Element => {
	const { story } = props;

	const { emitter } = React.useContext(UIContext);
	const close = () => {
		emitter.emit(EventTypes.CLOSE_STORY_RENAME_DIALOG);
	};

	let storyNameInput: HTMLInputElement | null;
	const onConfirmClicked = async () => {
		const name = storyNameInput!.value.trim();
		if (name.length === 0) {
			remote.dialog
				.showMessageBox(remote.getCurrentWindow(), {
					type: 'error',
					title: 'Invalid Input',
					message: 'Please, specify new story name.'
				})
				.finally(() => storyNameInput!.focus());
			return;
		}

		const canRename = await isFlowsAllOnIdle(
			emitter,
			(story.flows || []).map(flow => ({ story, flow }))
		);
		if (!canRename) {
			remote.dialog.showMessageBox(remote.getCurrentWindow(), {
				type: 'error',
				title: 'Flows on operating.',
				message: `Cannot rename story "${story.name}" when some of flows under current story are on operating, need to cancel operating manually first.`
			});
		} else {
			try {
				renameStory(story, name);
				emitter.emit(EventTypes.STORY_RENAMED, story);
				close();
			} catch (e) {
				console.error(e);
				remote.dialog.showMessageBox(remote.getCurrentWindow(), {
					type: 'error',
					title: 'Invalid Input',
					message: `Failed to rename story "${story.name}" to "${name}".`,
					detail: typeof e === 'string' ? e : e.message
				});
			}
		}
	};
	const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
		if (e.key === 'Enter') {
			onConfirmClicked();
		}
	};

	return (
		<Overlay
			isOpen={true}
			onClose={close}
			className={`${Classes.OVERLAY_CONTAINER} small`}
			autoFocus={true}>
			<div className={`${Classes.CARD} ${Classes.ELEVATION_2}`}>
				<h3 className="bp3-heading">Story rename</h3>
				<FormGroup label={`Please, specify new story name instead of "${story.name}".`}>
					<InputGroup
						fill={true}
						onKeyPress={handleKeyPress}
						inputRef={ref => (storyNameInput = ref)}
					/>
				</FormGroup>
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

	const [story, setStory] = React.useState(null as Story | null);
	React.useEffect(() => {
		const openMe = (story: Story): void => setStory(story);
		const closeMe = (): void => setStory(null);
		emitter
			.on(EventTypes.ASK_RENAME_STORY, (story: Story) => openMe(story))
			.on(EventTypes.CLOSE_STORY_RENAME_DIALOG, closeMe);

		return () => {
			emitter
				.off(EventTypes.ASK_RENAME_STORY, openMe)
				.off(EventTypes.CLOSE_STORY_RENAME_DIALOG, closeMe);
		};
	});

	if (story != null) {
		return <TheDialog story={story} />;
	} else {
		return <React.Fragment />;
	}
};
