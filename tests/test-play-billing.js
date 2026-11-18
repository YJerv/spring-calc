#!/usr/bin/env node
/**
 * Play Billing unlock. The flag defaults off, so the test fixture stays the
 * only paid path until someone turns the flag on. Mocks stand in for
 * Digital Goods and Payment Request.
 */
"use strict";

const Ent = require("../js/entitlement.js");

let passed = 0;
let failed = 0;
const failures = [];

function assert(cond, name, detail) {
  if (cond) {
    passed += 1;
    console.log("  PASS  " + name);
  } else {
    failed += 1;
    const msg = "  FAIL  " + name + (detail ? " — " + detail : "");
    failures.push(msg);
    console.log(msg);
  }
}

assert(Ent.PLAY_BILLING_ENABLED === false, "Play Billing defaults off");
assert(Ent.playBillingEnabled() === false, "The page does not enable Play Billing by itself");
assert(Ent.PLAY_PRODUCT_ID.indexOf("PLACEHOLDER") >= 0, "The product id is still a placeholder");
assert(Ent.productionEntitlement().tier === "unpaid" && Ent.productionEntitlement().productId == null,
  "The default entitlement stays unpaid and has no product id");

const owned = {
  itemId: Ent.PLAY_PRODUCT_ID,
  purchaseToken: "token-1",
  acknowledged: true,
  purchaseState: "purchased"
};
assert(Ent.releaseTier({
  playBilling: false,
  entitlement: Ent.entitlementFromPurchase(owned, true)
}) === "unpaid", "A real-looking Play purchase stays unpaid while the flag is off");
assert(Ent.releaseTier({
  playBilling: true,
  entitlement: Ent.entitlementFromPurchase(owned, true)
}) === "paid", "An acknowledged purchase unlocks only when the flag is on");
assert(Ent.entitlementFromPurchase({
  itemId: Ent.PLAY_PRODUCT_ID,
  purchaseToken: "token-2",
  acknowledged: false,
  purchaseState: "purchased"
}, true).tier === "unpaid", "An unacknowledged purchase does not unlock");
assert(Ent.entitlementFromPurchase({
  itemId: "some-other-sku",
  acknowledged: true,
  purchaseState: "purchased"
}, true).tier === "unpaid", "A different product does not unlock");

const restored = [];
const service = {
  listPurchases: function () {
    return Promise.resolve([{
      itemId: Ent.PLAY_PRODUCT_ID,
      purchaseToken: "token-3",
      acknowledged: false,
      purchaseState: 0
    }]);
  },
  acknowledge: function (token, type) {
    restored.push(token + ":" + type);
    return Promise.resolve();
  }
};

restoreAndPurchase();

function restoreAndPurchase() {
  Ent.restorePurchases(service, false).then(function (off) {
    assert(off.entitlement.tier === "unpaid" && restored.length === 0,
      "Restore does nothing while the flag is off");
    return Ent.restorePurchases(service, true);
  }).then(function (on) {
    assert(on.entitlement.tier === "paid" && on.entitlement.acknowledged === true,
      "Restore acknowledges an existing purchase and unlocks");
    assert(restored[0] === "token-3:onetime", "Restore acknowledges with the one-time type");
    const shown = [];
    function PaymentRequest() {}
    PaymentRequest.prototype.show = function () {
      shown.push("show");
      return Promise.resolve({
        details: { purchaseToken: "token-4" },
        complete: function (result) {
          shown.push(result);
          return Promise.resolve();
        }
      });
    };
    return Ent.purchaseUnlock({
      playBilling: true,
      service: service,
      PaymentRequest: PaymentRequest
    }).then(function (paid) {
      assert(paid.tier === "paid" && paid.purchaseToken === "token-4", "Purchase returns an acknowledged unlock");
      assert(shown.join(",") === "show,success", "The payment sheet is completed as a success");
      assert(restored.indexOf("token-4:onetime") >= 0, "The new purchase is acknowledged");
      return Ent.purchaseUnlock({ playBilling: false, service: service, PaymentRequest: PaymentRequest });
    });
  }).then(function (blocked) {
    assert(blocked.tier === "unpaid" && blocked.source === "fail-closed",
      "Purchase is refused while the flag is off");
    console.log("\n" + passed + " passed, " + failed + " failed");
    if (failed) {
      failures.forEach(function (msg) { console.log(msg); });
      process.exit(1);
    }
    console.log("All Play Billing checks passed.");
  }).catch(function (err) {
    console.log("  FAIL  " + err.stack);
    process.exit(1);
  });
}
