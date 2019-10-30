// // Requires --esModuleInterop compiler flag!
// // import * as Fuse with '--allowSyntheticDefaultImport'
// // or import Fuse = require('fuse.js') with neither
// import Fuse from 'fuse.js';
// import { loadWorkspace, loadWorkspaceStructure, getCurrentWorkspaceStructure, WorkspaceStructure, Story } from './workspace-settings'

// type StepFuse = {
//     story_name: string;
//     flow_name: string;
//     story_description: string;
//     flow_description: string;
//     target: String

//     xpath: string;
//     csspath: string;

// };






// export const loadAllStep = (work_space: string) => {

//     const workspaceData = getCurrentWorkspaceStructure() as WorkspaceStructure;

//     const stepFuseList: StepFuse[] = []

//     workspaceData.stories.forEach(story => {
//         if (story.flows) {
//             story.flows.forEach(flow => {
//                 if (flow.steps) {
//                     flow.steps.forEach(step => {
//                         let stepFuse = {
//                             story_name: story.name,
//                             story_description: story.description,
//                             flow_name: flow.name,
//                             flow_description: flow.description,
//                             // target: step.target,

//                             xpath: step.path,
//                             csspath: step.csspath

//                         } as StepFuse

//                         stepFuseList.push(stepFuse)
//                     })
//                 }
//             })
//         }
//     });


//     console.log(stepFuseList.length)



//     const options: Fuse.FuseOptions<StepFuse> = {
//         keys: ['story_name', 'flow_name', 'story_description', 'flow_description', 'xpath', 'csspath'],
//     };

//     const fuse = new Fuse(stepFuseList, options)


//     this.index_server = fuse;

//     const results = fuse.search('tion')

//     console.log(results)

// };



// // const books: SimpleBookFuse[] = [{
// //     'title': "Old Man's War",
// //     'author': {
// //         'firstName': 'John',
// //         'lastName': 'Scalzi'
// //     },
// //     'tags': ['fiction']
// // }, {
// //     'title': 'The Lock Artist',
// //     'author': {
// //         'firstName': 'Steve',
// //         'lastName': 'Hamilton'
// //     },
// //     'tags': ['thriller']
// // }]








