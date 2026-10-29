import Ionicons from "@expo/vector-icons/Ionicons";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { Sheet } from "@/design/kids";
import { colors, fontFamily, fontSize, radius, spacing } from "@/design";
import { mealGateway } from "@/gateways";
import { removePhotoQuietly, savePickedPhoto } from "../meal-actions";
import type { MealLog } from "../meal-gateway";
import { pickMealPhoto } from "../meal-photo-picker";
import { deleteMealLog, replaceMealPhoto, type MealEditDeps, type MealEditResult } from "../meal-record-edit";

const ROW_MIN_HEIGHT = 56;

const deps: MealEditDeps = {
  pickPhoto: () => pickMealPhoto("library"),
  savePhoto: savePickedPhoto,
  removePhoto: removePhotoQuietly,
  replaceLogPhoto: (logId, photoId) => mealGateway().replaceMealLogPhoto(logId, photoId),
  deleteLog: (logId) => mealGateway().deleteMealLog(logId),
};

type MealEditSheetProps = {
  // undefined のときは閉じる。
  log: MealLog | undefined;
  onClose: () => void;
  // 成功なら一覧を読み直し、通知キーがあれば画面に出す。
  onFinished: (result: MealEditResult) => void;
};

export function MealEditSheet({ log, onClose, onFinished }: MealEditSheetProps) {
  const { t } = useTranslation();
  // state だと再描画までの間に連打が通るので ref で止める。
  const isBusyRef = useRef(false);

  const run = async (task: () => Promise<MealEditResult>) => {
    if (isBusyRef.current) return;
    isBusyRef.current = true;
    onClose();
    try {
      onFinished(await task());
    } finally {
      isBusyRef.current = false;
    }
  };

  const change = () => { if (log) void run(() => replaceMealPhoto(log.id, deps)); };

  const remove = () => {
    if (!log || isBusyRef.current) return;
    const logId = log.id;
    Alert.alert(t("Gohan.deleteTitle"), t("Gohan.deleteMessage"), [
      { text: t("Gohan.cancel"), style: "cancel" },
      { text: t("Gohan.delete"), style: "destructive", onPress: () => void run(() => deleteMealLog(logId, deps)) },
    ]);
  };

  return (
    <Sheet visible={Boolean(log)} onClose={onClose}>
      <View style={styles.body}>
        <Pressable onPress={change} accessibilityRole="button" style={styles.row}>
          <Ionicons name="images-outline" size={24} color={colors.ink} />
          <Text style={styles.label}>{t("Gohan.changePhoto")}</Text>
        </Pressable>
        {/* ピンクは「押せる・選ばれている」専用なので、削除も中立の色にして確認ダイアログで止める。 */}
        <Pressable onPress={remove} accessibilityRole="button" style={styles.row}>
          <Ionicons name="trash-outline" size={24} color={colors.ink} />
          <Text style={styles.label}>{t("Gohan.delete")}</Text>
        </Pressable>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.md },
  row: { minHeight: ROW_MIN_HEIGHT, flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, borderRadius: radius.pill, backgroundColor: colors.canvas },
  label: { fontFamily: fontFamily.jaBlack, fontSize: fontSize.childBase, color: colors.ink },
});
