import fs from "fs";
import crypto from "crypto";
import CardanoWasm from "@emurgo/cardano-serialization-lib-nodejs";
import readline from "readline/promises";
import { stdin as input, stdout as output } from "node:process";
function decryptKeystore(keystoreJson, password) {
  const { crypto: cryptoMeta } = keystoreJson;
  if (!cryptoMeta || cryptoMeta.cipher !== "aes-256-gcm") {
    throw new Error("Unsupported keystore cipher");
  }

  const salt = Buffer.from(cryptoMeta.kdfparams.salt, "hex");
  const iv = Buffer.from(cryptoMeta.cipherparams.iv, "hex");
  const ciphertext = Buffer.from(cryptoMeta.ciphertext, "hex");
  const authTag = Buffer.from(cryptoMeta.authTag, "hex");

  // Derive key using scrypt (must match encrypt side)
  const key = crypto.scryptSync(password, salt, cryptoMeta.kdfparams.dklen);

  // Decrypt
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted; // Buffer containing raw root private key bytes
}

function derivePaymentPrvKey(rootPrvKey) {
  const HARDEN = (n) => 0x80000000 + n;
  const account = rootPrvKey
    .derive(HARDEN(1852))
    .derive(HARDEN(1815))
    .derive(HARDEN(0));
  const utxoPrvKey = account.derive(0).derive(0);
  return utxoPrvKey;
}

async function main() {
  const keystore = JSON.parse(fs.readFileSync("wallet.json", "utf8"));

  const rl = readline.createInterface({ input, output });
  const password = await rl.question("Enter keystore password: ");
  rl.close();

  const rootPrvBytes = decryptKeystore(keystore, password);
  const rootPrv = CardanoWasm.Bip32PrivateKey.from_bytes(Buffer.from(rootPrvBytes));
  const paymentPrv = derivePaymentPrvKey(rootPrv).to_raw_key(); // raw sk for signing

  const unsignedHex = JSON.parse(
    fs.readFileSync("unsigned_tx.json", "utf8")
  ).unsigned_tx_cbor;

  const bytes = Buffer.from(unsignedHex, "hex");
  console.log("Raw bytes length:", bytes.length);

  // FIXED TRANSACTION
  const fixedTx = CardanoWasm.FixedTransaction.from_bytes(bytes);

  const txHash = fixedTx.transaction_hash();
  console.log("Tx hash generated.");

  // witness
  const vkeyWit = CardanoWasm.make_vkey_witness(txHash, paymentPrv);

  const vkeys = CardanoWasm.Vkeywitnesses.new();
  vkeys.add(vkeyWit);

  const witnessSet = CardanoWasm.TransactionWitnessSet.new();
  witnessSet.set_vkeys(vkeys);

  const signedTx = CardanoWasm.Transaction.new(
    fixedTx.body(),
    witnessSet,
    fixedTx.auxiliary_data()
  );

  const signedHex = Buffer.from(signedTx.to_bytes()).toString("hex");

  fs.writeFileSync(
    "signed_tx.json",
    JSON.stringify({ signed_tx_cbor: signedHex }, null, 2),
    "utf8"
  );
  console.log("Signed TX saved to signed_tx.json");
}

main();
