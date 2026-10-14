const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// apps/web は React 19.2.8、RN 0.86 は 19.2.3 と完全一致を要求する（レンダラの版チェック）。
// ルートへ巻き上げられた 19.2.8 を hoist 済みパッケージが拾わないよう、react 系は native 側に固定する。
const pinned = ["react", "react-native"].map((name) => ({
  name,
  dir: path.resolve(__dirname, "node_modules", name),
}));

config.resolver.assetExts.push("glb");
config.resolver.assetExts.push("tflite");


config.resolver.resolveRequest = (context, moduleName, platform) => {
  for (const { name, dir } of pinned) {
    if (moduleName === name || moduleName.startsWith(`${name}/`)) {
      return context.resolveRequest(
        { ...context, originModulePath: path.join(dir, "index.js") },
        moduleName,
        platform,
      );
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
