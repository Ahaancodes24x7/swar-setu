import { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";

interface LayoutProps {
  children: ReactNode;
  hideFooter?: boolean;
  hideHeader?: boolean;
}

export function Layout({ children, hideFooter = false, hideHeader = false }: LayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      {!hideHeader && <Header />}
      <main className="flex-1">{children}</main>
      {!hideFooter && <Footer />}
    </div>
  );
}
