import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/features/records-ui";
import { colors, fonts, spacing } from "@/theme";

/** dev 専用メニュー。本番ビルドからもルート自体は辿れるが、導線は __DEV__ でのみ出す。 */
export default function DevMenuScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>開発メニュー</Text>
      <Button label="便器検出プローブ" onPress={() => router.push("/dev/toilet-detect")} />
      <Button label="3D プローブ" variant="secondary" onPress={() => router.push("/dev/poopm-3d")} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paperWhite, padding: spacing.xl, gap: spacing.md },
  title: { fontFamily: fonts.black, fontSize: 20, color: colors.charcoal, marginBottom: spacing.sm },
});
