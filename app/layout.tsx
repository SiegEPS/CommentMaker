import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CommentMaker",
  description: "AI-assisted Canvas LMS feedback drafting",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <header className="border-b bg-white px-6 py-3">
          <h1 className="text-lg font-semibold">CommentMaker</h1>
        </header>
        <main className="max-w-3xl mx-auto p-6">{children}</main>
      </body>
    </html>
  );
}
