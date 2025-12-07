"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { loadWallets, validateCryptoAddress } from "@/lib/api-functions";
import { Plus, Wallet as WalletIcon, Trash2, Copy, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Wallet } from "@/lib/api-functions";

const CRYPTO_OPTIONS = [
  { value: "BTC", label: "Bitcoin (BTC)" },
  { value: "ETH", label: "Ethereum (ETH)" },
  { value: "USDT", label: "Tether (USDT)" },
  { value: "BNB", label: "Binance Coin (BNB)" },
  { value: "SOL", label: "Solana (SOL)" },
];

const NETWORK_OPTIONS: Record<string, string[]> = {
  BTC: ["Mainnet", "Testnet"],
  ETH: ["Mainnet", "Goerli", "Sepolia"],
  USDT: ["Ethereum", "Tron", "BSC"],
  BNB: ["BSC Mainnet", "BSC Testnet"],
  SOL: ["Mainnet Beta", "Devnet"],
};

export default function WalletsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const [newWallet, setNewWallet] = useState({
    crypto_type: "",
    network: "",
    public_address: "",
    wallet_name: "",
  });

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId]);

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    setUserId(user.id);
  };

  const loadData = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      // dawson-edit: Replace with actual Supabase query
      const walletsData = await loadWallets(userId);
      setWallets(walletsData);
    } catch (error) {
      console.error("Error loading wallets:", error);
      toast({
        title: "Error",
        description: "Failed to load wallets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddWallet = async () => {
    if (!userId) return;

    if (!newWallet.crypto_type || !newWallet.network || !newWallet.public_address) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!validateCryptoAddress(newWallet.public_address, newWallet.crypto_type)) {
      toast({
        title: "Invalid address",
        description: "Please enter a valid crypto address",
        variant: "destructive",
      });
      return;
    }

    try {
      // dawson-edit: Replace with actual Supabase insert
      // const { data, error } = await supabase
      //   .from('wallets')
      //   .insert([
      //     {
      //       user_id: userId,
      //       crypto_type: newWallet.crypto_type,
      //       network: newWallet.network,
      //       public_address: newWallet.public_address,
      //       wallet_name: newWallet.wallet_name || null,
      //     },
      //   ])
      //   .select();

      // if (error) throw error;

      // Placeholder: simulate adding wallet
      const mockWallet: Wallet = {
        id: `wallet-${Date.now()}`,
        user_id: userId,
        crypto_type: newWallet.crypto_type,
        network: newWallet.network,
        public_address: newWallet.public_address,
        wallet_name: newWallet.wallet_name || undefined,
        created_at: new Date().toISOString(),
      };

      setWallets([...wallets, mockWallet]);
      setIsDialogOpen(false);
      setNewWallet({
        crypto_type: "",
        network: "",
        public_address: "",
        wallet_name: "",
      });

      toast({
        title: "Wallet added",
        description: "Your wallet has been added successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add wallet",
        variant: "destructive",
      });
    }
  };

  const handleDeleteWallet = async (walletId: string) => {
    try {
      // dawson-edit: Replace with actual Supabase delete
      // const { error } = await supabase
      //   .from('wallets')
      //   .delete()
      //   .eq('id', walletId);

      // if (error) throw error;

      setWallets(wallets.filter((w) => w.id !== walletId));

      toast({
        title: "Wallet removed",
        description: "Your wallet has been removed successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove wallet",
        variant: "destructive",
      });
    }
  };

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
    toast({
      title: "Copied",
      description: "Address copied to clipboard",
    });
  };

  const truncateAddress = (address: string) => {
    if (address.length <= 16) return address;
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  return (
    <div className="flex h-screen bg-gray-50">

      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Wallets</h2>
              <p className="text-gray-600 mt-1">
                Manage your crypto wallets
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gray-900 hover:bg-gray-800 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Wallet
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Wallet</DialogTitle>
                  <DialogDescription>
                    Enter your wallet details to add it to your portfolio
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="crypto">Cryptocurrency</Label>
                    <Select
                      value={newWallet.crypto_type}
                      onValueChange={(value) =>
                        setNewWallet({ ...newWallet, crypto_type: value, network: "" })
                      }
                    >
                      <SelectTrigger id="crypto">
                        <SelectValue placeholder="Select crypto" />
                      </SelectTrigger>
                      <SelectContent>
                        {CRYPTO_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="network">Network</Label>
                    <Select
                      value={newWallet.network}
                      onValueChange={(value) =>
                        setNewWallet({ ...newWallet, network: value })
                      }
                      disabled={!newWallet.crypto_type}
                    >
                      <SelectTrigger id="network">
                        <SelectValue placeholder="Select network" />
                      </SelectTrigger>
                      <SelectContent>
                        {newWallet.crypto_type &&
                          NETWORK_OPTIONS[newWallet.crypto_type]?.map(
                            (network) => (
                              <SelectItem key={network} value={network}>
                                {network}
                              </SelectItem>
                            )
                          )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Public Address</Label>
                    <Input
                      id="address"
                      value={newWallet.public_address}
                      onChange={(e) =>
                        setNewWallet({
                          ...newWallet,
                          public_address: e.target.value,
                        })
                      }
                      placeholder="Enter wallet address"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">Wallet Name (Optional)</Label>
                    <Input
                      id="name"
                      value={newWallet.wallet_name}
                      onChange={(e) =>
                        setNewWallet({
                          ...newWallet,
                          wallet_name: e.target.value,
                        })
                      }
                      placeholder="e.g., Main BTC Wallet"
                    />
                  </div>

                  <Button
                    onClick={handleAddWallet}
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white"
                  >
                    Add Wallet
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading wallets...</p>
            </div>
          ) : wallets.length === 0 ? (
            <Card className="p-12 text-center shadow-sm rounded-2xl">
              <WalletIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No wallets yet
              </h3>
              <p className="text-gray-600 mb-6">
                Add your first wallet to get started
              </p>
              <Button
                onClick={() => setIsDialogOpen(true)}
                className="bg-gray-900 hover:bg-gray-800 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Wallet
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {              
              wallets.map((wallet) => (
                <Card
                  key={wallet.id}
                  className="p-6 shadow-sm rounded-2xl hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                        <WalletIcon className="w-6 h-6 text-gray-700" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {wallet.wallet_name || `${wallet.crypto_type} Wallet`}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {wallet.crypto_type}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteWallet(wallet.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Network</p>
                      <p className="text-sm font-medium text-gray-900">
                        {wallet.network}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 mb-1">Address</p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded flex-1">
                          {truncateAddress(wallet.public_address)}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopyAddress(wallet.public_address)}
                          className="h-8 w-8"
                        >
                          {copiedAddress === wallet.public_address ? (
                            <CheckCircle className="w-3 h-3 text-green-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 mb-1">Added</p>
                      <p className="text-sm text-gray-900">
                        {new Date(wallet.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
