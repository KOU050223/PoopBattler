import type { ReactNode } from "react";
import { Image, StyleSheet, View } from "react-native";

import { colors } from "../tokens";
import sceneImage from "../../../assets/design/scene-home.png";

// 画像の縦横比は端末ごとに違うので、cover で全面に敷いて端は切る。
export function SceneBackground({ children }: { children?: ReactNode }) {
  return (
    <View style={styles.root}>
      <Image source={sceneImage} style={StyleSheet.absoluteFill} resizeMode="cover" accessible={false} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.skySoft },
});
