// Ported from test/FullMath.spec.ts.
const { test, before } = require("node:test");
const path = require("node:path");
const { assert, compileContract, deploy, scalar } = require("./helpers");

const Q128 = 2n ** 128n;

let fullMath;
before(async () => {
  const artifact = compileContract(path.resolve(__dirname, "..", "contracts", "test", "FullMathTest.sol"), "FullMathTest");
  fullMath = await deploy(artifact);
});

test("accurate without phantom overflow", async () => {
  const result = Q128 / 3n;
  const half = (50n * Q128) / 100n;
  const oneAndHalf = (150n * Q128) / 100n;
  assert.equal(scalar(await fullMath.mulDiv(Q128, half, oneAndHalf)), result);
  assert.equal(scalar(await fullMath.mulDivRoundingUp(Q128, half, oneAndHalf)), result + 1n);
});

test("accurate with phantom overflow", async () => {
  const result = (4375n * Q128) / 1000n;
  assert.equal(scalar(await fullMath.mulDiv(Q128, 35n * Q128, 8n * Q128)), result);
  assert.equal(scalar(await fullMath.mulDivRoundingUp(Q128, 35n * Q128, 8n * Q128)), result);
});

test("accurate with phantom overflow and repeating decimal", async () => {
  const result = Q128 / 3n;
  assert.equal(scalar(await fullMath.mulDiv(Q128, 1000n * Q128, 3000n * Q128)), result);
  assert.equal(scalar(await fullMath.mulDivRoundingUp(Q128, 1000n * Q128, 3000n * Q128)), result + 1n);
});
