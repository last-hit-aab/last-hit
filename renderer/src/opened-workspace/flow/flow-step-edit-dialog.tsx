import { Button, Dialog, DialogActions, DialogContent, DialogTitle, makeStyles, TextField } from '@material-ui/core';
import React, { Fragment } from 'react';
import { getTheme } from '../../global-settings';
import { Flow, saveFlow, Story, Step, StepType } from '../../workspace-settings';

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
	}
}));

export default (props: {
	open: boolean;
	story: Story;
	flow: Flow;
	clonedStep: Step;
	stepIndex: number;
	close: () => void;
}): JSX.Element => {
	const { open, story, flow, clonedStep, stepIndex, close } = props;
	const classes = useStyles({});

	const [ignored, forceUpdate] = React.useReducer((x: number): number => x + 1, 0);

	if (!open) {
		return <Fragment />;
	}

	const onValueChanged = (name: string) => (event: any): void => {
		const value = event.target.value;
		(clonedStep as any)[name] = value;
		forceUpdate(ignored);
	};
	const onConfirmClicked = () => {
		flow.steps!.splice(stepIndex, 1, clonedStep);

		saveFlow(story, flow);
		close();
	};

	const properties = [
		{ label: 'Human Reading', propName: 'human', writeable: true },
		{ label: 'Step UUID', propName: 'stepUuid', writeable: false },
		{ label: 'Page UUID', propName: 'uuid', writeable: false }
	];
	switch (clonedStep.type) {
		case StepType.CHANGE:
			properties.push({ label: 'Value', propName: 'value', writeable: true });
		// eslint-disable-next-line
		case StepType.CLICK:
		case StepType.MOUSE_DOWN:
		case StepType.KEY_DOWN:
		case StepType.FOCUS:
		case StepType.SCROLL:
			properties.push({ label: 'XPath', propName: 'path', writeable: true });
			properties.push({ label: 'CSS Path', propName: 'csspath', writeable: true });
			properties.push({ label: 'Custom Path', propName: 'custompath', writeable: true });
			properties.push({ label: 'Target', propName: 'target', writeable: true });
			break;
		case StepType.START:
			properties.push({ label: 'Start URL', propName: 'url', writeable: false });
			break;
		case StepType.END:
		case StepType.PAGE_CLOSED:
		case StepType.PAGE_CREATED:
		case StepType.PAGE_ERROR:
		case StepType.PAGE_SWITCHED:
		case StepType.DIALOG_OPEN:
		case StepType.DIALOG_CLOSE:
		case StepType.AJAX:
		case StepType.DOM_CHANGE:
		case StepType.SUBMIT:
		case StepType.RESOURCE_LOAD:
		case StepType.LOAD:
		case StepType.UNLOAD:
		case StepType.VALUE_CHANGE:
		case StepType.ANIMATION:
			break;
	}

	return (
		<Dialog open={open} onClose={() => close()} fullWidth={true} disableBackdropClick={true} maxWidth="md">
			<DialogTitle>{`Edit Step #${clonedStep.stepIndex + 1} [${clonedStep.type.toUpperCase()}]`}</DialogTitle>
			<DialogContent className={classes.root}>
				{properties.map(({ label, propName, writeable }, index: number) => {
					return (
						<TextField
							autoFocus={index === 0}
							margin="dense"
							label={label}
							fullWidth
							value={(clonedStep as any)[propName]}
							onChange={onValueChanged(propName)}
							disabled={!writeable}
						/>
					);
				})}
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
