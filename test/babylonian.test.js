// Ported from test/Babylonian.spec.ts. Gas-cost snapshots were dropped
// (QuantumCoin's gas schedule differs from Ethereum's istanbul).
const { test, before } = require("node:test");
const path = require("node:path");
const { assert, compileContract, deploy, scalar, MaxUint256 } = require("./helpers");

let babylonian;
before(async () => {
  const artifact = compileContract(
    path.resolve(__dirname, "..", "contracts", "test", "BabylonianTest.sol"),
    "BabylonianTest"
  );
  babylonian = await deploy(artifact);
});

test("sqrt works for 0-99", async () => {
  const results = await Promise.all([...Array(100)].map((_, i) => babylonian.sqrt(i)));
  results.forEach((result, i) => {
    assert.equal(scalar(result), BigInt(Math.floor(Math.sqrt(i))), `sqrt(${i})`);
  });
});

test("product of numbers close to max uint112", async () => {
  const max = 2n ** 112n - 1n;
  assert.equal(scalar(await babylonian.sqrt(max * max)), max);
  const maxMinus1 = max - 1n;
  assert.equal(scalar(await babylonian.sqrt(maxMinus1 * maxMinus1)), maxMinus1);
  const maxMinus2 = max - 2n;
  assert.equal(scalar(await babylonian.sqrt(maxMinus2 * maxMinus2)), maxMinus2);
  assert.equal(scalar(await babylonian.sqrt(max * maxMinus1)), maxMinus1);
  assert.equal(scalar(await babylonian.sqrt(max * maxMinus2)), maxMinus2);
  assert.equal(scalar(await babylonian.sqrt(maxMinus1 * maxMinus2)), maxMinus2);
});

test("max uint256", async () => {
  assert.equal(scalar(await babylonian.sqrt(MaxUint256)), 2n ** 128n - 1n);
});
