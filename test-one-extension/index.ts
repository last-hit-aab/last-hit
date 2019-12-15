export const activate = () => {
	console.log('test-one-extension actived.');
};
export const handle = (data: any): void => {
	console.log(data);
};

export const getType = (): string => {
	return 'workspace';
};
