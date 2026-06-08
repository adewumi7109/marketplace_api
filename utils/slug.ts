export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeWhatsAppPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("0")) return `234${digits.slice(1)}`;
  if (digits.length === 10) return `234${digits}`;

  return digits;
}

export function generateWhatsAppLink(phone: string, productName: string, price: string | number): string {
  const message = encodeURIComponent(`I want ${productName} - ${price}`);
  const cleanPhone = normalizeWhatsAppPhone(phone);
  return `https://wa.me/${cleanPhone}?text=${message}`;
}
