import "./globals.css";

export const metadata = { title: "Skin Scanner" };

// This was missing entirely before. Without it, mobile browsers render the
// page at a fixed desktop-ish width (~980px) and zoom the whole layout out
// to fit — every element shrinks, including the fixed shutter button on
// /capture, so people end up pinch-zooming and scrolling around just to
// find and tap it. This is the actual root cause behind "снимок неудобно
// нажимать на телефоне, приходится листать" — it hits every page, not just
// capture, it's just most obvious there because it's a full-screen camera UI.
export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
