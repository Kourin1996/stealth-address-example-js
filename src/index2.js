import { ethers } from "ethers";
import EC from "elliptic";

const secp256k1 = new EC.ec("secp256k1");

// create stealth account by elliptic and use with ethers
async function main() {
  const rootKey = secp256k1.genKeyPair();
  const ephemeralKey = secp256k1.genKeyPair();

  // m
  const rootPrivKeyHex = rootKey.getPrivate().toBuffer().toString("hex"); // hex without 0x
  // M
  const rootPublicKeyHex = rootKey.getPublic().encode("hex");

  console.log(
    `root key: private=${rootPrivKeyHex}, public=${rootPublicKeyHex}`
  );

  // r
  const ephemeralPrivKeyHex = ephemeralKey
    .getPrivate()
    .toBuffer()
    .toString("hex");
  // R
  const ephemeralPublicKeyHex = ephemeralKey.getPublic().encode("hex");

  console.log(
    `ephemeral key: private=${ephemeralPrivKeyHex}, public=${ephemeralPublicKeyHex}`
  );

  const sharedSecret1 = rootKey
    .getPublic()
    .mul(secp256k1.keyFromPrivate(ephemeralPrivKeyHex).getPrivate());
  const sharedSecret2 = ephemeralKey
    .getPublic()
    .mul(secp256k1.keyFromPrivate(rootPrivKeyHex).getPrivate());

  console.log("sharedSecret1", sharedSecret1.encode("hex"));
  console.log("sharedSecret2", sharedSecret2.encode("hex"));

  // stealth public key
  const stealthPublicKey = ephemeralKey
    .getPublic()
    .add(
      secp256k1
        .keyFromPrivate(ethers.keccak256("0x" + sharedSecret1.encode("hex")))
        .getPublic()
    );
  console.log("stealthPublicKey", stealthPublicKey.encode("hex"));

  // stealth private key
  const stealthPrivateKey = rootKey
    .getPrivate()
    .add(
      secp256k1
        .keyFromPrivate(ethers.keccak256("0x" + sharedSecret1.encode("hex")))
        .getPrivate()
    );
  const stealthPrivateKeyHex = stealthPrivateKey.toBuffer().toString("hex");
  const stealthPublicKeyHex = secp256k1
    .keyFromPrivate(stealthPrivateKey)
    .getPublic()
    .encode("hex");
  console.log("stealthPrivateKey", stealthPrivateKeyHex);
  console.log("stealthPublicKey from private key", stealthPublicKeyHex);

  const stealthWallet = new ethers.Wallet("0x" + stealthPrivateKeyHex);
  const signature = await stealthWallet.signMessage("Hello");

  console.log("signature", signature);

  const recovered = ethers.verifyMessage("Hello", signature);

  console.log(
    "actual signer address",
    ethers.computeAddress("0x" + stealthPrivateKeyHex)
  );
  console.log("recovered", recovered);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
