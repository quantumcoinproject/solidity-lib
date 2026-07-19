// Ported from test/BitMath.spec.ts. Gas-cost snapshots were dropped.
const { test, before } = require("node:test");
const path = require("node:path");
const { assert, compileContract, deploy, expectRevert, staticCall, scalar, MaxUint256 } = require("./helpers");

let bitMath;
before(async () => {
  const artifact = compileContract(path.resolve(__dirname, "..", "contracts", "test", "BitMathTest.sol"), "BitMathTest");
  bitMath = await deploy(artifact);
});

test("mostSignificantBit", async () => {
  await expectRevert(staticCall(bitMath, "mostSignificantBit", [0]), "BitMath::mostSignificantBit: zero");
  assert.equal(BigInt(scalar(await bitMath.mostSignificantBit(1))), 0n);
  assert.equal(BigInt(scalar(await bitMath.mostSignificantBit(2))), 1n);
  const results = await Promise.all([...Array(255)].map((_, i) => bitMath.mostSignificantBit(2n ** BigInt(i))));
  results.forEach((result, i) => assert.equal(BigInt(scalar(result)), BigInt(i), `msb(2**${i})`));
  assert.equal(BigInt(scalar(await bitMath.mostSignificantBit(MaxUint256))), 255n);
});

test("leastSignificantBit", async () => {
  await expectRevert(staticCall(bitMath, "leastSignificantBit", [0]), "BitMath::leastSignificantBit: zero");
  assert.equal(BigInt(scalar(await bitMath.leastSignificantBit(1))), 0n);
  assert.equal(BigInt(scalar(await bitMath.leastSignificantBit(2))), 1n);
  const results = await Promise.all([...Array(255)].map((_, i) => bitMath.leastSignificantBit(2n ** BigInt(i))));
  results.forEach((result, i) => assert.equal(BigInt(scalar(result)), BigInt(i), `lsb(2**${i})`));
  assert.equal(BigInt(scalar(await bitMath.leastSignificantBit(MaxUint256))), 0n);
});
