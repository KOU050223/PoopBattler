"use client";

/** 食事撮影用のカメラストリームを管理し、不要になったトラックを必ず停止する。 */
export { useUserMediaCamera as useMealCamera } from "@/lib/user-media-camera";
export type { UserMediaCameraStatus as MealCameraStatus } from "@poopbattler/domain/ports";
