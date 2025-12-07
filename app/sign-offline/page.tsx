"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, Camera, CheckCircle, X, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Scanner } from "@yudiel/react-qr-scanner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  loadWallets,
  getAvailableBalance,
  calculateTransactionFee,
  convertCryptoToFiat,
  convertFiatToCrypto,
  generateTransactionQRData,
} from "@/lib/api-functions";
import type { Wallet } from "@/lib/api-functions";
import { uploadTransaction } from "@/lib/crypto/sol";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useNetwork } from "@/contexts/NetworkContext";

type Step = null | "qr" | "scanSenderAddress" | "upload" | "scanQR" | "summary";

export default function SignOfflinePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [currentStep, setCurrentStep] = useState<Step>(null);
  const [selectedWallet, setSelectedWallet] = useState<string>("");
  const [sendAmount, setSendAmount] = useState("0.01");
  const [amountUnit, setAmountUnit] = useState<"crypto" | "fiat">("crypto");
  const [sendingAddress, setSendingAddress] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [balance, setBalance] = useState<string>("");
  const [transactionData, setTransactionData] = useState<string>("");
  const [fees, setFees] = useState<string>("Calculating...");
  const [sendCoversion, setSendCoversion] = useState<string>("Calculating...");
  const [error, setError] = useState("");
  const [cryptoBalance, setCryptoBalance] = useState(0);
  const [alertM, setAlert] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: "default" | "destructive";
  }>({
    show: false,
    title: "",
    message: "",
    type: "default",
  });

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (userId) {
      loadWalletData();
    }
  }, [userId]);

  useEffect(() => {
    updateSendConversion();
    // If INR convert to SOL and vice versa
  }, [sendAmount]);

  function showAlert(
    title: string,
    message: string,
    type: "default" | "destructive" = "default"
  ) {
    setAlert({ show: true, title, message, type });

    setTimeout(() => {
      setAlert((prev) => ({ ...prev, show: false }));
    }, 3000);
  }

  async function updateSendConversion() {
    // fetch the dropdown if SOL or INR
    if (amountUnit === "crypto") {
      const amount = await convertCryptoToFiat(
        Number(sendAmount),
        getCurrentWallet()?.crypto_type || "",
        "INR"
      );

      // convert SOL to INR
      setSendCoversion(`₹ ${amount}`);
    } else {
      const amount = await convertCryptoToFiat(
        Number(sendAmount),
        getCurrentWallet()?.crypto_type || "",
        "INR",
        true
      );

      setSendCoversion(`${amount} ${getCurrentWallet()?.crypto_type}`);
    }
  }

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;

    // Allow empty or valid number
    if (value === "") {
      setSendAmount("");
      setError("");
      return;
    }

    const num = Number(value);

    // If more than 10 — block update, show error
    if (num > cryptoBalance) {
      setError(`Max allowed is ${cryptoBalance}`);
      return; // DO NOT update sendAmount
    }

    // valid input
    setError("");
    setSendAmount(value);
  }

  useEffect(() => {
    if (selectedWallet) {
      updateBalance();
      updateFees();
    }
  }, [selectedWallet]);

  useEffect(() => {
    if (currentStep === "qr" && countdown > 0) {
      if (countdown === 60) {
        updateTransactionData();
      }
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCountdown(60);
    }
  }, [currentStep, countdown]);

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

  // dawson-edit: Replace with actual wallet loading from Supabase
  const loadWalletData = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const walletsData = await loadWallets(userId);
      setWallets(walletsData);
      if (walletsData.length > 0) {
        setSelectedWallet(walletsData[0].id);
      }
    } catch (error) {
      console.error("Error loading wallets:", error);
    } finally {
      setLoading(false);
    }
  };
  const { network } = useNetwork();

  // dawson-edit: Replace with actual balance fetching
  const updateBalance = async () => {
    const wallet = wallets.find((w) => w.id === selectedWallet);
    if (!wallet) return;

    try {
      const balanceInfo = await getAvailableBalance(
        wallet.public_address,
        wallet.crypto_type,
        network
      );
      setCryptoBalance(balanceInfo.crypto);
      setBalance(
        `${balanceInfo.crypto} ${
          wallet.crypto_type
        } ≈ ₹${balanceInfo.fiat.toLocaleString()}`
      );
    } catch (error) {
      console.error("Error fetching balance:", error);
      setBalance("Error loading balance");
    }
  };
  const updateTransactionData = async () => {
    const wallet = wallets.find((w) => w.id === selectedWallet);
    if (!wallet) return;

    try {
      const transactionData = await generateTransactionQRData(
        wallet.crypto_type,
        wallet.public_address,
        sendingAddress,
        parseFloat(sendAmount),
        network
      );
      setTransactionData(transactionData);
    } catch (error) {
      console.error("Error fetching balance:", error);
      setBalance("Error loading balance");
    }
  };

  const handleFillSenderAddress = (senderAddress: string) => {
    setCurrentStep(null);
    setSendingAddress(senderAddress);
  };

  const handlePreSignConfirmation = async (qrData: string) => {
    const wallet = wallets.find((w) => w.id === selectedWallet);
    if (!wallet) return;

    try {
      // parse string to json

      const txData = JSON.parse(qrData);
      // check if all value exists

      if (
        !txData?.senderAddress ||
        !txData?.receiverAddress ||
        !txData?.amount ||
        !txData?.expiry ||
        !txData?.blockhash ||
        !txData?.signedTx
      ) {
        alert("Invalid QR code. please scan again");
        return;
      }

      // todo: check if matches transaction

      // if matches then upload transaction

      const result = await uploadTransaction(txData?.signedTx, network);

      if (!result) {
        alert("Error when sending transaction");
        return;
      }

      setCurrentStep("summary");

      // if success then goto summary

      // const transactionData = await generateTransactionQRData(
      //   wallet.crypto_type,
      //   sendingAddress,
      //   wallet.public_address,
      //   parseFloat(sendAmount)
      // );
      // setTransactionData(transactionData);
    } catch (error) {
      console.error("Error fetching balance:", error);
      setBalance("Error loading balance");
    }
  };

  // dawson-edit: Replace with actual fee calculation
  const updateFees = async () => {
    const wallet = wallets.find((w) => w.id === selectedWallet);
    if (!wallet) return;

    try {
      const feeInfo = await calculateTransactionFee(
        wallet.crypto_type,
        wallet.network,
        parseFloat(sendAmount)
      );
      setFees(
        `${feeInfo.feeCrypto} ${
          wallet.crypto_type
        } ≈ $${feeInfo.feeFiat.toFixed(2)}`
      );
    } catch (error) {
      console.error("Error calculating fees:", error);
      setFees("Error calculating fees");
    }
  };

  const handleGenerateQR = () => {
    if (!selectedWallet) {
      showAlert("Missing Wallet", "Please select a wallet.", "destructive");
      return;
    }

    if (!sendAmount || Number(sendAmount) <= 0) {
      showAlert(
        "Invalid Amount",
        "Please enter a valid amount.",
        "destructive"
      );
      return;
    }

    if (!sendingAddress) {
      showAlert(
        "Missing Address",
        "Recipient address is required.",
        "destructive"
      );
      return;
    }
    setCurrentStep("qr");
    setCountdown(60);
  };

  const handleProceedToUpload = () => {
    setCurrentStep("upload");
  };

  const handleScanSenderAddress = () => {
    setCurrentStep("scanSenderAddress");
  };

  const handleUploadSign = () => {
    // setCurrentStep("summary"); -old code
    setCurrentStep("scanQR");
  };

  const handleCloseModal = () => {
    setCurrentStep(null);
    setCountdown(60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getCurrentWallet = () => wallets.find((w) => w.id === selectedWallet);

  const truncateAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <main className="flex-1 p-8 overflow-auto">
        {alertM.show && (
          <div className="fixed top-4 right-4 z-50 w-80 animate-in fade-in slide-in-from-top-2">
            <Alert
              variant={alertM.type}
              className="bg-white text-gray-900 border-gray-200 shadow-lg"
            >
              <AlertTitle>{alertM.title}</AlertTitle>
              <AlertDescription>{alertM.message}</AlertDescription>
            </Alert>
          </div>
        )}
        <Card className="max-w-2xl mx-auto p-8 shadow-sm rounded-2xl">
          <h2 className="text-3xl font-semibold text-gray-900 mb-8">
            Sign Offline
          </h2>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="wallet">Select Wallet</Label>
              <Select value={selectedWallet} onValueChange={setSelectedWallet}>
                <SelectTrigger id="wallet">
                  <SelectValue placeholder="Select a wallet" />
                </SelectTrigger>
                <SelectContent>
                  {wallets.map((wallet) => (
                    <SelectItem key={wallet.id} value={wallet.id}>
                      {wallet.crypto_type} -{" "}
                      {truncateAddress(wallet.public_address)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="balance">Available Balance</Label>
              <Input
                id="balance"
                value={balance}
                readOnly
                className="bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Send Amount</Label>
              <div className="flex gap-2">
                <Input
                  id="amount"
                  type="number"
                  step="0.001"
                  value={sendAmount}
                  onChange={handleAmountChange}
                  className="flex-1"
                />
                <Select
                  value={amountUnit}
                  onValueChange={(value: "crypto" | "fiat") =>
                    setAmountUnit(value)
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="crypto">
                      {getCurrentWallet()?.crypto_type || "Crypto"}
                    </SelectItem>
                    <SelectItem value="fiat">INR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}

            <p className="text-sm text-gray-600">= {sendCoversion}</p>

            <div className="space-y-2">
              <Label htmlFor="address">Sending Address</Label>
              <div className="flex gap-2">
                <Input
                  id="address"
                  value={sendingAddress}
                  onChange={(e) => setSendingAddress(e.target.value)}
                  placeholder="Enter recipient address"
                  className="flex-1"
                />
                <Button
                  onClick={handleScanSenderAddress}
                  variant="outline"
                  size="icon"
                >
                  <QrCode className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <p className="text-sm text-gray-600">Fees: {fees}</p>

            <Button
              onClick={handleGenerateQR}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white mt-6"
              size="lg"
            >
              Generate QR
            </Button>
          </div>
        </Card>
      </main>

      <AnimatePresence>
        {currentStep === "qr" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={handleCloseModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full relative"
            >
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4"
                onClick={handleCloseModal}
              >
                <X className="w-4 h-4" />
              </Button>

              <h3 className="text-2xl font-semibold text-center mb-6">
                Step 2
              </h3>

              <div className="flex flex-col items-center gap-6">
                <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                  <QRCodeSVG value={transactionData} size={200} level="H" />
                </div>

                <div className="text-center">
                  <p className="text-gray-700 mb-2">
                    Please scan the QR and sign the transaction offline.
                  </p>
                  <p className="text-sm text-gray-600">
                    Expires in {formatTime(countdown)}
                  </p>
                </div>

                <div className="flex gap-3 w-full">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setCountdown(60)}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                  <Button
                    className="flex-1 bg-gray-900 hover:bg-gray-800 text-white"
                    onClick={handleProceedToUpload}
                  >
                    Proceed
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {currentStep === "upload" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={handleCloseModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full relative"
            >
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4"
                onClick={handleCloseModal}
              >
                <X className="w-4 h-4" />
              </Button>

              <h3 className="text-2xl font-semibold text-center mb-6">
                Step 3
              </h3>

              <div className="flex flex-col items-center gap-6">
                <div className="bg-gray-50 rounded-2xl p-12 border-2 border-dashed border-gray-300">
                  <Camera className="w-20 h-20 text-gray-400" />
                </div>

                <Button
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white"
                  size="lg"
                  onClick={handleUploadSign}
                >
                  Upload Sign
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {currentStep === "scanSenderAddress" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={handleCloseModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full relative"
            >
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4"
                onClick={handleCloseModal}
              >
                <X className="w-4 h-4" />
              </Button>

              <h3 className="text-2xl font-semibold text-center mb-6">
                Scan Sender QR Code
              </h3>

              <div className="flex flex-col items-center gap-6">
                <div className="rounded-xl overflow-hidden border-2 border-dashed border-gray-300">
                  <Scanner
                    onScan={(result) => {
                      if (result?.[0]?.rawValue) {
                        // todo: call function to check all input values and then proceed next

                        // Optionally delay before summary for animation smoothness

                        handleFillSenderAddress(result[0].rawValue);

                        // setTimeout(() => setCurrentStep("summary"), 500);
                      }
                    }}
                    onError={(error) => console.error(error)}
                    constraints={{ facingMode: "environment" }}
                    classNames={{
                      container: "w-[300px] h-[300px]",
                      video: "object-cover rounded-lg",
                    }}
                  />
                </div>

                <p className="text-gray-500 text-sm text-center">
                  Align the QR code inside the frame
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}

        {currentStep === "scanQR" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={handleCloseModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full relative"
            >
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4"
                onClick={handleCloseModal}
              >
                <X className="w-4 h-4" />
              </Button>

              <h3 className="text-2xl font-semibold text-center mb-6">
                Scan QR Code
              </h3>

              <div className="flex flex-col items-center gap-6">
                <div className="rounded-xl overflow-hidden border-2 border-dashed border-gray-300">
                  <Scanner
                    onScan={(result) => {
                      if (result?.[0]?.rawValue) {
                        // todo: call function to check all input values and then proceed next

                        // Optionally delay before summary for animation smoothness

                        handlePreSignConfirmation(result[0].rawValue);

                        // setTimeout(() => setCurrentStep("summary"), 500);
                      }
                    }}
                    onError={(error) => console.error(error)}
                    constraints={{ facingMode: "environment" }}
                    classNames={{
                      container: "w-[300px] h-[300px]",
                      video: "object-cover rounded-lg",
                    }}
                  />
                </div>

                <p className="text-gray-500 text-sm text-center">
                  Align the QR code inside the frame
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}

        {currentStep === "summary" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={handleCloseModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full relative"
            >
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4"
                onClick={handleCloseModal}
              >
                <X className="w-4 h-4" />
              </Button>

              <h3 className="text-2xl font-semibold text-center mb-6">
                Summary
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b">
                  <span className="text-gray-600">Status:</span>
                  <div className="flex items-center gap-2 text-green-600 font-medium">
                    <CheckCircle className="w-5 h-5" />
                    Successful
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-b">
                  <span className="text-gray-600">Sender:</span>
                  <span className="font-mono text-sm">sf3m…212y</span>
                </div>

                <div className="flex items-center justify-between py-3 border-b">
                  <span className="text-gray-600">Receiver:</span>
                  <span className="font-mono text-sm">sf3m…212y</span>
                </div>

                <div className="flex items-center justify-between py-3 border-b">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium">0.001 BTC ($10)</span>
                </div>

                <div className="flex items-center justify-between py-3 border-b">
                  <span className="text-gray-600">Balance:</span>
                  <span className="font-medium">0.1 BTC ($100)</span>
                </div>

                <div className="flex items-center justify-between py-3">
                  <span className="text-gray-600">Hash:</span>
                  <span className="font-mono text-sm">555g1n5g1n7n1g</span>
                </div>
              </div>

              <Button
                className="w-full mt-6 bg-gray-900 hover:bg-gray-800 text-white"
                size="lg"
                onClick={handleCloseModal}
              >
                Close
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
