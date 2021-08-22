export default function done(): Promise<void>;

export interface HookParam {
    type: 'major' | 'minor' | 'patch' | 'premajor' | 'preminor' | 'prepatch' | 'prerelease';
    version: string;
}
