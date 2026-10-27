module.exports = function (api) {
  api.cache(true);
  return {
    // Reanimated 4（react-native-worklets plugin）は babel-preset-expo が自動注入する。
    // ただし frame processor 用の worklets-core plugin と 'worklet' ディレクティブを
    // 取り合うと「cannot be shared」でランタイム形式が食い違うことがあった。
    // トイレ検出（worklets-core）との衝突が再発する可能性があり、実機確認待ち。
    // 再発したら reanimated 側を `{ worklets: false, reanimated: false }` で切り戻す。
    presets: ["babel-preset-expo"],
    plugins: ["react-native-worklets-core/plugin"],
  };
};
