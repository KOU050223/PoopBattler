import { Nunito_500Medium, Nunito_700Bold, Nunito_800ExtraBold } from "@expo-google-fonts/nunito";
import { ZenMaruGothic_500Medium, ZenMaruGothic_700Bold, ZenMaruGothic_900Black } from "@expo-google-fonts/zen-maru-gothic";

// Nunito に日本語の字形がないため、日本語は Zen Maru Gothic、数字は Nunito に分ける。
export const fontFamily = {
  jaMedium: "ZenMaruGothic_500Medium",
  jaBold: "ZenMaruGothic_700Bold",
  jaBlack: "ZenMaruGothic_900Black",
  numMedium: "Nunito_500Medium",
  numBold: "Nunito_700Bold",
  numExtraBold: "Nunito_800ExtraBold",
} as const;

// useFonts に渡す定義。キーは fontFamily の値と一致させる。
export const fontAssets = {
  ZenMaruGothic_500Medium,
  ZenMaruGothic_700Bold,
  ZenMaruGothic_900Black,
  Nunito_500Medium,
  Nunito_700Bold,
  Nunito_800ExtraBold,
};
