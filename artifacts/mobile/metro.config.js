// Metro in a pnpm workspace.
//
// Without this file Metro treats the repository root as the project root, so a
// relative entry of `index.ts` resolves to <repo>/index.ts — which does not
// exist — and the release build fails at :app:createBundleReleaseJsAndAssets
// with nothing but "finished with non-zero exit value 1".
//
// Pointing the project root at this package and watching the workspace root
// keeps both halves working: the entry resolves here, while modules hoisted to
// the workspace store are still reachable.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

// pnpm keeps real packages in the store and symlinks them, so both locations
// have to be searched.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Hierarchical lookup stays ON. Disabling it is the usual advice for hoisted
// Yarn workspaces, but pnpm nests each package's own dependencies inside its
// directory, so switching it off makes `expo` unable to find `expo-asset`.

module.exports = config;
