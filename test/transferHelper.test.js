// Ported from test/TransferHelper.spec.ts. Fake-token setup calls are real
// transactions; the helper invocations themselves are checked via eth_call.
const { test, before } = require("node:test");
const path = require("node:path");
const { assert, qc, compileContract, deploy, send, expectRevert, staticCall, MaxUint256 } = require("./helpers");

const SOURCE = path.resolve(__dirname, "..", "contracts", "test", "TransferHelperTest.sol");
const overrides = { gasLimit: 200_000n };

let transferHelper;
let fakeFallback;
let fakeCompliant;
let fakeNoncompliant;
before(async () => {
  transferHelper = await deploy(compileContract(SOURCE, "TransferHelperTest"));
  fakeFallback = await deploy(compileContract(SOURCE, "TransferHelperTestFakeFallback"));
  fakeNoncompliant = await deploy(compileContract(SOURCE, "TransferHelperTestFakeERC20Noncompliant"));
  fakeCompliant = await deploy(compileContract(SOURCE, "TransferHelperTestFakeERC20Compliant"));
});

const harnessCases = [
  { method: "safeApprove", args: (token) => [token, qc.ZeroAddress, MaxUint256], expectedError: "TransferHelper::safeApprove: approve failed" },
  { method: "safeTransfer", args: (token) => [token, qc.ZeroAddress, MaxUint256], expectedError: "TransferHelper::safeTransfer: transfer failed" },
  { method: "safeTransferFrom", args: (token) => [token, qc.ZeroAddress, qc.ZeroAddress, MaxUint256], expectedError: "TransferHelper::transferFrom: transferFrom failed" },
];

for (const { method, args, expectedError } of harnessCases) {
  test(`${method}`, async () => {
    // succeeds with compliant with no revert and true return
    await send(fakeCompliant.setup(true, false, overrides));
    await staticCall(transferHelper, method, args(fakeCompliant.target));

    // fails with compliant with no revert and false return
    await send(fakeCompliant.setup(false, false, overrides));
    await expectRevert(staticCall(transferHelper, method, args(fakeCompliant.target)), expectedError);

    // fails with compliant with revert
    await send(fakeCompliant.setup(false, true, overrides));
    await expectRevert(staticCall(transferHelper, method, args(fakeCompliant.target)), expectedError);

    // succeeds with noncompliant (no return) with no revert
    await send(fakeNoncompliant.setup(false, overrides));
    await staticCall(transferHelper, method, args(fakeNoncompliant.target));

    // fails with noncompliant (no return) with revert
    await send(fakeNoncompliant.setup(true, overrides));
    await expectRevert(staticCall(transferHelper, method, args(fakeNoncompliant.target)), expectedError);
  });
}

test("safeTransferETH", async () => {
  await send(fakeFallback.setup(false, overrides));
  await staticCall(transferHelper, "safeTransferETH", [fakeFallback.target, 0]);

  await send(fakeFallback.setup(true, overrides));
  await expectRevert(
    staticCall(transferHelper, "safeTransferETH", [fakeFallback.target, 0]),
    "TransferHelper::safeTransferETH: ETH transfer failed"
  );
});
