import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { BubbleButton, HomeButton, SceneBackground, Sheet, SideTab } from "@/design/kids";
import { ListRow, ParentCard, ParentScreen, SectionTitle } from "@/design/parent";
import { fontFamily } from "@/design/fonts";
import { colors, fontSize, spacing } from "@/design/tokens";

const noop = () => {};

/** T-P3-03・04 の部品を実機で見比べるための確認用画面。 */
export default function DesignGalleryScreen() {
  const [isSheetVisible, setIsSheetVisible] = useState(false);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>子ども用（SceneBackground の上）</Text>
      <View style={styles.kidsStage}>
        <SceneBackground>
          <View style={styles.kidsContent}>
            <SideTab label="あつめた" value="12" />
            <SideTab label="なまえ" />
            <HomeButton onPress={noop} />
            <BubbleButton label="うんちする" variant="large" onPress={noop} />
            <BubbleButton label="しらべる" onPress={noop} />
            <BubbleButton label="シートをひらく" onPress={() => setIsSheetVisible(true)} />
          </View>
        </SceneBackground>
      </View>

      <Text style={styles.heading}>親用</Text>
      <SectionTitle>ListRow / ParentCard</SectionTitle>
      <ParentCard>
        <ListRow label="レポート" onPress={noop} badge="新着" />
        <ListRow label="アカウント" onPress={noop} />
      </ParentCard>

      <SectionTitle>ParentScreen（枠内にプレビュー）</SectionTitle>
      <View style={styles.parentStage}>
        <ParentScreen title="タイトル" onBack={noop}>
          <ParentCard>
            <ListRow label="項目" onPress={noop} />
          </ParentCard>
        </ParentScreen>
      </View>

      <Sheet visible={isSheetVisible} onClose={() => setIsSheetVisible(false)}>
        <Text style={styles.sheetText}>Sheet の中身</Text>
        <BubbleButton label="とじる" onPress={() => setIsSheetVisible(false)} />
      </Sheet>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.lg, gap: spacing.lg },
  heading: { fontFamily: fontFamily.jaBold, fontSize: fontSize.title, color: colors.ink },
  kidsStage: { height: 560, borderRadius: 16, overflow: "hidden" },
  kidsContent: { flex: 1, gap: spacing.lg, alignItems: "flex-start", justifyContent: "center", paddingLeft: spacing.lg },
  parentStage: { height: 360, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: colors.line },
  sheetText: { fontFamily: fontFamily.jaMedium, fontSize: fontSize.childBase, color: colors.ink, marginBottom: spacing.lg },
});
