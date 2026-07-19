// Ported from test/AddressStringUtil.spec.ts. QuantumCoin addresses are 32
// bytes, so the full ASCII form is 64 characters (was 40 on Ethereum).
const { test, before } = require("node:test");
const path = require("node:path");
const { assert, qc, compileContract, deploy, expectRevert, staticCall, scalar } = require("./helpers");

const example = "0xc257274276a4e539741ca11b590b9447b26a8051c257274276a4e5397412ab34";

let util;
before(async () => {
  const artifact = compileContract(
    path.resolve(__dirname, "..", "contracts", "test", "AddressStringUtilTest.sol"),
    "AddressStringUtilTest"
  );
  util = await deploy(artifact);
});

test("zero address", async () => {
  assert.equal(scalar(await util.toAsciiString(qc.ZeroAddress, 64)), "0".repeat(64));
});

test("own address", async () => {
  assert.equal(scalar(await util.toAsciiString(util.target, 64)), String(util.target).slice(2).toUpperCase());
});

test("random address", async () => {
  assert.equal(scalar(await util.toAsciiString(example, 64)), example.slice(2).toUpperCase());
});

test("reverts if len % 2 != 0", async () => {
  await expectRevert(staticCall(util, "toAsciiString", [example, 39]), "AddressStringUtil: INVALID_LEN");
});

test("reverts if len > 64", async () => {
  await expectRevert(staticCall(util, "toAsciiString", [example, 66]), "AddressStringUtil: INVALID_LEN");
});

test("reverts if len == 0", async () => {
  await expectRevert(staticCall(util, "toAsciiString", [example, 0]), "AddressStringUtil: INVALID_LEN");
});

test("produces len characters", async () => {
  assert.equal(scalar(await util.toAsciiString(example, 4)), example.slice(2, 6).toUpperCase());
  assert.equal(scalar(await util.toAsciiString(example, 10)), example.slice(2, 12).toUpperCase());
  assert.equal(scalar(await util.toAsciiString(example, 16)), example.slice(2, 18).toUpperCase());
});
