# Last Hit Replayer
![Last Hit logo](icons/128x128.png)

<!-- ![Travis (.org) branch](https://img.shields.io/travis/last-hit-aab/last-hit/master) -->
[![codebeat badge](https://codebeat.co/badges/f3316c83-a06b-4307-b50a-3af48fab9ac3)](https://codebeat.co/projects/github-com-last-hit-aab-last-hit-master)
![GitHub last commit](https://img.shields.io/github/last-commit/last-hit-aab/last-hit)
![GitHub package.json version](https://img.shields.io/github/package-json/v/last-hit-aab/last-hit)
![GitHub issues](https://img.shields.io/github/issues/last-hit-aab/last-hit)
![GitHub closed issues](https://img.shields.io/github/issues-closed/last-hit-aab/last-hit)

[![npm version](https://badge.fury.io/js/last-hit-replayer.svg)](https://badge.fury.io/js/last-hit-replayer)
![npm](https://img.shields.io/npm/dw/last-hit-replayer)
![npm](https://img.shields.io/npm/dm/last-hit-replayer)

![Welcome Anything](https://img.shields.io/badge/welcome-anything-orange)

# Directly in any folder
## Install

```
npm install -g last-hit-replayer
```

or

```
yarn global add last-hit-replayer
```

Yarn is recommanded. For install Yarn, see [yarnpkg.com](https://yarnpkg.com/)

## Run

### Run whole workspace
```
last-hit-replayer --workspace=directory/to/your/workspace
```

### Specify Story
```
last-hit-replayer --workspace=directory/to/your/workspace --story=your-story-name
```

### Specify Flow
```
last-hit-replayer --workspace=directory/to/your/workspace --story=your-story-name --flow=your-flow-name
```


# In your project
## Install

```
npm install last-hit-replayer
```

or

```
yarn add last-hit-replayer
```

Yarn is recommanded. For install Yarn, see [yarnpkg.com](https://yarnpkg.com/)

## Add script

In `package.json`
```json
"script": {
  "start": "last-hit-replayer"
}
```

## Run

### Run whole workspace
```
yarn start -- --workspace=directory/to/your/workspace
```

### Specify Story
```
yarn start -- --workspace=directory/to/your/workspace --story=your-story-name
```

### Specify Flow
```
yarn start -- --workspace=directory/to/your/workspace --story=your-story-name --flow=your-flow-name
```

> Flow name will be ignored when story name does not specify.

### CI report 

- CI will generate a report.html in current folder 
