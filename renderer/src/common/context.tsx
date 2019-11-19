import { EventEmitter } from 'events';
import React from 'react';

export const context = {
	emitter: new EventEmitter()
};

const UIContext = React.createContext(context);
export default UIContext;
