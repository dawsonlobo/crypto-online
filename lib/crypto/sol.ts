import {
  Connection,
  clusterApiUrl,
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { log } from "console";

export async function getBalance(publicAddress: string) {
  try {
    // Connect to Solana Devnet
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

    // Replace this with your wallet address
    const publicKey = new PublicKey(publicAddress);

    // Fetch balance in lamports
    const balanceLamports = await connection.getBalance(publicKey);

    // Convert to SOL
    const balanceSOL = balanceLamports / LAMPORTS_PER_SOL;

    return balanceSOL;

  } catch (error) {
    console.error("Error fetching balance:", error);
  }
}

export async function generateTransactionOnline(
  senderAddress: string,
  receiverAddress: string,
  amount: number
) {
  try {
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

    // Step 1: Fetch recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();

    if (!blockhash) {
      throw new Error("Failed to fetch blockhash");
    }

    return {
      senderAddress,
      receiverAddress,
      amount,
      expiry: 1000,
      blockhash,
    };
  } catch (error) {
    return {
      message: `Error generateTransactionOnline:${error}`,
    };
    // console.error("Error generateTransactionOnline:", error);
  }
}

export async function uploadTransaction(signedTx: string) {
  try {
    const rpcUrl = process.argv[2] || "https://api.devnet.solana.com";
    const connection = new Connection(rpcUrl, "confirmed");

    // const txBuffer = Buffer.from(signedTx, "base64");
    const binaryString = atob(signedTx);
    const txBuffer = Uint8Array.from(binaryString, (c) => c.charCodeAt(0));

    // sendRawTransaction
    const signature = await connection.sendRawTransaction(txBuffer);
    console.log("Transaction submitted. Signature:", signature);

    // Optionally wait for confirmation
    const conf = await connection.confirmTransaction(signature, "confirmed");
    const txInfo = await connection.getTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    console.log("Confirmation result:", conf);
    console.log("txInfo result:", txInfo);

    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
}

export async function convertSolToFiat(coinAmount: number, reverseFiatToCrypto?:boolean) {
  try {
    // use api to convert to usd

    const res = await fetch(
      "https://data-api.binance.vision/api/v3/ticker/price"
    );

    const data = await res.json();

    const sol = data.find((a: { symbol: string; })=> a.symbol === "SOLUSDT");
    console.log(sol)
    
    if ( isNaN( Number(sol?.price))  || sol?.price<=0) {
      // error
      console.error("Unable to get crypto price")
      return 0;
    }

    // convert that usd to inr
    
    const usdToInr = await (await fetch("https://api.frankfurter.dev/v1/latest?base=USD&symbols=INR")).json()

    if (typeof usdToInr?.rates?.INR !== "number" ||  usdToInr?.rates?.INR <=0) {
      // error
      console.error("Unable to get the currency exchange rate")
      return 0

    }

    const convertedValue = reverseFiatToCrypto?Math.round((coinAmount/usdToInr?.rates?.INR/Number(sol?.price)*100))/100:Math.round(coinAmount*sol?.price*usdToInr?.rates?.INR*100)/100;


    return convertedValue;

  } catch (err) {
    console.log("Error ", err);

    return 0;
  }
}
