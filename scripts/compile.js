const path = require("node:path");
const qcSolc = require("./qc-solc");

const root = path.resolve(__dirname, "..");

const harnesses = [
  "AddressStringUtilTest.sol",
  "BabylonianTest.sol",
  "BitMathTest.sol",
  "FixedPointTest.sol",
  "FullMathTest.sol",
  "SafeERC20NamerTest.sol",
  "TransferHelperTest.sol",
];

// Compiling the test harnesses pulls in every library under contracts/libraries.
const output = qcSolc.compile(harnesses.map((file) => path.join(root, "contracts", "test", file)));
qcSolc.writeArtifacts(output, path.join(root, "build"));
console.log(`solidity-lib contracts compiled OK (${qcSolc.compilerVersion()})`);
