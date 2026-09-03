"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { getMealPhoto } from "@/features/meal/meal-photo-storage";

type MealLogImageProps = {
  photoId: string;
};

export function MealLogImage({ photoId }: MealLogImageProps) {
  const [imageUrl, setImageUrl] = useState<string>();
  const [isMissing, setIsMissing] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl: string | undefined;

    void getMealPhoto(photoId)
      .then((photo) => {
        if (!active) return;
        if (!photo) {
          setIsMissing(true);
          return;
        }
        objectUrl = URL.createObjectURL(photo);
        setImageUrl(objectUrl);
      })
      .catch(() => {
        if (active) setIsMissing(true);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photoId]);

  if (isMissing) {
    return <p className="flex aspect-video items-center justify-center rounded-xl bg-blush-wash p-3 text-center text-sm font-medium text-pencil-gray">この端末では画像を表示できません。</p>;
  }
  if (!imageUrl) {
    return <div aria-label="食事写真を読み込み中" className="aspect-video animate-pulse rounded-xl bg-blush-wash" />;
  }

  return <Image src={imageUrl} alt="保存した食事の写真" width={720} height={405} unoptimized className="aspect-video w-full rounded-xl object-cover" />;
}
