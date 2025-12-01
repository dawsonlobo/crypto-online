const zlib = require('zlib');

const obj = {
  senderAddress: "51ARLLahW5ofAewUGtNRQk5v62QJmDJ7ovjGVUnWkvWp",
  receiverAddress: "3Savrbfm3VCv5dDhLvvgonfAaZm28GgWuU1i4dJBBVFT",
  amount: 0.008,
  expiry: 1000,
  blockhash: "Gg1EnZpf2tDR3eV1GjgGazLHWS7kCfEe3Nfj2N8tp4dS"
};

// 1. stringify
const json = JSON.stringify(obj);

// 2. compress + 3. encode
const compressed = zlib.deflateSync(json).toString('base64');
console.log('compact:', compressed);
console.log('length:', compressed.length);

// Later — to recover original:

const buf = Buffer.from(compressed, 'base64');
const decompressed = zlib.inflateSync(buf).toString('utf8');
const recovered = JSON.parse(decompressed);
console.log('recovered:', recovered);
