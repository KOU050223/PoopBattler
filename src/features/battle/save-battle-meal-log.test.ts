import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  saveMealLogAction: vi.fn(),
  saveMealPhoto: vi.fn(),
  deleteMealPhoto: vi.fn(),
}));

vi.mock("@/features/meal/actions", () => ({
  saveMealLogAction: mocks.saveMealLogAction,
}));

vi.mock("@/features/meal/meal-photo-storage", async () => {
  const actual = await vi.importActual<typeof import("@/features/meal/meal-photo-storage")>(
    "@/features/meal/meal-photo-storage",
  );
  return {
    ...actual,
    saveMealPhoto: mocks.saveMealPhoto,
    deleteMealPhoto: mocks.deleteMealPhoto,
  };
});

import { MealPhotoStorageError } from "@/features/meal/meal-photo-storage";

import { saveBattleMealLog } from "./save-battle-meal-log";

const photoId = "00000000-0000-4000-8000-000000000002";
const mealLogId = "00000000-0000-4000-8000-000000000009";
const photo = new File(["meal"], "meal.jpg", { type: "image/jpeg" });

describe("saveBattleMealLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.deleteMealPhoto.mockResolvedValue(undefined);
  });

  it("IndexedDBへ保存したあと本人の meal_logs を作り、IDを返す", async () => {
    mocks.saveMealPhoto.mockResolvedValue(photoId);
    mocks.saveMealLogAction.mockResolvedValue({ success: true, mealLogId });

    await expect(saveBattleMealLog(photo)).resolves.toEqual({ success: true, mealLogId });
    expect(mocks.saveMealPhoto).toHaveBeenCalledWith(photo);
    expect(mocks.saveMealLogAction).toHaveBeenCalledWith({
      photoId,
      eatenAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
      tag: "other",
    });
    expect(mocks.deleteMealPhoto).not.toHaveBeenCalled();
  });

  it("meal_logs 作成に失敗したら端末内の画像を消し、IDを返さない", async () => {
    mocks.saveMealPhoto.mockResolvedValue(photoId);
    mocks.saveMealLogAction.mockResolvedValue({
      success: false,
      message: "食事ログの保存に失敗しました。もう一度お試しください。",
    });

    await expect(saveBattleMealLog(photo)).resolves.toEqual({
      success: false,
      message: "食事ログの保存に失敗しました。もう一度お試しください。",
    });
    expect(mocks.deleteMealPhoto).toHaveBeenCalledWith(photoId);
  });

  it("IndexedDB保存の失敗を利用者向けメッセージへ変換する", async () => {
    mocks.saveMealPhoto.mockRejectedValue(new MealPhotoStorageError("画像は5MB以下にしてください。"));

    await expect(saveBattleMealLog(photo)).resolves.toEqual({
      success: false,
      message: "画像は5MB以下にしてください。",
    });
    expect(mocks.saveMealLogAction).not.toHaveBeenCalled();
    expect(mocks.deleteMealPhoto).not.toHaveBeenCalled();
  });
});
