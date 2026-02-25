import type { ReactNode } from "react";
import type { Metadata } from "next";
import { AdminProvider } from "@/components/admin/admin-contexto";
import HeaderAdmin from "@/components/admin/HeaderAdmin";

export const metadata: Metadata = {
  title: "Admin | FonteDosPlugins",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LayoutAdmin({ children }: { children: ReactNode }) {
  return (
    <AdminProvider>
      <div className="min-h-screen">
        <HeaderAdmin />
        <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
      </div>
    </AdminProvider>
  );
}
