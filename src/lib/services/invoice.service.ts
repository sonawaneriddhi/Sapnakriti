import PDFDocument from "pdfkit";

export interface OrderLike {
  _id: unknown;
  orderNumber: string;
  invoiceNumber?: string | null;
  packingCode?: string | null;
  paidAt?: Date | null;
  createdAt?: Date | null;
  items: {
    productName?: string | null;
    quantity?: number | null;
    unitPricePaise?: number | null;
    lineTotalPaise?: number | null;
  }[];
  deliveryAddress?: {
    fullName?: string | null;
    phone?: string | null;
    email?: string | null;
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
  } | null;
  subtotalPaise: number;
  shippingPaise: number;
  discountPaise?: number | null;
  totalPaise: number;
}

// The built-in PDF fonts have no ₹ glyph, so amounts print as "Rs."
const rs = (paise: number) => `Rs. ${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const OLIVE = "#555B43";
const ESPRESSO = "#302820";
const SAND = "#D9C7AD";

/** Builds the invoice PDF from the stored order snapshot (never from live product data). */
export function generateInvoicePdf(order: OrderLike): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const business = process.env.BUSINESS_NAME || "SAPNAKRITI";
    const a = order.deliveryAddress ?? {};
    const date = (order.paidAt ?? order.createdAt ?? new Date()).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    // Header
    doc.fillColor(OLIVE).font("Helvetica-Bold").fontSize(22).text(business, 50, 50, { characterSpacing: 4 });
    doc.fillColor(ESPRESSO).font("Helvetica").fontSize(9).text("Handmade with intention", 50, 78);
    const bizLines = [process.env.BUSINESS_ADDRESS, process.env.BUSINESS_EMAIL, process.env.BUSINESS_PHONE, process.env.BUSINESS_GSTIN ? `GSTIN: ${process.env.BUSINESS_GSTIN}` : ""].filter(Boolean) as string[];
    doc.fontSize(9).fillColor("#6b6358");
    bizLines.forEach((l, i) => doc.text(l, 50, 92 + i * 12, { width: 260 }));

    doc.fillColor(ESPRESSO).font("Helvetica-Bold").fontSize(16).text("INVOICE", 380, 50, { width: 165, align: "right" });
    doc.font("Helvetica").fontSize(9).fillColor("#6b6358");
    doc.text(`Invoice no: ${order.invoiceNumber ?? "-"}`, 380, 74, { width: 165, align: "right" });
    doc.text(`Order no: ${order.orderNumber}`, 380, 87, { width: 165, align: "right" });
    doc.text(`Date: ${date}`, 380, 100, { width: 165, align: "right" });
    if (order.packingCode) doc.text(`Packing code: ${order.packingCode}`, 380, 113, { width: 165, align: "right" });

    doc.moveTo(50, 150).lineTo(545, 150).strokeColor(SAND).lineWidth(1).stroke();

    // Bill to
    doc.fillColor(OLIVE).font("Helvetica-Bold").fontSize(9).text("BILLED / SHIPPED TO", 50, 165);
    doc.fillColor(ESPRESSO).font("Helvetica").fontSize(10);
    const addr = [
      a.fullName,
      a.line1,
      a.line2,
      [a.city, a.state, a.postalCode].filter(Boolean).join(", "),
      a.country,
      a.phone ? `Phone: ${a.phone}` : "",
      a.email,
    ].filter(Boolean) as string[];
    addr.forEach((l, i) => doc.text(l, 50, 180 + i * 14, { width: 300 }));

    // Items table
    let y = 180 + addr.length * 14 + 25;
    doc.rect(50, y, 495, 22).fill(OLIVE);
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(9);
    doc.text("ITEM", 58, y + 7, { width: 250 });
    doc.text("QTY", 310, y + 7, { width: 40, align: "right" });
    doc.text("PRICE", 360, y + 7, { width: 80, align: "right" });
    doc.text("AMOUNT", 450, y + 7, { width: 87, align: "right" });
    y += 28;

    doc.font("Helvetica").fontSize(10).fillColor(ESPRESSO);
    for (const it of order.items) {
      if (y > 700) {
        doc.addPage();
        y = 60;
      }
      const name = it.productName ?? "Item";
      const h = doc.heightOfString(name, { width: 250 });
      doc.text(name, 58, y, { width: 250 });
      doc.text(String(it.quantity ?? 0), 310, y, { width: 40, align: "right" });
      doc.text(rs(it.unitPricePaise ?? 0), 360, y, { width: 80, align: "right" });
      doc.text(rs(it.lineTotalPaise ?? 0), 450, y, { width: 87, align: "right" });
      y += Math.max(h, 14) + 8;
      doc.moveTo(50, y - 4).lineTo(545, y - 4).strokeColor("#eee7da").lineWidth(0.5).stroke();
    }

    // Totals
    y += 10;
    const row = (label: string, value: string, bold = false) => {
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 12 : 10).fillColor(ESPRESSO);
      doc.text(label, 340, y, { width: 100, align: "right" });
      doc.text(value, 450, y, { width: 87, align: "right" });
      y += bold ? 20 : 16;
    };
    row("Subtotal", rs(order.subtotalPaise));
    row("Shipping", order.shippingPaise === 0 ? "Free" : rs(order.shippingPaise));
    if (order.discountPaise) row("Discount", `- ${rs(order.discountPaise)}`);
    doc.moveTo(340, y).lineTo(545, y).strokeColor(SAND).lineWidth(1).stroke();
    y += 6;
    row("Total paid", rs(order.totalPaise), true);

    doc.font("Helvetica").fontSize(8).fillColor("#6b6358");
    doc.text("All prices are inclusive of applicable taxes. This is a computer-generated invoice and does not require a signature.", 50, Math.max(y + 30, 740), { width: 495, align: "center" });
    doc.text(`Thank you for choosing ${business}.`, 50, Math.max(y + 54, 764), { width: 495, align: "center" });

    doc.end();
  });
}
