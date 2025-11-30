"use client";

import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Wallet,
  LayoutDashboard,
  Send,
  FileText,
  LogOut,
  CreditCard,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// import network context
import { useNetwork } from "@/contexts/NetworkContext";

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  // use network context
  const { network, setNetwork } = useNetwork();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
    router.push("/login");
  };

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: CreditCard, label: "Wallets", path: "/wallets" },
    { icon: Send, label: "Sign Offline", path: "/sign-offline" },
    { icon: FileText, label: "Transactions", path: "/transactions" },
  ];

  return (
    <aside className="w-64 bg-gray-100 border-r border-gray-200 p-4 flex flex-col h-screen">
      <div className="flex items-center gap-2 mb-8 px-2">
        <Wallet className="w-6 h-6 text-gray-700" />
        <h1 className="text-xl font-semibold text-gray-800">Crypto Wallet</h1>
      </div>

      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;
          return (
            <Button
              key={item.path}
              variant="ghost"
              className={`w-full justify-start ${
                isActive
                  ? "bg-gray-200 text-gray-900 font-medium hover:bg-gray-300"
                  : "text-gray-700 hover:bg-gray-200"
              }`}
              onClick={() => router.push(item.path)}
            >
              <Icon className="Fw-4 h-4 mr-3" />
              {item.label}
            </Button>
          );
        })}
      </nav>

      {/* --- Network Toggle Start --- */}
      <div className="px-2 mb-4">
        <p className="text-sm font-medium mb-2 text-gray-700">Network</p>
        <div className="flex bg-gray-200 rounded-lg p-1">
          <button
            onClick={() => setNetwork("mainnet")}
            className={`flex-1 px-3 py-1 rounded-md text-sm transition
      ${
        network === "mainnet" ? "bg-white shadow font-medium" : "text-gray-600"
      }`}
          >
            Mainnet
          </button>

          <button
            onClick={() => setNetwork("testnet")}
            className={`flex-1 px-3 py-1 rounded-md text-sm transition
      ${
        network === "testnet" ? "bg-white shadow font-medium" : "text-gray-600"
      }`}
          >
            Testnet
          </button>
        </div>
      </div>
      {/* --- Network Toggle End --- */}

      <Button
        variant="ghost"
        className="w-full justify-start text-gray-700 hover:bg-gray-200 mt-auto"
        onClick={handleLogout}
      >
        <LogOut className="w-4 h-4 mr-3" />
        Logout
      </Button>
    </aside>
  );
}
