"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { getPortfolioAllocation, getPortfolioHistory } from "@/lib/api-functions";
import { TrendingUp, Wallet as WalletIcon, ArrowUpRight } from "lucide-react";

const COLORS = ["#1f2937", "#4b5563", "#6b7280", "#9ca3af"];

type TimeRange = "hour" | "day" | "month" | "range";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("day");
  const [allocationData, setAllocationData] = useState<any[]>([]);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  // const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (userId) {
      loadDashboardData();
    }
  }, [userId, timeRange]);

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

  const loadDashboardData = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const [allocation, history] = await Promise.all([
        getPortfolioAllocation(userId),
        getPortfolioHistory(userId, timeRange),
      ]);

      setAllocationData(
        allocation.map((item) => ({
          name: item.crypto_type,
          value: item.value,
          percentage: item.percentage,
        }))
      );

      setHistoryData(
        history.map((point) => ({
          time: new Date(point.timestamp).toLocaleString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            month: "short",
            day: "numeric",
          }),
          value: point.value,
        }))
      );

      const total = allocation.reduce((sum, item) => sum + item.value, 0);
      setTotalValue(total);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
<div className="flex flex-col md:flex-row h-screen bg-gray-50">

    <div className="max-w-7xl mx-auto w-full">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
            <p className="text-gray-600 mt-1">
              Overview of your crypto portfolio
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="p-6 shadow-sm rounded-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Balance</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    ₹{totalValue.toLocaleString()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <WalletIcon className="w-6 h-6 text-gray-700" />
                </div>
              </div>
            </Card>

            <Card className="p-6 shadow-sm rounded-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">24h Change</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    +2.5%
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6 shadow-sm rounded-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Assets</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {allocationData.length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <ArrowUpRight className="w-6 h-6 text-gray-700" />
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card className="p-6 shadow-sm rounded-2xl">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">
                Portfolio Allocation
              </h3>
              {loading ? (
                <div className="h-80 flex items-center justify-center">
                  <p className="text-gray-500">Loading...</p>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={allocationData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) =>
                          `${name} ${percentage}%`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {allocationData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: any) => `₹${value.toLocaleString()}`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 space-y-2">
                    {allocationData.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-sm text-gray-700">
                            {item.name}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          ₹{item.value.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>

            <Card className="p-6 shadow-sm rounded-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Portfolio Value
                </h3>
                <Select
                  value={timeRange}
                  onValueChange={(value: TimeRange) => setTimeRange(value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hour">Hour</SelectItem>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                    <SelectItem value="range">Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {loading ? (
                <div className="h-80 flex items-center justify-center">
                  <p className="text-gray-500">Loading...</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={historyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="time"
                      tick={{ fontSize: 12 }}
                      stroke="#6b7280"
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      stroke="#6b7280"
                      tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(value: any) => [
                        `₹${value.toLocaleString()}`,
                        "Value",
                      ]}
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#1f2937"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          <Card className="p-6 shadow-sm rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">
                Quick Actions
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                className="w-full py-6"
                onClick={() => router.push("/wallets")}
              >
                Add Wallet
              </Button>
              <Button
                variant="outline"
                className="w-full py-6"
                onClick={() => router.push("/sign-offline")}
              >
                Sign Transaction
              </Button>
              <Button
                variant="outline"
                className="w-full py-6"
                onClick={() => router.push("/transactions")}
              >
                View Transactions
              </Button>
            </div>
          </Card>
        </div>
      {/* </main> */}
    </div>
  );
}
