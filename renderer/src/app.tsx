// import { isWorkspaceOpened, closeCurrentWorkspace } from './workspace-settings';
import { FocusStyleManager } from '@blueprintjs/core';
import React from 'react';
import { Redirect, Route, Router, Switch } from 'react-router-dom';
import styled from 'styled-components';
import { deactivateWorkspace, hasActiveWorkspace } from './active';
import UIContext, { context } from './common/context';
import history from './common/history';
import paths from './common/paths';
import { GlobalStyles } from './common/styles';

FocusStyleManager.onlyShowFocusOnTabs();

const Splash = React.lazy(() => import(/* webpackChunkName: "splash" */ './splash'));
const CreateWorkspace = React.lazy(() =>
	import(/* webpackChunkName: "create-workspace" */ './workspace/create')
);
const OpenedWorkspace = React.lazy(() =>
	import(/* webpackChunkName: "opened-workspace" */ './workspace/open')
);

const RootContainer = styled.div`
	padding: 0;
	overflow: hidden;
`;

const App = () => {
	return (
		<UIContext.Provider value={context}>
			<React.Suspense fallback={<div />}>
				<GlobalStyles />
				<RootContainer className="bp3-card rectangle">
					<Router history={history}>
						<Switch>
							<Route
								path={paths.OPENED_WORKSPACE}
								render={() => {
									if (hasActiveWorkspace()) {
										return <OpenedWorkspace />;
									} else {
										// for ensure deactivate
										deactivateWorkspace();
										return <Redirect to={paths.SPLASH} />;
									}
								}}
							/>
							<Route
								path={paths.CREATE_WORKSPACE}
								render={() => <CreateWorkspace />}
							/>
							<Route path={paths.SPLASH} render={() => <Splash />} />
							<Route
								path={paths.ROOT}
								render={() => <Redirect to={paths.SPLASH} />}
							/>
						</Switch>
					</Router>
				</RootContainer>
			</React.Suspense>
		</UIContext.Provider>
	);
};

export default App;
