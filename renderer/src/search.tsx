// Requires--esModuleInterop compiler flag!
// import * as Fuse with '--allowSyntheticDefaultImport'
// or import Fuse = require('fuse.js') with neither
import Fuse from 'fuse.js';
import { WorkspaceStructure } from './workspace-settings';

type StepFuse = {
	storyName: string;
	storyDescription: string;
	flowName: string;
	flowDescription: string;
	target?: string;
	xpath?: string;
	csspath?: string;
	url?: string;
	human?: string;
};

export class SearchEngine {
	private fuse: Fuse<StepFuse, any>;

	constructor(workspace: WorkspaceStructure) {
		const stepFuseList: StepFuse[] = [];
		workspace.stories.forEach(story => {
			if (story.flows) {
				story.flows.forEach(flow => {
					if (flow.steps) {
						flow.steps.forEach(step => {
							let stepFuse: StepFuse = {
								storyName: story.name,
								storyDescription: story.description,
								flowName: flow.name,
								flowDescription: flow.description,
								target: (step as any).target,
								xpath: step.path,
								csspath: step.csspath,
								url: (step as any).url,
								human: step.human
							};

							stepFuseList.push(stepFuse);
						});
					}
				});
			}
		});

		const options: Fuse.FuseOptions<StepFuse> = {
			shouldSort: true,
			includeMatches: true,
			minMatchCharLength: 2,
			tokenize: true,
			keys: [
				{ name: 'storyName', weight: 1 },
				{ name: 'storyDescription', weight: 0.1 },
				{ name: 'flowName', weight: 1 },
				{ name: 'flowDescription', weight: 0.2 },
				{ name: 'xpath', weight: 0.5 },
				{ name: 'csspath', weight: 0.4 },
				{ name: 'target', weight: 0.3 },
				{ name: 'url', weight: 0.6 },
				{ name: 'human', weight: 0.8 }
			]
		};
		this.fuse = new Fuse(stepFuseList, options);
	}
	search(key: string): Fuse.FuseResult<StepFuse>[] {
		// return this.fuse.search(key);
		const searchList = this.fuse.search(key) as Fuse.FuseResult<StepFuse>[];
		const results = this.filterEmptyMatch(searchList);
		return results;
	}
	private filterEmptyMatch(results: Fuse.FuseResult<StepFuse>[]) {
		return results.filter((result: Fuse.FuseResult<StepFuse>) => {
			return result.matches.length > 0;
		});
	}
}
