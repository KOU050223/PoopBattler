module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo は react-native-worklets（reanimated 4 経由の推移的依存）を
    // 検出するとその plugin を自動注入する。frame processor は worklets-core 系で
    // 動かすため、新 worklets plugin が 'worklet' ディレクティブを横取りすると
    // ランタイム形式が食い違い「cannot be shared」で落ちる。reanimated の
    // worklet も使っていないので両方切る。
    presets: [["babel-preset-expo", { worklets: false, reanimated: false }]],
    plugins: ["react-native-worklets-core/plugin"],
  };
};
