// Ported from test/FixedPoint.spec.ts. Gas-cost snapshots were dropped.
const { test, before } = require("node:test");
const path = require("node:path");
const { assert, compileContract, deploy, expectRevert, staticCall, MaxUint256 } = require("./helpers");

const Q112 = 2n ** 112n;

// uq112x112/uq144x112 structs decode as single-element tuples; the SDK's
// pure-JS coder returns them as objects keyed by field name ({ _x: ... }).
function unwrap(value) {
  let v = value;
  for (;;) {
    if (Array.isArray(v) && v.length === 1) {
      v = v[0];
    } else if (v && typeof v === "object" && "_x" in v) {
      v = v._x;
    } else {
      break;
    }
  }
  return BigInt(v);
}

let fixedPoint;
before(async () => {
  const artifact = compileContract(
    path.resolve(__dirname, "..", "contracts", "test", "FixedPointTest.sol"),
    "FixedPointTest"
  );
  fixedPoint = await deploy(artifact);
});

test("encode / encode144 shift left by 112", async () => {
  assert.equal(unwrap(await fixedPoint.encode(1n)), Q112);
  assert.equal(unwrap(await fixedPoint.encode144(1n)), Q112);
});

test("decode / decode144 shift right by 112", async () => {
  assert.equal(unwrap(await fixedPoint.decode([3n * Q112])), 3n);
  assert.equal(unwrap(await fixedPoint.decode144([3n * Q112])), 3n);
});

test("mul", async () => {
  assert.equal(unwrap(await fixedPoint.mul([0n], 1n)), 0n);
  assert.equal(unwrap(await fixedPoint.mul([1n], 0n)), 0n);
  assert.equal(unwrap(await fixedPoint.mul([3n * Q112], 2n)), 6n * Q112);
  await expectRevert(staticCall(fixedPoint, "mul", [[Q112], 2n ** 144n]), "FixedPoint::mul: overflow");
  assert.equal(unwrap(await fixedPoint.mul([Q112], Q112)), 2n ** 224n);

  const maxMultiplier = 2n ** 32n;
  assert.equal(
    unwrap(await fixedPoint.mul([2n ** 224n - 1n], maxMultiplier)),
    115792089237316195423570985008687907853269984665640564039457584007908834672640n
  );
  await expectRevert(staticCall(fixedPoint, "mul", [[2n ** 224n - 1n], maxMultiplier + 1n]), "FixedPoint::mul: overflow");

  assert.equal(unwrap(await fixedPoint.mul([1n], MaxUint256)), MaxUint256);
  await expectRevert(staticCall(fixedPoint, "mul", [[2n], MaxUint256]), "FixedPoint::mul: overflow");
});

test("muli", async () => {
  assert.equal(unwrap(await fixedPoint.muli([0n], 1n)), 0n);
  assert.equal(unwrap(await fixedPoint.muli([Q112], 0n)), 0n);
  assert.equal(unwrap(await fixedPoint.muli([3n * Q112], 2n)), 6n);
  assert.equal(unwrap(await fixedPoint.muli([3n * Q112], -2n)), -6n);

  const maxInt = 2n ** 255n - 1n;
  const minInt = -(2n ** 255n);
  assert.equal(unwrap(await fixedPoint.muli([Q112], maxInt)), maxInt);
  await expectRevert(staticCall(fixedPoint, "muli", [[Q112], minInt]), "FixedPoint::muli: overflow");
  assert.equal(
    unwrap(await fixedPoint.muli([Q112 - 1n], minInt)),
    -57896044618658097711785492504343942776262393067508711251869655679775811829760n
  );
  assert.equal(unwrap(await fixedPoint.muli([Q112], minInt + 1n)), minInt + 1n);

  const maxMultiplier = 2n ** (255n + 112n) / (2n ** 224n - 1n);
  assert.equal(
    unwrap(await fixedPoint.muli([2n ** 224n - 1n], maxMultiplier)),
    57896044618658097711785492504343953926634992332820282019728792003954417336320n
  );
  await expectRevert(staticCall(fixedPoint, "muli", [[2n ** 224n - 1n], maxMultiplier + 1n]), "FixedPoint::muli: overflow");
  assert.equal(
    unwrap(await fixedPoint.muli([2n ** 224n - 1n], -maxMultiplier)),
    -57896044618658097711785492504343953926634992332820282019728792003954417336320n
  );
  await expectRevert(
    staticCall(fixedPoint, "muli", [[2n ** 224n - 1n], -(maxMultiplier + 1n)]),
    "FixedPoint::muli: overflow"
  );
});

function multiplyExpanded(self, other) {
  const mask112 = 2n ** 112n - 1n;
  const upper = (self >> 112n) * (other >> 112n);
  const lower = (self & mask112) * (other & mask112);
  const uppersLowero = (self >> 112n) * (other & mask112);
  const upperoLowers = (self & mask112) * (other >> 112n);
  return upper * Q112 + uppersLowero + upperoLowers + lower / Q112;
}

test("muluq", async () => {
  assert.equal(unwrap(await fixedPoint.muluq([0n], [Q112])), 0n);
  assert.equal(unwrap(await fixedPoint.muluq([Q112], [0n])), 0n);
  assert.equal(unwrap(await fixedPoint.muluq([3n * Q112], [2n * Q112])), 6n * Q112);

  const multiplier = (4n * Q112) / 3n;
  const expected = multiplyExpanded(multiplier, multiplier);
  assert.equal(unwrap(await fixedPoint.muluq([multiplier], [multiplier])), expected);
  assert.equal(expected + 1n, (16n * Q112) / 9n);

  const multiplier1 = Q112 * 2n;
  const multiplier2 = (Q112 * Q112) / 2n;
  await expectRevert(staticCall(fixedPoint, "muluq", [[multiplier1], [multiplier2]]), "FixedPoint::muluq: upper overflow");
  assert.equal(unwrap(await fixedPoint.muluq([multiplier1 - 1n], [multiplier2])), multiplyExpanded(multiplier1 - 1n, multiplier2));
  assert.equal(unwrap(await fixedPoint.muluq([multiplier1], [multiplier2 - 1n])), multiplyExpanded(multiplier1, multiplier2 - 1n));
});

test("divuq", async () => {
  assert.equal(unwrap(await fixedPoint.divuq([0n], [Q112])), 0n);
  await expectRevert(staticCall(fixedPoint, "divuq", [[Q112], [0n]]), "FixedPoint::divuq: division by zero");
  assert.equal(unwrap(await fixedPoint.divuq([30n * Q112], [30n * Q112])), Q112);
  assert.equal(unwrap(await fixedPoint.divuq([30n * Q112], [10n * Q112])), 3n * Q112);
  assert.equal(unwrap(await fixedPoint.divuq([35n * Q112], [8n * Q112])), (4375n * Q112) / 1000n);
  assert.equal(unwrap(await fixedPoint.divuq([Q112], [3n * Q112])), 1730765619511609209510165443073365n);
  assert.equal(
    unwrap(await fixedPoint.divuq([10n ** 15n * Q112], [3n * 10n ** 15n * Q112])),
    1730765619511609209510165443073365n
  );

  const maxNumeratorFullPrecision = 2n ** 144n - 1n;
  const minDenominatorFullPrecision = 4294967296n; // ceiling(uint144(-1) * Q112 / uint224(-1))
  assert.equal(
    unwrap(await fixedPoint.divuq([maxNumeratorFullPrecision], [minDenominatorFullPrecision])),
    26959946667150639794667015087019630673637143213614752866474435543040n
  );
  await expectRevert(
    staticCall(fixedPoint, "divuq", [[maxNumeratorFullPrecision + 1n], [minDenominatorFullPrecision]]),
    "FixedPoint::divuq: overflow"
  );
  await expectRevert(
    staticCall(fixedPoint, "divuq", [[maxNumeratorFullPrecision], [minDenominatorFullPrecision - 1n]]),
    "FixedPoint::divuq: overflow"
  );

  const numerator = 2n ** 144n;
  assert.equal(unwrap(await fixedPoint.divuq([numerator], [numerator - 1n])), 5192296858534827628530496329220096n);
  assert.equal(unwrap(await fixedPoint.divuq([numerator], [numerator + 1n])), 5192296858534827628530496329220095n);

  await expectRevert(staticCall(fixedPoint, "divuq", [[2n ** 143n], [2n ** 29n]]), "FixedPoint::divuq: overflow");
  await expectRevert(staticCall(fixedPoint, "divuq", [[2n ** 145n], [2n ** 32n]]), "FixedPoint::divuq: overflow");
});

test("fraction", async () => {
  assert.equal(unwrap(await fixedPoint.fraction(4n, 100n)), (4n * Q112) / 100n);
  assert.equal(unwrap(await fixedPoint.fraction(100n, 4n)), (100n * Q112) / 4n);
  await expectRevert(staticCall(fixedPoint, "fraction", [1n, 0n]), "FixedPoint::fraction: division by zero");
  assert.equal(unwrap(await fixedPoint.fraction(Q112 * 2359n, 6950n)), (Q112 * Q112 * 2359n) / 6950n);
  assert.equal(unwrap(await fixedPoint.fraction(2359n, Q112 * 2359n)), 1n);
  assert.equal(
    unwrap(await fixedPoint.fraction(Q112 * 2359n * 2n ** 32n, Q112 * 50n)),
    (2359n * Q112 * 2n ** 32n) / 50n
  );
  assert.equal(unwrap(await fixedPoint.fraction(Q112 * 2359n, Q112 * 50n)), (2359n * Q112) / 50n);
  assert.equal(unwrap(await fixedPoint.fraction(0n, Q112 * Q112 * 2360n)), 0n);
  await expectRevert(staticCall(fixedPoint, "fraction", [Q112 * 2359n, 50n]), "FixedPoint::fraction: overflow");
});

test("reciprocal", async () => {
  await expectRevert(staticCall(fixedPoint, "reciprocal", [[0n]]), "FixedPoint::reciprocal: reciprocal of zero");
  await expectRevert(staticCall(fixedPoint, "reciprocal", [[1n]]), "FixedPoint::reciprocal: overflow");
  assert.equal(unwrap(await fixedPoint.reciprocal([(Q112 * 25n) / 100n])), Q112 * 4n);
  assert.equal(unwrap(await fixedPoint.reciprocal([Q112 * 5n])), Q112 / 5n);
});

test("sqrt", async () => {
  assert.equal(unwrap(await fixedPoint.sqrt([0n])), 0n);
  assert.equal(unwrap(await fixedPoint.sqrt([(1225n * Q112) / 100n])), (35n * Q112) / 10n);
  assert.equal(unwrap(await fixedPoint.sqrt([25n * Q112])), 5n * Q112);
  assert.equal(unwrap(await fixedPoint.sqrt([2n ** 144n - 1n])), 340282366920938463463374607431768211455n);
  assert.equal(unwrap(await fixedPoint.sqrt([2n ** 144n])), (340282366920938463463374607431768211456n >> 2n) << 2n);
  assert.equal(
    unwrap(await fixedPoint.sqrt([(2n ** 112n - 1n) * Q112])),
    (374144419156711147060143317175368417003121712037887n >> 40n) << 40n
  );
  assert.equal(
    unwrap(await fixedPoint.sqrt([2n ** 224n - 1n])),
    (374144419156711147060143317175368453031918731001855n >> 40n) << 40n
  );
});
