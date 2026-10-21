import { ReactNode } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/layout/header";

export default function FAQLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col items-center p-2 md:p-4 lg:p-8 w-full max-w-6xl mx-auto">
        <Header />
        {children}
      </div>
    </div>
  );
}
