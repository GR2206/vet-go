export const PLATFORM_FEE_RATE = 0.12;

export function splitSale(gross: number) {
  const fee = Math.round(gross * PLATFORM_FEE_RATE);
  const net = Math.max(0, gross - fee);
  return { gross, fee, net, rate: PLATFORM_FEE_RATE };
}
