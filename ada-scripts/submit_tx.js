// submit_tx.js
import fs from 'fs';
import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
dotenv.config();

async function submit() {
  const projectId = process.env.BLOCKFROST_PROJECT_ID;
  if (!projectId) {
    throw new Error("Please set BLOCKFROST_PROJECT_ID in .env");
  }

  const signed = JSON.parse(fs.readFileSync('signed_tx.json', 'utf8')).signed_tx_cbor;
  const txBytes = Buffer.from(signed, 'hex');

  const url = 'https://cardano-preview.blockfrost.io/api/v0/tx/submit';  // or preprod/testnet endpoint
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/cbor',
      'project_id': projectId
    },
    body: txBytes
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Transaction submit failed: ${resp.status} ${resp.statusText} — ${txt}`);
  }
  const txHash = await resp.text();
  console.log('Submitted. Tx-hash:', txHash);
}

submit().catch(err => {
  console.error('Error submitting tx:', err);
  process.exit(1);
});
