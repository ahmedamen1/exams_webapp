import "./globals.css";

export const metadata = {
  title: "منصة امتحانات أ/ أحمد سرور",
  description: "منصة امتحانات رياضيات إلكترونية بنظام عربي كامل"
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
