import ExtensionRegistry, { GenericEventHandler } from './lib/extension-registry';
import { ExtensionPoint } from './lib/types/extension-point';

export * from './lib/types';
export default new ExtensionRegistry();
export { ExtensionRegistry, ExtensionPoint, GenericEventHandler };
