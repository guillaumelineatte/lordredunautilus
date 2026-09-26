import "server-only";
import path from "node:path";
import { Font, StyleSheet } from "@react-pdf/renderer";

const fontDir = path.join(process.cwd(), "assets", "fonts");
export const LOGO_PATH = path.join(process.cwd(), "public", "logo.png");

let registered = false;
export function registerFonts() {
  if (registered) return;
  Font.register({
    family: "Josefin",
    fonts: [
      { src: path.join(fontDir, "josefin-sans-latin-300-normal.woff"), fontWeight: 300 },
      { src: path.join(fontDir, "josefin-sans-latin-400-normal.woff"), fontWeight: 400 },
      { src: path.join(fontDir, "josefin-sans-latin-600-normal.woff"), fontWeight: 600 },
    ],
  });
  Font.register({
    family: "SourceSans",
    fonts: [
      { src: path.join(fontDir, "source-sans-3-latin-400-normal.woff"), fontWeight: 400 },
      { src: path.join(fontDir, "source-sans-3-latin-600-normal.woff"), fontWeight: 600 },
      {
        src: path.join(fontDir, "source-sans-3-latin-400-italic.woff"),
        fontWeight: 400,
        fontStyle: "italic",
      },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
}

export const C = {
  abyss: "#0C1826",
  navy: "#132438",
  surface: "#1B3149",
  ivory: "#F3EFE7",
  rose: "#DDA5A7",
  brass: "#C8A96E",
  ink: "#1A2633",
  muted: "#5B6B7C",
  line: "#C9C2B6",
};

export const base = StyleSheet.create({
  page: {
    fontFamily: "SourceSans",
    fontSize: 10.5,
    color: C.ink,
    paddingTop: 40,
    paddingBottom: 48,
    paddingHorizontal: 48,
    lineHeight: 1.45,
  },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 22, gap: 12 },
  logo: { width: 46, height: 46, borderRadius: 23 },
  kicker: {
    fontFamily: "Josefin",
    fontSize: 8,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.muted,
  },
  title: { fontFamily: "Josefin", fontWeight: 300, fontSize: 20, color: C.navy, marginTop: 2 },
  h2: {
    fontFamily: "Josefin",
    fontWeight: 600,
    fontSize: 11.5,
    color: C.navy,
    marginTop: 14,
    marginBottom: 6,
  },
  p: { marginBottom: 6 },
  small: { fontSize: 8.5, color: C.muted },
  footer: {
    position: "absolute",
    bottom: 22,
    left: 48,
    right: 48,
    fontSize: 7.5,
    color: C.muted,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  box: { width: 11, height: 11, borderWidth: 1, borderColor: C.ink, marginRight: 8, marginTop: 1 },
  line: { borderBottomWidth: 0.75, borderBottomColor: C.line, height: 18, flexGrow: 1 },
});
