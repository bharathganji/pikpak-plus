export const branches = ['main'];
export const defaultBranch = 'main';
export const plugins = [
  '@semantic-release/commit-analyzer',
  '@semantic-release/release-notes-generator',
  '@semantic-release/changelog',
  '@semantic-release/npm',
  '@semantic-release/github',
  '@semantic-release/git',
  '@semantic-release/exec',
];
export const preset = 'angular';
export const ci = false;
