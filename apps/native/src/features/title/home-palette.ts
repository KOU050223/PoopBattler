// 画面案の泡と吹き出しの色。tokens にない値だけをここに置く（design は変更しない）。
export const homePalette = {
  largeBubbleFill: "#ff7aac55",
  largeBubbleBorder: "#ffb3d0",
  smallBubbleFill: "#ffffff4d",
  smallBubbleBorder: "#ffffffd9",
  // 台座は画面案どおり真っ白で不透明。縁取り・影は付けない。
  haloFill: "#ffffff",
  calendarTabFill: "#ffe8d0",
  calendarTabIcon: "#f08a3c",
} as const;
