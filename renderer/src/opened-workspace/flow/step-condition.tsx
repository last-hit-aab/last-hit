import {
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	IconButton,
	InputAdornment,
	makeStyles,
	MenuItem,
	TextField
} from '@material-ui/core';
import DOMElementLocateIcon from '@material-ui/icons/LocationSearching';
import { ipcRenderer, IpcRendererEvent, remote } from 'electron';
import React, { Fragment } from 'react';
import { generateKeyByObject } from '../../common/flow-utils';
import { getTheme } from '../../global-settings';
import { Flow, saveFlow, Step, StepAssertOperator, StepCondition, Story } from '../../workspace-settings';

const myTheme = getTheme();
const useStyles = makeStyles(theme => ({
	element: {
		'& .MuiInputAdornment-root button': {
			padding: 0,
			'& svg': {
				fontSize: '1rem'
			}
		},
		'& input:focus + .MuiInputAdornment-root button svg': {
			color: theme.palette.primary.main
		}
	},
	select: {
		width: 300,
		'& .MuiSelect-select:focus': {
			backgroundColor: 'transparent'
		}
	},
	selectPopupMenu: {
		width: 300,
		'&:hover::-webkit-scrollbar-thumb': {
			opacity: 1
		},
		'&::-webkit-scrollbar': {
			backgroundColor: 'transparent',
			width: 8
		},
		'&::-webkit-scrollbar-thumb': {
			backgroundColor: myTheme.outlineScrollBarThumbBackgroundColor
		},
		'& > ul > li': {
			height: theme.spacing(3),
			fontSize: '0.7rem',
			opacity: myTheme.opacityForFontColor
		}
	}
}));

export default (props: { open: boolean; story: Story; flow: Flow; step: Step; close: () => void }): JSX.Element => {
	const { open, story, flow, step, close } = props;
	const classes = useStyles({});

	const elementRef = React.useRef<HTMLDivElement>(null);

	const [values, setValues] = React.useState(() => {
		let values = {
			operator: StepAssertOperator.EQUALS
		} as StepCondition;
		if (step.conditions && step.conditions.length > 0) {
			values = { ...step.conditions[0] } as StepCondition;
		}
		return values;
	});
	React.useEffect(() => {
		return () => {
			// clean the listener, since maybe somebody forget that
			ipcRenderer.removeAllListeners('dom-on-page-picked');
		};
	});

	if (!open) {
		return <Fragment />;
	}

	const handleDOMPicked = (evt: IpcRendererEvent, arg: any) => {
		const { path, error } = arg;
		if (error) {
			remote.dialog.showMessageBox(remote.getCurrentWindow(), {
				type: 'error',
				title: 'Pick DOM',
				message: `Cannot find the page with uuid[${step.uuid}], have you close that?`
			});
		} else {
			elementRef.current!.querySelector('input')!.focus();
			setValues({ ...values, element: path });
		}
	};
	const handleElementChange = (event: any): void => setValues({ ...values, element: event.target.value });
	const handleDOMElementLocateClicked = (): void => {
		ipcRenderer.once('dom-on-page-picked', handleDOMPicked);
		ipcRenderer.send('start-pick-dom', { flowKey: generateKeyByObject(story, flow), uuid: step.uuid });
	};
	const handleAttributeChange = (event: any): void => setValues({ ...values, attribute: event.target.value });
	const handleOperatorChange = (event: any): void => setValues({ ...values, operator: event.target.value });
	const handleValueChange = (event: any): void => setValues({ ...values, value: event.target.value });
	const onComplexExpressionClicked = (): void => {
		remote.dialog.showMessageBox(remote.getCurrentWindow(), {
			type: 'info',
			title: 'Pro',
			message: '"AND/OR Expression" is a coming soon feature in PRO version.'
		});
	};
	const onConfirmClicked = (): void => {
		if (!values.element || values.element.trim().length === 0) {
			remote.dialog.showMessageBox(remote.getCurrentWindow(), {
				type: 'error',
				title: 'Invalid input',
				message: 'Please, specify the element which you want to assert.'
			});
			return;
		}

		step!.conditions = [values];

		close();
		saveFlow(story, flow);
	};

	return (
		<Dialog open={open} onClose={() => close()} fullWidth={true} disableBackdropClick={true}>
			<DialogTitle>Step Conditional Execution</DialogTitle>
			<DialogContent>
				<DialogContentText>Please, specify step condition.</DialogContentText>
				<TextField
					autoFocus
					label="DOM Element"
					margin="dense"
					fullWidth
					required
					value={values.element}
					onChange={handleElementChange}
					className={classes.element}
					ref={elementRef}
					InputLabelProps={{ shrink: true }}
					InputProps={{
						endAdornment: (
							<InputAdornment position="end">
								<IconButton
									aria-label="locate dom element"
									onClick={handleDOMElementLocateClicked}
									title="Locate DOM element"
								>
									<DOMElementLocateIcon />
								</IconButton>
							</InputAdornment>
						)
					}}
				/>
				<TextField
					label="Attribute"
					margin="dense"
					fullWidth
					value={values.attribute}
					onChange={handleAttributeChange}
				/>
				<TextField
					select
					label="Operator"
					margin="dense"
					required
					value={values.operator}
					onChange={handleOperatorChange}
					className={classes.select}
					SelectProps={{ MenuProps: { PaperProps: { className: classes.selectPopupMenu } } }}
				>
					{Object.values(StepAssertOperator).map(value => {
						return (
							<MenuItem value={value} dense>
								{value}
							</MenuItem>
						);
					})}
				</TextField>
				<TextField label="Value" margin="dense" fullWidth value={values.value} onChange={handleValueChange} />
			</DialogContent>
			<DialogActions>
				<Button onClick={() => close()} variant="contained">
					Cancel
				</Button>
				<Button onClick={onComplexExpressionClicked} color="primary" variant="contained">
					AND/OR Expression
				</Button>
				<Button onClick={onConfirmClicked} color="primary" variant="contained">
					OK
				</Button>
			</DialogActions>
		</Dialog>
	);
};
