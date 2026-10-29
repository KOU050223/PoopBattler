import { describe, expect, it, vi } from "vitest";

import { deleteMealLog, replaceMealPhoto, type MealEditDeps } from "./meal-record-edit";
import { MealPhotoError } from "./meal-photo";

function makeDeps(overrides: Partial<MealEditDeps> = {}): MealEditDeps {
  return {
    pickPhoto: vi.fn().mockResolvedValue({ status: "picked", uri: "file://new.jpg" }),
    savePhoto: vi.fn().mockResolvedValue("new-id"),
    removePhoto: vi.fn().mockResolvedValue(true),
    replaceLogPhoto: vi.fn().mockResolvedValue("old-id"),
    deleteLog: vi.fn().mockResolvedValue("old-id"),
    ...overrides,
  };
}

describe("replaceMealPhoto", () => {
  it("成功すると旧写真だけを消す", async () => {
    const deps = makeDeps();
    expect(await replaceMealPhoto("log-1", deps)).toEqual({ status: "done" });
    expect(deps.replaceLogPhoto).toHaveBeenCalledWith("log-1", "new-id");
    expect(deps.removePhoto).toHaveBeenCalledTimes(1);
    expect(deps.removePhoto).toHaveBeenCalledWith("old-id");
  });

  it("旧写真を消せなくても完了にして、通知キーを返す", async () => {
    const deps = makeDeps({ removePhoto: vi.fn().mockResolvedValue(false) });
    expect(await replaceMealPhoto("log-1", deps)).toEqual({ status: "done", noticeKey: "Gohan.replaceCleanupFailed" });
  });

  it("DB の差し替えに失敗すると新写真を消し、旧写真は消さない", async () => {
    const deps = makeDeps({ replaceLogPhoto: vi.fn().mockRejectedValue(new Error("db")) });
    expect(await replaceMealPhoto("log-1", deps)).toEqual({ status: "failed", noticeKey: "Gohan.replaceFailed" });
    expect(deps.removePhoto).toHaveBeenCalledTimes(1);
    expect(deps.removePhoto).toHaveBeenCalledWith("new-id");
  });

  it("写真の保存に失敗すると、消す写真は無く、写真系のキーを返す", async () => {
    const deps = makeDeps({ savePhoto: vi.fn().mockRejectedValue(new MealPhotoError("too_large")) });
    expect(await replaceMealPhoto("log-1", deps)).toEqual({ status: "failed", noticeKey: "Gohan.photoTooLarge" });
    expect(deps.replaceLogPhoto).not.toHaveBeenCalled();
    expect(deps.removePhoto).not.toHaveBeenCalled();
  });

  it("選ばなかったときは何もしない", async () => {
    const deps = makeDeps({ pickPhoto: vi.fn().mockResolvedValue({ status: "canceled" }) });
    expect(await replaceMealPhoto("log-1", deps)).toEqual({ status: "skipped" });
    expect(deps.savePhoto).not.toHaveBeenCalled();
  });

  it("許可がないときは許可の通知キーを返す", async () => {
    const deps = makeDeps({ pickPhoto: vi.fn().mockResolvedValue({ status: "denied" }) });
    expect(await replaceMealPhoto("log-1", deps)).toEqual({ status: "failed", noticeKey: "Gohan.permissionLibrary" });
  });
});

describe("deleteMealLog", () => {
  it("成功すると記録の写真を消す", async () => {
    const deps = makeDeps();
    expect(await deleteMealLog("log-1", deps)).toEqual({ status: "done" });
    expect(deps.deleteLog).toHaveBeenCalledWith("log-1");
    expect(deps.removePhoto).toHaveBeenCalledWith("old-id");
  });

  it("写真を消せなくても完了にして、通知キーを返す", async () => {
    const deps = makeDeps({ removePhoto: vi.fn().mockResolvedValue(false) });
    expect(await deleteMealLog("log-1", deps)).toEqual({ status: "done", noticeKey: "Gohan.deleteCleanupFailed" });
  });

  it("DB の削除に失敗すると写真は消さない", async () => {
    const deps = makeDeps({ deleteLog: vi.fn().mockRejectedValue(new Error("db")) });
    expect(await deleteMealLog("log-1", deps)).toEqual({ status: "failed", noticeKey: "Gohan.deleteFailed" });
    expect(deps.removePhoto).not.toHaveBeenCalled();
  });
});
