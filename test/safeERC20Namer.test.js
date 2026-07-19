// Ported from test/SafeERC20Namer.spec.ts. The address fallback heuristics now
// use 64 hex characters for names (32-byte QuantumCoin addresses) and 6 for symbols.
const { test, before } = require("node:test");
const path = require("node:path");
const { assert, qc, compileContract, deploy, scalar } = require("./helpers");

const SOURCE = path.resolve(__dirname, "..", "contracts", "test", "SafeERC20NamerTest.sol");

// last byte in bytes32 strings is null terminator
const fullBytes32Name = "NAME".repeat(8).slice(0, 31);
const fullBytes32Symbol = "SYMB".repeat(8).slice(0, 31);

let namer;
before(async () => {
  namer = await deploy(compileContract(SOURCE, "SafeERC20NamerTest"));
});

function deployCompliant(name, symbol) {
  return deploy(compileContract(SOURCE, "NamerTestFakeCompliantERC20"), [name, symbol]);
}

function deployNoncompliant(name, symbol) {
  return deploy(compileContract(SOURCE, "NamerTestFakeNoncompliantERC20"), [
    qc.encodeBytes32String(name),
    qc.encodeBytes32String(symbol),
  ]);
}

function deployOptional() {
  return deploy(compileContract(SOURCE, "NamerTestFakeOptionalERC20"));
}

const getName = async (address) => scalar(await namer.tokenName(address));
const getSymbol = async (address) => scalar(await namer.tokenSymbol(address));

test("tokenName works with compliant", async () => {
  const token = await deployCompliant("token name", "tn");
  assert.equal(await getName(token.target), "token name");
  assert.equal(await getSymbol(token.target), "tn");
});

test("tokenName works with noncompliant (bytes32)", async () => {
  const token = await deployNoncompliant("token name", "tn");
  assert.equal(await getName(token.target), "token name");
  assert.equal(await getSymbol(token.target), "tn");
});

test("falls back to address with empty bytes32", async () => {
  const token = await deployNoncompliant("", "");
  assert.equal(await getName(token.target), String(token.target).slice(2).toUpperCase());
  assert.equal(await getSymbol(token.target), String(token.target).slice(2, 8).toUpperCase());
});

test("works with noncompliant full bytes32", async () => {
  const token = await deployNoncompliant(fullBytes32Name, fullBytes32Symbol);
  assert.equal(await getName(token.target), fullBytes32Name);
  assert.equal(await getSymbol(token.target), fullBytes32Symbol);
});

test("falls back to address with optional (no name/symbol)", async () => {
  const token = await deployOptional();
  assert.equal(await getName(token.target), String(token.target).slice(2).toUpperCase());
  assert.equal(await getSymbol(token.target), String(token.target).slice(2, 8).toUpperCase());
});

test("works with non-code address", async () => {
  assert.equal(await getName(qc.ZeroAddress), qc.ZeroAddress.slice(2));
  assert.equal(await getSymbol(qc.ZeroAddress), qc.ZeroAddress.slice(2, 8));
});

test("works with really long strings", async () => {
  const token = await deployCompliant("token name".repeat(32), "tn".repeat(32));
  assert.equal(await getName(token.target), "token name".repeat(32));
  assert.equal(await getSymbol(token.target), "tn".repeat(32));
});

test("falls back to address with empty strings", async () => {
  const token = await deployCompliant("", "");
  assert.equal(await getName(token.target), String(token.target).slice(2).toUpperCase());
  assert.equal(await getSymbol(token.target), String(token.target).slice(2, 8).toUpperCase());
});
