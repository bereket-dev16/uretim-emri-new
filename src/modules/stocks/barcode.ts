export function formatBarcodeNo(serial: number): string {
  if (!Number.isInteger(serial) || serial <= 0) {
    throw new Error('Serial must be a positive integer.');
  }

  return `B${String(serial).padStart(10, '0')}`;
}

export function createCombinedCode(irsaliyeNo: string, barcodeNo: string): string {
  return `${irsaliyeNo}-${barcodeNo}`;
}
