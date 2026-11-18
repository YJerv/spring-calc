/**
 * SC-002 release entitlement.
 *
 * The calculator is free. A one-off permanent Pro unlock for complete A3
 * drawings is agreed, but the price, Play Billing product and verification
 * server are not configured. This module fails closed: nothing in the
 * browser is treated as paid. There is no local paid flag.
 *
 * A paid PDF can be built only from the Node test harness
 * (SPRING_CALC_TEST_ENTITLEMENT=1 and a test-fixture object). That path is
 * not a purchase and is not used by the page.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.SpringEntitlement = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var WATERMARK = "Upgrade to release drawing table";
  var PREVIEW_WARNING = "Preview — incomplete; not for manufacture";

  var OPEN = {
    price: null,
    playProductId: null,
    packageName: "uk.co.yjerv.springcalc",
    verificationUrl: null,
    billing: "not configured",
    existingCustomers: "not specified"
  };

  function productionEntitlement() {
    return {
      tier: "unpaid",
      source: "fail-closed",
      permanent: false,
      verified: false,
      testOnly: false,
      price: OPEN.price,
      productId: OPEN.playProductId,
      reason: "Play Billing product, price and verification server are not configured."
    };
  }

  function nodeTestHarness() {
    return typeof process !== "undefined" &&
      process.versions &&
      typeof process.versions.node === "string" &&
      process.env &&
      process.env.SPRING_CALC_TEST_ENTITLEMENT === "1";
  }

  function releaseTier(options) {
    var entitlement = options && options.entitlement;
    if (nodeTestHarness() &&
        entitlement &&
        entitlement.source === "test-fixture" &&
        entitlement.testOnly === true &&
        entitlement.tier === "paid") {
      return "paid";
    }
    return "unpaid";
  }

  function testPaidFixture() {
    if (!nodeTestHarness()) {
      throw new Error("The paid test fixture is refused outside the Node test harness.");
    }
    return {
      source: "test-fixture",
      testOnly: true,
      tier: "paid",
      verified: false,
      permanent: false
    };
  }

  return {
    WATERMARK: WATERMARK,
    PREVIEW_WARNING: PREVIEW_WARNING,
    OPEN: OPEN,
    productionEntitlement: productionEntitlement,
    releaseTier: releaseTier,
    testPaidFixture: testPaidFixture
  };
});
