// generate-cardano-wallet.js
// Usage: node generate-cardano-wallet.js <keystore-password> [network]
//   network (optional): "mainnet" (default) or "testnet"

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bip39 = require('bip39');
const CardanoWasm = require('@emurgo/cardano-serialization-lib-nodejs');

const harden = (num) => 0x80000000 + num;

function deriveAddress(rootKey, network = 'mainnet') {
  const accountKey = rootKey
    .derive(harden(1852))
    .derive(harden(1815))
    .derive(harden(0));

  const utxoPrvKey = accountKey.derive(0).derive(0);
  const utxoPubKey = utxoPrvKey.to_public();

  const stakePrvKey = accountKey.derive(2).derive(0);
  const stakePubKey = stakePrvKey.to_public();

  const networkId = (network === 'testnet') ? 0 : CardanoWasm.NetworkInfo.mainnet().network_id();


  const enterpriseAddress = CardanoWasm.EnterpriseAddress.new(
  networkId,
  CardanoWasm.Credential.from_keyhash(
    utxoPubKey.to_raw_key().hash()
  )
);

return enterpriseAddress.to_address().to_bech32();
}

(async () => {
  const password = process.argv[2];
  const network = process.argv[3] || 'mainnet';

  if (!password) {
    console.error('Usage: node generate-cardano-wallet.js <keystore-password> [network]');
    process.exit(1);
  }
  if (!['mainnet','testnet'].includes(network)) {
    console.error('Invalid network. Use "mainnet" or "testnet".');
    process.exit(1);
  }

  const mnemonic = bip39.generateMnemonic(256);
  const entropyHex = bip39.mnemonicToEntropy(mnemonic);

  const rootKey = CardanoWasm.Bip32PrivateKey.from_bip39_entropy(
    Buffer.from(entropyHex, 'hex'),
    Buffer.from('')
  );

  const address = deriveAddress(rootKey, network);

  // encrypt root key for keystore (same as before)  
  const rootKeyBytes = Buffer.from(rootKey.as_bytes());
  const salt = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(password, salt, 32, { N:1<<14, r:8, p:1 });
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(rootKeyBytes), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const mac = crypto.createHmac('sha256', key).update(Buffer.concat([authTag, ciphertext])).digest('hex');

  const keystore = {
    version: 1,
    id: crypto.randomUUID(),
    crypto: {
      cipher: 'aes-256-gcm',
      cipherparams: { iv: iv.toString('hex') },
      ciphertext: ciphertext.toString('hex'),
      kdf: 'scrypt',
      kdfparams: {
        salt: salt.toString('hex'),
        n: 1<<14,
        r: 8,
        p: 1,
        dklen: 32
      },
      mac: mac,
      authTag: authTag.toString('hex')
    },
    meta: {
      network,
      scheme: 'cardano-cip1852',
      derivationPath: "m/1852'/1815'/0'",
      createdAt: new Date().toISOString()
    }
  };

  const outDir = path.resolve(process.cwd(), 'wallet-output');
  fs.mkdirSync(outDir, { recursive: true });
  const keystorePath = path.join(outDir, `cardano-keystore-${network}.json`);
  fs.writeFileSync(keystorePath, JSON.stringify(keystore, null, 2), 'utf8');

  console.log('=== Cardano Wallet Generated (Offline) ===');
  console.log('');
  console.log('Mnemonic (seed phrase):');
  console.log(mnemonic);
  console.log('');
  console.log(`First receive address (${network}):`);
  console.log(address);
  console.log('');
  console.log('Keystore file (encrypted root key):');
  console.log(keystorePath);
})();
