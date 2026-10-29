// expo/tsconfig.base に画像モジュールの宣言がないため、kids が読む png だけここで宣言する。
declare module "*.png" {
  const source: import("react-native").ImageSourcePropType;
  export default source;
}
