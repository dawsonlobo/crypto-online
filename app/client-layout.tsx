"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Menu } from "lucide-react";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

      <main className="flex-1 p-4 md:p-8 overflow-auto">
        {/* MOBILE MENU BUTTON */}
        <button
          onClick={() => setIsOpen(true)}
          className="md:hidden p-2 mb-4 rounded-lg bg-gray-200 hover:bg-gray-300"
        >
          <Menu className="w-6 h-6 text-gray-700" />
        </button>
      {children}

      </main>
    </div>
  );
}
