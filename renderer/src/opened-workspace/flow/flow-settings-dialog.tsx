import { Button, Dialog, DialogActions, DialogContent, DialogTitle, makeStyles, TextField } from '@material-ui/core';
import React, { Fragment } from 'react';
import { getTheme } from '../../global-settings';
import { Flow, Story, getCurrentWorkspaceStructure, saveFlow, loopCheck } from '../../workspace-settings';
import { remote } from 'electron';

const myTheme = getTheme();
const useStyles = makeStyles(theme => ({
	root: {
		'&:hover::-webkit-scrollbar-thumb': {
			opacity: 1
		},
		'&::-webkit-scrollbar': {
			backgroundColor: 'transparent',
			width: 8
		},
		'&::-webkit-scrollbar-thumb': {
			backgroundColor: myTheme.textScrollBarThumbBackgroundColor
		}
	},
	radios: {}
}));

export default (props: { open: boolean; story: Story; flow: Flow; close: () => void }): JSX.Element => {
	const { open, story, flow, close } = props;
	const classes = useStyles({});

	const forceDependencyRef = React.createRef<HTMLInputElement>();
	const softDependencyRef = React.createRef<HTMLInputElement>();

	if (!open) {
		return <Fragment />;
	}

	const asDependsString = (depends?: { story: string; flow: string }): string => {
		if (!depends) {
			return '';
		} else {
			const { story = '', flow = '' } = depends;
			return `${flow}@${story}`;
		}
	};
	const forceDepends = asDependsString((flow.settings || {}).forceDepends);
	// const softDepends = asDependsString((flow.settings || {}).softDepends);

	const checkDependency = (
		value: string,
		type: string,
		ref: React.RefObject<HTMLInputElement>
	): { storyName?: string; flowName?: string; passed: boolean } => {
		if (value.trim().length === 0) {
			return { passed: true };
		}
		if (value === `${flow.name}@${story.name}`) {
			remote.dialog.showMessageBox(remote.getCurrentWindow(), {
				type: 'error',
				title: 'Invalid Input',
				message: `Cannot depend on myself.`
			});
			ref.current!.focus();
			return { passed: false };
		}
		const names = value.split('@');
		if (names.length === 1) {
			remote.dialog.showMessageBox(remote.getCurrentWindow(), {
				type: 'error',
				title: 'Invalid Input',
				message: `Please, specify ${type} dependency with flow@story.`
			});
			ref.current!.focus();
			return { passed: false };
		}
		const [flowName, storyName] = names;
		const workspace = getCurrentWorkspaceStructure()!;
		const found = workspace.stories.some(
			story => story.name === storyName && story.flows!.some(flow => flow.name === flowName)
		);
		if (found) {
			// loop check
			if (!loopCheck(workspace, storyName, flowName, story.name, flow.name)) {
				remote.dialog.showMessageBox(remote.getCurrentWindow(), {
					type: 'error',
					title: 'Invalid Input',
					message: `Loop dependency found, check settings please.`
				});
				ref.current!.focus();
				return { passed: false };
			}

			return { storyName, flowName, passed: true };
		} else {
			remote.dialog.showMessageBox(remote.getCurrentWindow(), {
				type: 'error',
				title: 'Invalid Input',
				message: `Given flow@story not found.`
			});
			ref.current!.focus();
			return { passed: false };
		}
	};

	const onConfirmClicked = () => {
		const force = checkDependency(forceDependencyRef.current!.value, 'force', forceDependencyRef);
		if (!force.passed) {
			return;
		}
		const soft = checkDependency(softDependencyRef.current!.value, 'soft', softDependencyRef);
		if (!soft.passed) {
			return;
		}

		flow.settings = {
			forceDepends: (() => {
				if (force.storyName) {
					return { story: force.storyName, flow: force.flowName! };
				}
			})(),
			softDepends: (() => {
				if (soft.storyName) {
					return { story: soft.storyName, flow: soft.flowName! };
				}
			})()
		};

		saveFlow(story, flow);
		close();
	};

	return (
		<Dialog open={open} onClose={() => close()} fullWidth={true} disableBackdropClick={true} maxWidth="lg">
			<DialogTitle>Flow Settings</DialogTitle>
			<DialogContent className={classes.root}>
				<TextField
					autoFocus
					margin="dense"
					label="Force Dependency (fill with flow@story)"
					fullWidth
					inputRef={forceDependencyRef}
					defaultValue={forceDepends}
				/>
				{/* <TextField
					margin="dense"
					label="Soft Dependency (fill with flow@story)"
					fullWidth
					inputRef={softDependencyRef}
					defaultValue={softDepends}
				/> */}
			</DialogContent>
			<DialogActions>
				<Button onClick={() => close()} variant="contained">
					Cancel
				</Button>
				<Button onClick={onConfirmClicked} color="primary" variant="contained">
					OK
				</Button>
			</DialogActions>
		</Dialog>
	);
};
