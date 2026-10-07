import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MEAL_FOOD_GROUPS, type MealFoodGroup } from "@poopbattler/domain/records/meal.types";

import { colors, fontSize, fonts, radius, spacing } from "@/theme";

import { Button, Chip } from "../../records-ui";
import { mealGateway } from "../../gateways";
import { savePickedPhoto, pickErrorKey, removePhotoQuietly } from "../meal-actions";
import { pickMealPhoto } from "../meal-photo-picker";

export function MealLogForm({ visible, onClose, onSaved }: { visible: boolean; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [photoUri, setPhotoUri] = useState<string>();
  const [foodGroups, setFoodGroups] = useState<MealFoodGroup[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const reset = () => { setPhotoUri(undefined); setFoodGroups([]); setNote(""); setError(undefined); };
  const close = () => { if (!saving) { reset(); onClose(); } };

  const pick = async (source: "camera" | "library") => {
    const result = await pickMealPhoto(source);
    if (result.status === "picked") { setPhotoUri(result.uri); setError(undefined); }
    if (result.status === "denied") setError(t(source === "camera" ? "Records.permissionCamera" : "Records.permissionLibrary"));
  };

  const toggle = (value: MealFoodGroup) =>
    setFoodGroups((current) => (current.includes(value) ? current.filter((v) => v !== value) : [...current, value]));

  const submit = async () => {
    if (!photoUri) return setError(t("Records.photoRequired"));
    if (foodGroups.length === 0) return setError(t("Records.foodRequired"));

    setSaving(true);
    setError(undefined);
    let photoId: string | undefined;
    try {
      photoId = await savePickedPhoto(photoUri);
      const trimmed = note.trim();
      const result = await mealGateway().saveMealLog({
        photoId,
        eatenAt: new Date().toISOString(),
        foodGroups,
        ...(trimmed ? { note: trimmed } : {}),
      });
      if (!result.success) throw new Error(result.message);
      reset();
      onSaved();
    } catch (e) {
      // DB に載らなかった写真は端末に残さない。
      if (photoId) await removePhotoQuietly(photoId);
      setError(t(pickErrorKey(e, "Records.saveFailed")));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">{t("Records.formTitle")}</Text>
          <Pressable onPress={close} hitSlop={12} accessibilityRole="button" accessibilityLabel={t("Records.close")}>
            <Ionicons name="close" size={26} color={colors.pencilGray} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.xxl }]} keyboardShouldPersistTaps="handled">
          <View style={styles.photoFrame}>
            {photoUri ? <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" /> : <Ionicons name="restaurant-outline" size={40} color={colors.fadedGray} />}
          </View>
          <View style={styles.row}>
            <View style={styles.flex}><Button variant="secondary" label={t("Records.takePhoto")} onPress={() => void pick("camera")} icon={<Ionicons name="camera-outline" size={20} color={colors.charcoal} />} /></View>
            <View style={styles.flex}><Button variant="secondary" label={t("Records.pickPhoto")} onPress={() => void pick("library")} icon={<Ionicons name="images-outline" size={20} color={colors.charcoal} />} /></View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t("Records.foodGroups")}</Text>
            <Text style={styles.hint}>{t("Records.foodGroupsHint")}</Text>
            {MEAL_FOOD_GROUPS.map((group) => (
              <View key={group.category} style={styles.group}>
                <Text style={styles.groupTitle}>{group.category}</Text>
                <View style={styles.chips}>
                  {group.items.map((item) => (
                    <Chip key={item.value} label={item.label} selected={foodGroups.includes(item.value)} onPress={() => toggle(item.value)} />
                  ))}
                </View>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t("Records.note")}</Text>
            <TextInput value={note} onChangeText={setNote} maxLength={500} multiline placeholder={t("Records.notePlaceholder")} placeholderTextColor={colors.fadedGray} style={styles.input} />
          </View>

          {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
          <Button label={t(saving ? "Records.saving" : "Records.save")} onPress={() => void submit()} disabled={saving} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.lg },
  title: { fontFamily: fonts.black, fontSize: fontSize.title, color: colors.charcoal },
  body: { padding: spacing.lg, paddingTop: 0, gap: spacing.lg },
  photoFrame: { aspectRatio: 4 / 3, borderRadius: radius.lg, backgroundColor: colors.paperWhite, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  photo: { width: "100%", height: "100%" },
  row: { flexDirection: "row", gap: spacing.sm },
  section: { gap: spacing.sm },
  label: { fontFamily: fonts.bold, fontSize: fontSize.body, color: colors.charcoal },
  hint: { fontFamily: fonts.regular, fontSize: 13, color: colors.pencilGray },
  group: { gap: spacing.xs },
  groupTitle: { fontFamily: fonts.bold, fontSize: 13, color: colors.pencilGray },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  input: { minHeight: 80, backgroundColor: colors.paperWhite, borderRadius: radius.md, padding: spacing.md, fontFamily: fonts.regular, fontSize: fontSize.body, color: colors.charcoal, textAlignVertical: "top" },
  error: { fontFamily: fonts.bold, fontSize: 13, color: colors.dangerEdge },
});
