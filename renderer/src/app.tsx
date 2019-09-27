import React from 'react';
import { Redirect, Route, Router, Switch } from 'react-router-dom';
import history from './common/history';
import paths from './paths';
import { isWorkspaceOpened, closeCurrentWorkspace } from './workspace-settings';

const Splash = React.lazy(() => import(/* webpackChunkName: "splash" */ './splash'));
const CreateWorspace = React.lazy(() => import(/* webpackChunkName: "create-workspace" */ './create-workspace'));
const OpenedWorkspace = React.lazy(() => import(/* webpackChunkName: "opened-workspace" */ './opened-workspace'));

const App = () => {
	return (
		<React.Suspense fallback={<div />}>
			<Router history={history}>
				<Switch>
					<Route
						path={paths.OPENED_WORKSPACE}
						render={() => {
							if (isWorkspaceOpened()) {
								return <OpenedWorkspace />;
							} else {
								closeCurrentWorkspace();
								return <Redirect to={paths.SPLASH} />;
							}
						}}
					/>
					<Route path={paths.CREATE_WORKSPACE} render={() => <CreateWorspace />} />
					<Route path={paths.SPLASH} render={() => <Splash />} />
					<Route path={paths.ROOT} render={() => <Redirect to={paths.SPLASH} />} />
				</Switch>
			</Router>
		</React.Suspense>
	);
};

export default App;
