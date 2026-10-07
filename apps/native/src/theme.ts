// 配色は apps/web/src/app/globals.css の @theme に合わせる。
export const colors = {
  flushPink: "#ff7aac",
  blushWash: "#ffe0ef",
  sparkBlue: "#0875a5",
  cottonPink: "#ffb3d0",
  nightInk: "#000437",
  paperWhite: "#ffffff",
  charcoal: "#4b4b4b",
  pencilGray: "#6b6b6b",
  fadedGray: "#afafaf",
  flushEdge: "#c94d7f",
  dangerEdge: "#dc6868",
  background: "#ffe0ef",
  foreground: "#4b4b4b",
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { md: 12, lg: 16, xl: 20 } as const;

export const fonts = {
  regular: "Nunito_500Medium",
  bold: "Nunito_700Bold",
  black: "Nunito_800ExtraBold",
} as const;

export const fontSize = { body: 15, title: 22, tab: 11 } as const;
