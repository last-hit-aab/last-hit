// Requires--esModuleInterop compiler flag!
// import * as Fuse with '--allowSyntheticDefaultImport'
// or import Fuse = require('fuse.js') with neither
import Fuse from 'fuse.js';
import { WorkspaceStructure } from './workspace-settings'


type StepFuse = {
    story_name: string;
    flow_name: string;
    story_description: string;
    flow_description: string;
    target: String
    xpath: string;
    csspath: string;

};



export class SearchEngine {

    fuse: Fuse<StepFuse, any>;

    constructor(workspace: WorkspaceStructure) {
        const stepFuseList: StepFuse[] = []
        workspace.stories.forEach(story => {
            if (story.flows) {
                story.flows.forEach(flow => {
                    if (flow.steps) {
                        flow.steps.forEach(step => {
                            let stepFuse = {
                                story_name: story.name,
                                // story_description: story.description,
                                flow_name: flow.name,
                                // flow_description: flow.description,
                                // target: step.target,

                                xpath: step.path,
                                csspath: step.csspath

                            } as StepFuse

                            stepFuseList.push(stepFuse)
                        })
                    }
                })
            }
        });

        const options: Fuse.FuseOptions<StepFuse> = {
            shouldSort: true,
            // includeMatches: true,
            minMatchCharLength: 2,
            // tokenize: true,
            keys: [{ name: 'flow_name', weight: 1 },
            { name: 'story_name', weight: 1 },
            { name: 'xpath', weight: 0.5 },
            { name: 'csspath', weight: 0.4 }
            ],
        };
        this.fuse = new Fuse(stepFuseList, options)
    }

    search(key: string) {
        return this.fuse.search(key)
    }
}













