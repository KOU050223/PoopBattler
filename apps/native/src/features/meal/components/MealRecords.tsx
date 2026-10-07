import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, FlatList, Image, StyleSheet, Text, View } from "react-native";
import { getMealFoodGroupLabel } from "@poopbattler/domain/records/meal.types";

import { photoStore } from "@/adapters/expo-photo-fs";
import { colors, fontSize, fonts, spacing } from "@/theme";

import { mealGateway } from "../../gateways";
import { Button, cardStyle, dateFormatter, EmptyState, Chip } from "../../records-ui";
import { useLoader } from "../../use-loader";
import { pickErrorKey, removePhotoQuietly, savePickedPhoto } from "../meal-actions";
import { pickMealPhoto } from "../meal-photo-picker";
import type { MealLog } from "../meal-gateway";
import { MealLogForm } from "./MealLogForm";

function MealPhoto({ photoId }: { photoId: string }) {
  const { t } = useTranslation();
  const [missing, setMissing] = useState(false);
  return (
    <View style={styles.photoFrame}>
      {missing ? (
        <View style={styles.photoMissing}>
          <Ionicons name="image-outline" size={28} color={colors.fadedGray} />
          <Text style={styles.muted}>{t("Records.photoMissing")}</Text>
        </View>
      ) : (
        <Image source={{ uri: photoStore.uriFor(photoId) }} style={styles.photo} resizeMode="cover" onError={() => setMissing(true)} />
      )}
    </View>
  );
}

export function MealRecords({ bottomInset }: { bottomInset: number }) {
  const { t, i18n } = useTranslation();
  const { data, error, loading, reload } = useLoader(() => mealGateway().getMealLogs());
  const [formVisible, setFormVisible] = useState(false);
  const [pendingId, setPendingId] = useState<string>();
  const [message, setMessage] = useState<string>();
  // 差し替えで入れ替わった旧写真の削除に失敗した場合は、残骸を気づけるように通知だけ出す。
  const notice = (key: string) => setMessage(t(key));

  const replacePhoto = async (log: MealLog) => {
    const picked = await pickMealPhoto("library");
    if (picked.status === "denied") return notice("Records.permissionLibrary");
    if (picked.status !== "picked") return;

    setPendingId(log.id);
    setMessage(undefined);
    let newId: string | undefined;
    try {
      newId = await savePickedPhoto(picked.uri);
      const previous = await mealGateway().replaceMealLogPhoto(log.id, newId);
      if (!(await removePhotoQuietly(previous))) notice("Records.replaceCleanupFailed");
      await reload();
    } catch (e) {
      if (newId) await removePhotoQuietly(newId);
      notice(pickErrorKey(e, "Records.replaceFailed"));
    } finally {
      setPendingId(undefined);
    }
  };

  const deleteLog = (log: MealLog) => {
    Alert.alert(t("Records.deleteTitle"), t("Records.deleteMessage"), [
      { text: t("Records.cancel"), style: "cancel" },
      {
        text: t("Records.delete"),
        style: "destructive",
        onPress: async () => {
          setPendingId(log.id);
          setMessage(undefined);
          try {
            const photoId = await mealGateway().deleteMealLog(log.id);
            if (!(await removePhotoQuietly(photoId))) notice("Records.deleteCleanupFailed");
            await reload();
          } catch {
            notice("Records.deleteFailed");
          } finally {
            setPendingId(undefined);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.flex}>
      <FlatList
        data={data ?? []}
        keyExtractor={(log) => log.id}
        refreshing={loading}
        onRefresh={() => void reload()}
        contentContainerStyle={[styles.list, { paddingBottom: bottomInset + spacing.xxl }]}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <Button label={t("Records.addMeal")} onPress={() => setFormVisible(true)} icon={<Ionicons name="add" size={22} color={colors.paperWhite} />} />
            <View style={styles.headingRow}>
              <Text style={styles.heading} accessibilityRole="header">{t("Records.recentMeals")}</Text>
              {data && data.length > 0 ? <Text style={styles.muted}>{t("Records.count", { count: data.length })}</Text> : null}
            </View>
            {message ? <Text style={styles.error} accessibilityRole="alert">{message}</Text> : null}
            {error ? <Text style={styles.error} accessibilityRole="alert">{t("Records.loadFailed")}</Text> : null}
          </View>
        }
        ListEmptyComponent={loading || error ? null : <EmptyState title={t("Records.noMeals")} description={t("Records.noMealsHint")} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <MealPhoto photoId={item.photoId} />
            <View style={styles.cardBody}>
              <Text style={styles.date}>{dateFormatter(i18n.language, item.eatenAt)}</Text>
              <View style={styles.chips}>
                {item.foodGroups.map((group) => <Chip key={group} label={getMealFoodGroupLabel(group)} />)}
              </View>
              {item.note ? <Text style={styles.note}>{item.note}</Text> : null}
              <View style={styles.actions}>
                <View style={styles.flex}><Button variant="secondary" label={t("Records.changePhoto")} disabled={pendingId === item.id} onPress={() => void replacePhoto(item)} /></View>
                <View style={styles.flex}><Button variant="danger" label={t("Records.delete")} disabled={pendingId === item.id} onPress={() => deleteLog(item)} /></View>
              </View>
            </View>
          </View>
        )}
      />
      <MealLogForm visible={formVisible} onClose={() => setFormVisible(false)} onSaved={() => { setFormVisible(false); void reload(); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { gap: spacing.md },
  headerBlock: { gap: spacing.md, marginBottom: spacing.xs },
  headingRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  heading: { fontFamily: fonts.bold, fontSize: 18, color: colors.charcoal },
  card: { ...cardStyle, overflow: "hidden" },
  // 画像の縦横比に関わらず枠を固定する。
  photoFrame: { aspectRatio: 4 / 3, backgroundColor: colors.blushWash },
  photo: { width: "100%", height: "100%" },
  photoMissing: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.xs },
  cardBody: { padding: spacing.md, gap: spacing.sm },
  date: { fontFamily: fonts.bold, fontSize: fontSize.body, color: colors.charcoal },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  note: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.charcoal },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  muted: { fontFamily: fonts.regular, fontSize: 13, color: colors.pencilGray },
  error: { fontFamily: fonts.bold, fontSize: 13, color: colors.dangerEdge },
});
