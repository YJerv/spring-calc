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

  /* Defaults OFF. The page stays on the test-fixture path until this is set true. */
  var PLAY_BILLING_ENABLED = false;
  /* Not a live Play Console product. Replace before any internal test that should charge. */
  var PLAY_PRODUCT_ID = "spring_calc_drawing_unlock_PLACEHOLDER";
  var PLAY_BILLING_METHOD = "https://play.google.com/billing";

  function playBillingEnabled(override) {
    if (override === true) return true;
    if (override === false) return false;
    return PLAY_BILLING_ENABLED === true;
  }

  function isOwnedUnlock(item) {
    if (!item) return false;
    var id = item.itemId || item.sku;
    if (id !== PLAY_PRODUCT_ID) return false;
    var state = item.purchaseState;
    if (state == null || state === "purchased" || state === 0 || state === "0") return true;
    return false;
  }

  function findOwnedUnlock(purchases) {
    var list = purchases || [];
    for (var i = 0; i < list.length; i++) {
      if (isOwnedUnlock(list[i])) return list[i];
    }
    return null;
  }

  function entitlementFromPurchase(purchase, enabled) {
    if (!playBillingEnabled(enabled)) return productionEntitlement();
    if (!purchase || !isOwnedUnlock(purchase)) return productionEntitlement();
    var acknowledged = purchase.acknowledged === true;
    if (!acknowledged) {
      return {
        tier: "unpaid",
        source: "play-billing",
        permanent: false,
        verified: false,
        acknowledged: false,
        testOnly: false,
        productId: PLAY_PRODUCT_ID,
        purchaseToken: purchase.purchaseToken || null,
        reason: "The Play purchase is not acknowledged yet."
      };
    }
    return {
      tier: "paid",
      source: "play-billing",
      permanent: true,
      verified: true,
      acknowledged: true,
      testOnly: false,
      productId: PLAY_PRODUCT_ID,
      purchaseToken: purchase.purchaseToken || null,
      reason: ""
    };
  }

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
    var enabled = options && Object.prototype.hasOwnProperty.call(options, "playBilling")
      ? options.playBilling
      : undefined;
    if (entitlement &&
        playBillingEnabled(enabled) &&
        entitlement.source === "play-billing" &&
        entitlement.tier === "paid" &&
        entitlement.verified === true &&
        entitlement.acknowledged === true &&
        entitlement.testOnly !== true &&
        entitlement.productId === PLAY_PRODUCT_ID) {
      return "paid";
    }
    return "unpaid";
  }

  function restorePurchases(service, enabled) {
    if (!playBillingEnabled(enabled)) {
      return Promise.resolve({ entitlement: productionEntitlement(), purchase: null });
    }
    return Promise.resolve(service.listPurchases()).then(function (list) {
      var owned = findOwnedUnlock(list);
      if (!owned) return { entitlement: entitlementFromPurchase(null, true), purchase: null };
      if (owned.acknowledged === true) {
        return { entitlement: entitlementFromPurchase(owned, true), purchase: owned };
      }
      return Promise.resolve(service.acknowledge(owned.purchaseToken, "onetime")).then(function () {
        owned.acknowledged = true;
        return { entitlement: entitlementFromPurchase(owned, true), purchase: owned };
      });
    });
  }

  function purchaseUnlock(deps) {
    if (!deps || !playBillingEnabled(deps.playBilling)) {
      return Promise.resolve(productionEntitlement());
    }
    var request = new deps.PaymentRequest([{
      supportedMethods: PLAY_BILLING_METHOD,
      data: { sku: PLAY_PRODUCT_ID }
    }]);
    return request.show().then(function (response) {
      var details = response && response.details ? response.details : {};
      var token = details.purchaseToken || details.token;
      return Promise.resolve(deps.service.acknowledge(token, "onetime")).then(function () {
        return Promise.resolve(response.complete("success")).then(function () {
          return entitlementFromPurchase({
            itemId: PLAY_PRODUCT_ID,
            purchaseToken: token,
            acknowledged: true,
            purchaseState: "purchased"
          }, true);
        });
      });
    });
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
    testPaidFixture: testPaidFixture,
    PLAY_BILLING_ENABLED: PLAY_BILLING_ENABLED,
    PLAY_PRODUCT_ID: PLAY_PRODUCT_ID,
    PLAY_BILLING_METHOD: PLAY_BILLING_METHOD,
    playBillingEnabled: playBillingEnabled,
    findOwnedUnlock: findOwnedUnlock,
    entitlementFromPurchase: entitlementFromPurchase,
    restorePurchases: restorePurchases,
    purchaseUnlock: purchaseUnlock
  };
});
