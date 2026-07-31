// Currency integration point:
// - Currently hardcoded to Nigerian Naira (NGN) for all users.
// - TODO(backend): detect the user's country via IP geolocation (e.g. on
//   sign-in/sign-up or via a middleware lookup) and select the matching
//   currency + symbol/locale for formatting instead of always using NGN.
export const CURRENCY_SYMBOL = "\u20a6";
export const CURRENCY_CODE = "NGN";

export function formatCurrency(amount: number): string {
  return `${CURRENCY_SYMBOL}${amount.toLocaleString()}`;
}
