import { Platform } from 'react-native';

/**
 * Everything that talks to RevenueCat lives here.
 *
 * App Store IAP is the only purchase path on iOS (Guideline 3.1.1). Everywhere
 * else — Android, and the Expo web build the e2e suite runs against — every
 * function below is a no-op, and the SDK is imported lazily so the web bundle
 * never pulls in a native module it cannot load.
 *
 * The server is the source of truth for entitlement: a purchase here is
 * confirmed by the RevenueCat webhook updating ApplePremiumSubscription, which
 * the app then reads back from /subscription. Nothing gates premium on
 * customerInfo alone.
 */

/** Shape the UI needs, so screens never import RevenueCat types directly. */
export interface PremiumPackage {
  /** RevenueCat package identifier, passed back to purchase(). */
  id: string;
  interval: 'month' | 'year';
  /** Store-formatted price in the customer's currency — never build this yourself. */
  priceString: string;
  productId: string;
}

const IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;

/** iOS with a real key. A missing key means the paywall renders its error state. */
export function purchasesAvailable(): boolean {
  return Platform.OS === 'ios' && !!IOS_API_KEY && !IOS_API_KEY.startsWith('REPLACE_');
}

async function sdk() {
  return (await import('react-native-purchases')).default;
}

let configuredFor: string | null = null;

/**
 * Identify the buyer to RevenueCat as the Vittio user, before any purchase is
 * possible. The webhook then carries our own user id, so no anonymous id ever
 * needs aliasing to an account afterwards.
 */
export async function identifyPurchaser(userId: number): Promise<void> {
  if (!purchasesAvailable()) return;

  const appUserID = String(userId);
  if (configuredFor === appUserID) return;

  try {
    const Purchases = await sdk();
    if (configuredFor === null) {
      if (__DEV__) {
        const { LOG_LEVEL } = await import('react-native-purchases');
        await Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      }
      Purchases.configure({ apiKey: IOS_API_KEY!, appUserID });
    } else {
      // Same install, different account.
      await Purchases.logIn(appUserID);
    }
    configuredFor = appUserID;
  } catch (err) {
    // Never block sign-in on this. The user keeps whatever access the server
    // already grants; only the purchase UI degrades.
    console.warn('[purchases] identify failed', err);
  }
}

export async function forgetPurchaser(): Promise<void> {
  if (!purchasesAvailable() || configuredFor === null) return;

  try {
    await (await sdk()).logOut();
  } catch (err) {
    console.warn('[purchases] logOut failed', err);
  } finally {
    // logOut leaves the SDK configured under a fresh anonymous id, so the next
    // identify must take the logIn path rather than configure again.
    configuredFor = '';
  }
}

/**
 * Plans to show, priced by the store. Returns [] when the offering is missing
 * or the products are not yet "Ready to Submit" in App Store Connect — the
 * caller renders an unavailable state rather than inventing prices.
 */
export async function getPremiumPackages(): Promise<PremiumPackage[]> {
  if (!purchasesAvailable()) return [];

  const Purchases = await sdk();
  const offerings = await Purchases.getOfferings();
  const packages = offerings.current?.availablePackages ?? [];

  if (__DEV__) {
    // Which store actually answered. A price that is not the App Store Connect one
    // means these products came from somewhere else — RevenueCat's Test Store, or a
    // local StoreKit configuration — and the screenshot would be wrong.
    console.log(
      '[purchases] offering:', offerings.current?.identifier,
      packages.map((p) => `${p.product.identifier}=${p.product.priceString} ${p.product.currencyCode}`),
    );
  }

  return packages
    .map((pkg) => {
      const interval = intervalFor(pkg.packageType);
      if (!interval) return null;
      return {
        id: pkg.identifier,
        interval,
        priceString: pkg.product.priceString,
        productId: pkg.product.identifier,
      } satisfies PremiumPackage;
    })
    .filter((p): p is PremiumPackage => p !== null)
    // Annual first: it is the better value and the one Apple ranks highest.
    .sort((a, b) => (a.interval === b.interval ? 0 : a.interval === 'year' ? -1 : 1));
}

function intervalFor(packageType: string): 'month' | 'year' | null {
  if (packageType === 'MONTHLY') return 'month';
  if (packageType === 'ANNUAL') return 'year';
  return null;
}

export type PurchaseOutcome = 'purchased' | 'cancelled';

/**
 * Runs the StoreKit purchase sheet. A user backing out is an outcome, not an
 * error — only real failures throw.
 */
export async function purchasePremium(packageId: string): Promise<PurchaseOutcome> {
  if (!purchasesAvailable()) throw new Error('In-app purchase is unavailable');

  const Purchases = await sdk();
  const offerings = await Purchases.getOfferings();
  const target = offerings.current?.availablePackages.find((p) => p.identifier === packageId);
  if (!target) throw new Error(`Package ${packageId} is no longer offered`);

  try {
    await Purchases.purchasePackage(target);
    return 'purchased';
  } catch (err) {
    if ((err as { userCancelled?: boolean }).userCancelled) return 'cancelled';
    throw err;
  }
}

/**
 * Apple requires a restore path. Returns whether the App Store reports an
 * active entitlement; the server still confirms it via the webhook.
 */
export async function restorePremium(): Promise<boolean> {
  if (!purchasesAvailable()) throw new Error('In-app purchase is unavailable');

  const Purchases = await sdk();
  const customerInfo = await Purchases.restorePurchases();
  return Object.keys(customerInfo.entitlements.active).length > 0;
}
