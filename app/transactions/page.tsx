"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { loadTransactions, exportTransactionsToCSV } from "@/lib/api-functions";
import { Download, ExternalLink } from "lucide-react";
import type { Transaction } from "@/lib/api-functions";

export default function TransactionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

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
      const txData = await loadTransactions(userId);
      setTransactions(txData);
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    exportTransactionsToCSV(transactions);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const truncateAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "text-green-600 bg-green-50";
      case "pending":
        return "text-yellow-600 bg-yellow-50";
      case "failed":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">

      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Transactions</h2>
              <p className="text-gray-600 mt-1">
                View and export your transaction history
              </p>
            </div>
            <Button
              onClick={handleExport}
              className="bg-gray-900 hover:bg-gray-800 text-white"
              disabled={transactions.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <Card className="shadow-sm rounded-2xl overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <p className="text-gray-500">Loading transactions...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-500">No transactions found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">From Address</TableHead>
                      <TableHead className="font-semibold">To Address</TableHead>
                      <TableHead className="font-semibold">Token</TableHead>
                      <TableHead className="font-semibold text-right">
                        Quantity
                      </TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Hash</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id} className="hover:bg-gray-50">
                        <TableCell className="text-sm text-gray-700">
                          {formatDate(tx.transaction_date)}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {truncateAddress(tx.from_address)}
                          </code>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {truncateAddress(tx.to_address)}
                          </code>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-gray-900">
                            {tx.crypto_token}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {tx.quantity.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                              tx.status
                            )}`}
                          >
                            {tx.status.charAt(0).toUpperCase() +
                              tx.status.slice(1)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {tx.transaction_hash ? (
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {truncateAddress(tx.transaction_hash)}
                              </code>
                              <ExternalLink className="w-3 h-3 text-gray-400 cursor-pointer hover:text-gray-600" />
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">N/A</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>

          {transactions.length > 0 && (
            <div className="mt-4 text-center text-sm text-gray-600">
              Showing {transactions.length} transaction
              {transactions.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
