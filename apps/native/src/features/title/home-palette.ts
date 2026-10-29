// 画面案の泡と吹き出しの色。tokens にない値だけをここに置く（design は変更しない）。
export const homePalette = {
  largeBubbleFill: "#ff7aac55",
  largeBubbleBorder: "#ffb3d0",
  smallBubbleFill: "#ffffff4d",
  smallBubbleBorder: "#ffffffd9",
  // 光の台座。泡（#ffffff4d / #ff7aac55）より薄くして、うんちする泡を目立たせる。
  haloFill: "#ff7aac26",
  haloEdge: "#d9578b4d",
  calendarTabFill: "#ffe8d0",
  calendarTabIcon: "#f08a3c",
} as const;
