import { formatCurrency } from "./format.ts";

export interface WhatsAppBillItem {
  quantity: number;
  nameSnapshot: string;
  lineTotal: string | number;
}

export interface WhatsAppBillOrder {
  orderNumber: string;
  createdAt: string | Date;
  items?: WhatsAppBillItem[];
  subtotal: string | number;
  discountAmount?: string | number | null;
  taxAmount?: string | number | null;
  totalAmount: string | number;
  status: string;
}

/**
 * Builds formatted text receipt for sharing via WhatsApp.
 */
export function generateWhatsAppBillText(
  order: WhatsAppBillOrder,
  restaurantName: string = "Hanva Fine Dine",
): string {
  const name = restaurantName?.trim() || "Hanva Fine Dine";
  const dateStr = order.createdAt
    ? new Date(order.createdAt).toLocaleString()
    : new Date().toLocaleString();

  const lines: string[] = [
    `🧾 *${name}*`,
    `Order: #${order.orderNumber}`,
    `Date: ${dateStr}`,
    "---------------------------",
  ];

  if (order.items && order.items.length > 0) {
    for (const item of order.items) {
      lines.push(`• ${item.quantity}x ${item.nameSnapshot} - ${formatCurrency(item.lineTotal)}`);
    }
  }

  lines.push("---------------------------");
  lines.push(`Subtotal: ${formatCurrency(order.subtotal)}`);

  const discount = Number(order.discountAmount ?? 0);
  if (!Number.isNaN(discount) && discount > 0) {
    lines.push(`Discount: -${formatCurrency(order.discountAmount!)}`);
  }

  const tax = Number(order.taxAmount ?? 0);
  if (!Number.isNaN(tax) && tax > 0) {
    lines.push(`Taxes: ${formatCurrency(order.taxAmount!)}`);
  }

  lines.push(`*Grand Total: ${formatCurrency(order.totalAmount)}*`);
  lines.push(`Status: ${order.status === "PAID" ? "PAID ✅" : "Payment Due ⏳"}`);
  lines.push("---------------------------");
  lines.push("Thank you for dining with us! 🙏");

  return lines.join("\n");
}
