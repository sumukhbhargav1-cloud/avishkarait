export type PaymentSettings = {
  enabled: boolean;
  upiId: string | null;
  beneficiaryName: string | null;
  fee: number;
  qrCodeUrl: string | null;
};

export const FALLBACK_FEE = 1500;

type SettingsRow =
  | {
      upi_id?: string | null;
      beneficiary_name?: string | null;
      registration_fee?: number | null;
      official_qr_image_url?: string | null;
      payment_enabled?: boolean | null;
    }
  | null;

export function normalizePaymentSettings(row: SettingsRow): PaymentSettings {
  const fee = Number(row?.registration_fee);
  return {
    enabled: row?.payment_enabled !== false,
    upiId: row?.upi_id?.trim() || null,
    beneficiaryName: row?.beneficiary_name?.trim() || null,
    fee: Number.isFinite(fee) && fee > 0 ? fee : FALLBACK_FEE,
    qrCodeUrl: row?.official_qr_image_url?.trim() || null,
  };
}

// UTR / transaction references are alphanumeric; spaces and lowercase are
// normalised so a pasted reference is accepted.
export function normalizeUtr(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, '').toUpperCase() : '';
}

export function isValidUtr(value: string): boolean {
  return /^[A-Z0-9][A-Z0-9._/-]{5,39}$/.test(value);
}

export const PAYMENT_STATUSES = ['NOT PAID', 'PENDING', 'PAID', 'FAILED'] as const;

export function paymentStatusLabel(status?: string | null): string {
  switch ((status || 'NOT PAID').toUpperCase()) {
    case 'PAID':
      return 'Paid';
    case 'PENDING':
      return 'Awaiting verification';
    case 'FAILED':
      return 'Payment failed';
    default:
      return 'Payment pending';
  }
}
