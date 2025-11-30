// build_tx.js
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import CardanoWasm from "@emurgo/cardano-serialization-lib-nodejs";
import * as dotenv from "dotenv";
dotenv.config();
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fetchUtxos(address) {
  const projectId = process.env.BLOCKFROST_PROJECT_ID;
  if (!projectId) {
    throw new Error("Please set BLOCKFROST_PROJECT_ID in .env");
  }
  const url = `https://cardano-preview.blockfrost.io/api/v0/addresses/${address}/utxos`;
  const resp = await fetch(url, { headers: { project_id: projectId } });
  if (!resp.ok) {
    throw new Error(
      `Blockfrost UTXO fetch failed: ${resp.status} ${resp.statusText}`
    );
  }
  const utxos = await resp.json();
  return utxos;
}

function selectUtxos(utxos, neededLovelace) {
  let total = 0n;
  const picks = [];
  for (const u of utxos) {
    // find the lovelace entry in the amount array
    const lovelaceEntry = u.amount.find((a) => a.unit === "lovelace");
    if (!lovelaceEntry) {
      // skip UTxO if no ADA (lovelace) present
      continue;
    }
    const val = BigInt(lovelaceEntry.quantity);
    picks.push(u);
    total += val;
    if (total >= neededLovelace) break;
  }
  if (total < neededLovelace) {
    throw new Error(
      `Insufficient funds: have ${total}, need ${neededLovelace}`
    );
  }
  return { picks, total };
}

async function buildUnsignedTx() {
  const txData = JSON.parse(
    fs.readFileSync(path.join(__dirname, "tx.json"), "utf8")
  );
  const { network, senderAddress, receiverAddress, adaAmount } = txData;

  const lovelaceToSend = BigInt(adaAmount) * BigInt(1_000_000);

  const utxos = await fetchUtxos(senderAddress);
  if (!utxos || utxos.length === 0) {
    throw new Error("No UTxOs found for address — nothing to spend.");
  }

  const { picks, total: totalInput } = selectUtxos(
    utxos,
    lovelaceToSend + 200000n /* rough fee buffer */
  );

  // Set up tx builder with some basic protocol params. Adjust if needed.
  const linearFee = CardanoWasm.LinearFee.new(
    CardanoWasm.BigNum.from_str("44"),
    CardanoWasm.BigNum.from_str("155381")
  );
  const txBuilderCfg = CardanoWasm.TransactionBuilderConfigBuilder.new()
    .fee_algo(linearFee)
    .pool_deposit(CardanoWasm.BigNum.from_str("500000000"))
    .key_deposit(CardanoWasm.BigNum.from_str("2000000"))
    .coins_per_utxo_byte(CardanoWasm.BigNum.from_str("4310"))
    .max_value_size(5000)
    .max_tx_size(16384)
    .prefer_pure_change(true)
    .build();

  const txBuilder = CardanoWasm.TransactionBuilder.new(txBuilderCfg);

  const sender = CardanoWasm.Address.from_bech32(senderAddress);
  const receiver = CardanoWasm.Address.from_bech32(receiverAddress);

  for (const u of picks) {
    const lovelaceEntry = u.amount.find((a) => a.unit === "lovelace");
    if (!lovelaceEntry) continue; // safety guard

    const inputValue = CardanoWasm.Value.new(
      CardanoWasm.BigNum.from_str(lovelaceEntry.quantity)
    );

    txBuilder.add_regular_input(
      sender, // Address is fine here
      CardanoWasm.TransactionInput.new(
        CardanoWasm.TransactionHash.from_hex(u.tx_hash),
        u.output_index
      ),
      inputValue
    );
  }

  // Add output to receiver
  txBuilder.add_output(
    CardanoWasm.TransactionOutput.new(
      receiver,
      CardanoWasm.Value.new(
        CardanoWasm.BigNum.from_str(lovelaceToSend.toString())
      )
    )
  );

  // Add change back to sender
  txBuilder.add_change_if_needed(sender);

  const unsignedTx = txBuilder.build_tx_unsafe();


const hex = Buffer.from(unsignedTx.to_bytes()).toString("hex");
  fs.writeFileSync(
    path.join(__dirname, "unsigned_tx.json"),
    JSON.stringify({ unsigned_tx_cbor: hex }, null, 2),
    "utf8"
  );
  console.log("Unsigned TX CBOR saved to unsigned_tx.json");

  console.log("Unsigned TX CBOR (hex):", unsignedTx.to_bytes().toString("hex"));
}

buildUnsignedTx().catch((err) => {
  console.error("Error building tx:", err);
  process.exit(1);
});
