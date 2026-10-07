import * as ImagePicker from "expo-image-picker";

export type PickResult =
  | { status: "picked"; uri: string }
  | { status: "canceled" }
  | { status: "denied" };

const options: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  // 圧縮して JPEG 化する（HEIC を避け、5MB 制限にも収まりやすくする）。
  quality: 0.7,
  allowsEditing: false,
  // フォームが pageSheet の Modal のため、ピッカーも sheet で重ねると
  // iOS 26 で選択後に PHPicker が dismiss されず画面に残る。
  // fullscreen で出して sheet-in-sheet を避ける。
  presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
};

export async function pickMealPhoto(source: "camera" | "library"): Promise<PickResult> {
  const permission = source === "camera"
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return { status: "denied" };

  const result = source === "camera"
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);
  const asset = result.canceled ? undefined : result.assets[0];
  return asset ? { status: "picked", uri: asset.uri } : { status: "canceled" };
}
