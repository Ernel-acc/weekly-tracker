export const metadata = {
  title: 'BT AI Ops — Weekly Tracker',
  description: 'Weekly follow-up tracker for BT AI Ops programme',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  )
}