import "./globals.css";

export const metadata = {
  title: "757 Fantasy Football — Stock Tracker",
  description: "Live stock leaderboard for the 757 Fantasy Football league",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
