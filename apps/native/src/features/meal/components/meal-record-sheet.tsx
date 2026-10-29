import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import type { MealFoodGroup } from "@poopbattler/domain/records/meal.types";

import { BubbleButton, Sheet } from "@/design/kids";
import { borderWidth, colors, fontFamily, fontSize, radius, spacing, thickness } from "@/design";
import { mealGateway } from "@/gateways";
import { removePhotoQuietly, savePickedPhoto } from "../meal-actions";
import { MEAL_FOOD_TILES } from "../meal-food-tiles";
import { MealPhotoError } from "../meal-photo";
import { pickMealPhoto } from "../meal-photo-picker";

type MealRecordSheetProps = {
  visible: boolean;
  // 撮影・アルバムで選んだ直後の写真。シートを開くときに渡す。
  initialPhotoUri?: string;
  onClose: () => void;
  onSaved: () => void;
};

const SHEET_MAX_HEIGHT_RATIO = 0.85;

function saveErrorKey(error: unknown): string {
  if (error instanceof MealPhotoError) return error.code === "too_large" ? "Gohan.photoTooLarge" : "Gohan.photoSaveFailed";
  return "Gohan.saveFailed";
}

export function MealRecordSheet({ visible, initialPhotoUri, onClose, onSaved }: MealRecordSheetProps) {
  const { t } = useTranslation();
  const { height } = useWindowDimensions();
  const [photoUri, setPhotoUri] = useState<string | undefined>(initialPhotoUri);
  const [foodGroups, setFoodGroups] = useState<MealFoodGroup[]>([]);
  const [errorKey, setErrorKey] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);

  // 開くたびに前回の入力を持ち越さない。
  useEffect(() => {
    if (!visible) return;
    setPhotoUri(initialPhotoUri);
    setFoodGroups([]);
    setErrorKey(undefined);
  }, [visible, initialPhotoUri]);

  const close = () => { if (!isSaving) onClose(); };

  const retake = async () => {
    const result = await pickMealPhoto("camera");
    if (result.status === "picked") { setPhotoUri(result.uri); setErrorKey(undefined); }
    if (result.status === "denied") setErrorKey("Gohan.permissionCamera");
  };

  const toggle = (value: MealFoodGroup) =>
    setFoodGroups((current) => (current.includes(value) ? current.filter((v) => v !== value) : [...current, value]));

  const submit = async () => {
    if (!photoUri) return setErrorKey("Gohan.photoRequired");
    if (foodGroups.length === 0) return setErrorKey("Gohan.foodRequired");

    setIsSaving(true);
    setErrorKey(undefined);
    let photoId: string | undefined;
    try {
      photoId = await savePickedPhoto(photoUri);
      const result = await mealGateway().saveMealLog({ photoId, eatenAt: new Date().toISOString(), foodGroups });
      if (!result.success) throw new Error(result.message);
      onSaved();
    } catch (e) {
      // DB に載らなかった写真は端末に残さない。
      if (photoId) await removePhotoQuietly(photoId);
      setErrorKey(saveErrorKey(e));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={close}>
      {/* Sheet は高さを制限しないので、小さい端末で保存ボタンが画面外に出ないようここで抑える。 */}
      <ScrollView style={{ maxHeight: height * SHEET_MAX_HEIGHT_RATIO }} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">{t("Gohan.formTitle")}</Text>
          <Pressable onPress={close} hitSlop={12} accessibilityRole="button" accessibilityLabel={t("Gohan.close")} style={styles.close}>
            <Ionicons name="close" size={26} color={colors.ink} />
          </Pressable>
        </View>

        <View style={styles.photoFrame}>
          {photoUri ? <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" /> : null}
          <Pressable onPress={() => void retake()} accessibilityRole="button" style={styles.retake}>
            <Ionicons name="refresh" size={16} color={colors.ink} />
            <Text style={styles.retakeLabel}>{t("Gohan.retake")}</Text>
          </Pressable>
        </View>

        <View>
          <Text style={styles.question}>{t("Gohan.question")}</Text>
          <Text style={styles.hint}>{t("Gohan.questionHint")}</Text>
        </View>
        <View style={styles.tiles}>
          {MEAL_FOOD_TILES.map((tile) => {
            const isSelected = foodGroups.includes(tile.value);
            return (
              <Pressable
                key={tile.value}
                onPress={() => toggle(tile.value)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                style={[styles.tile, isSelected && styles.tileSelected]}
              >
                <Ionicons name={tile.icon} size={22} color={isSelected ? colors.pinkEdge : colors.inkSoft} />
                <Text style={[styles.tileLabel, isSelected && styles.tileLabelSelected]} numberOfLines={1} adjustsFontSizeToFit>{t(tile.labelKey)}</Text>
              </Pressable>
            );
          })}
        </View>

        {errorKey ? <Text style={styles.error} accessibilityRole="alert">{t(errorKey)}</Text> : null}
        <BubbleButton variant="large" label={t(isSaving ? "Gohan.saving" : "Gohan.save")} onPress={() => { if (!isSaving) void submit(); }} />
      </ScrollView>
    </Sheet>
  );
}

const TILE_BASIS = "31%";

const styles = StyleSheet.create({
  body: { gap: spacing.lg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontFamily: fontFamily.jaBlack, fontSize: fontSize.childTitle, color: colors.ink },
  close: { width: 44, height: 44, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: colors.canvas },
  // 画像の縦横比に関わらず枠を固定する。
  photoFrame: { aspectRatio: 16 / 9, borderRadius: radius.card, backgroundColor: colors.skySoft, overflow: "hidden", justifyContent: "flex-end", alignItems: "flex-end", padding: spacing.md },
  photo: { ...StyleSheet.absoluteFill },
  retake: { flexDirection: "row", alignItems: "center", gap: spacing.xs, minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.paper },
  retakeLabel: { fontFamily: fontFamily.jaBold, fontSize: fontSize.childMin, color: colors.ink },
  question: { fontFamily: fontFamily.jaBlack, fontSize: fontSize.childBase, color: colors.ink },
  hint: { fontFamily: fontFamily.jaBold, fontSize: fontSize.childMin, color: colors.inkSoft },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tile: { width: TILE_BASIS, flexGrow: 1, minHeight: 64, alignItems: "center", justifyContent: "center", gap: spacing.xs, paddingHorizontal: spacing.xs, borderRadius: radius.pill, borderWidth: borderWidth.bubble, borderColor: colors.canvas, backgroundColor: colors.canvas },
  // 選択中だけ pink 系にする（押せる・選ばれている専用の色）。
  tileSelected: { borderColor: colors.pink, backgroundColor: `${colors.pink}26`, borderBottomWidth: borderWidth.bubble + thickness.bottomEdge - 3, borderBottomColor: colors.pinkEdge },
  tileLabel: { fontFamily: fontFamily.jaBold, fontSize: fontSize.childMin, color: colors.inkSoft },
  tileLabelSelected: { color: colors.ink },
  error: { fontFamily: fontFamily.jaBold, fontSize: fontSize.childMin, color: colors.pinkEdge },
});
