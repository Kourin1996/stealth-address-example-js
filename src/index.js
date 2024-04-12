import { ethers } from "ethers";
import EC from "elliptic";

const secp256k1 = new EC.ec("secp256k1");

// create stealth account by ethers
async function main() {
  const rootKey = new ethers.SigningKey(ethers.randomBytes(32));
  const ephemeralKey = new ethers.SigningKey(ethers.randomBytes(32));

  // m
  const rootPrivKeyHex = rootKey.privateKey; // hex without 0x
  // M
  const rootPublicKeyHex = rootKey.publicKey;

  console.log(
    `root key: private=${rootPrivKeyHex}, public=${rootPublicKeyHex}`
  );

  // r
  const ephemeralPrivKeyHex = ephemeralKey.privateKey;
  // R
  const ephemeralPublicKeyHex = ephemeralKey.publicKey;

  console.log(
    `ephemeral key: private=${ephemeralPrivKeyHex}, public=${ephemeralPublicKeyHex}`
  );

  const sharedSecret1 = rootKey.computeSharedSecret(ephemeralPublicKeyHex);
  const sharedSecret2 = ephemeralKey.computeSharedSecret(rootPublicKeyHex);

  console.log("sharedSecret1", sharedSecret1);
  console.log("sharedSecret2", sharedSecret2);

  // stealth public key
  // M + G * hash(S)
  const stealthPublicKey = ethers.SigningKey.addPoints(
    rootPublicKeyHex,
    ethers.SigningKey.computePublicKey(ethers.keccak256(sharedSecret1)),
    true
  );
  console.log("stealthPublicKey", stealthPublicKey);

  // stealth private key
  const stealthPrivateKey =
    ethers.toBigInt(rootPrivKeyHex) +
    ethers.toBigInt(ethers.keccak256(sharedSecret1));
  const stealthPrivateKeyHex =
    "0x" + stealthPrivateKey.valueOf().toString(16).slice(0, 64);

  const stealthConvertedPublicKey = ethers.SigningKey.computePublicKey(
    stealthPrivateKeyHex,
    true
  );
  console.log("stealthConvertedPublicKey", stealthConvertedPublicKey);

  const stealthWallet = new ethers.Wallet(stealthPrivateKeyHex);
  const signature = await stealthWallet.signMessage("Hello");

  console.log("signature", signature);

  const recovered = ethers.verifyMessage("Hello", signature);

  console.log(
    "actual signer address",
    ethers.computeAddress(stealthPrivateKeyHex)
  );
  console.log("recovered", recovered);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
