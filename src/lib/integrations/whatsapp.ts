// WhatsApp Business Cloud API. Business-initiated messages MUST use a pre-approved
// template. Suggested body for your template (4 variables):
//   "Hi {{1}}, thank you for your SAPNAKRITI order {{2}}! Your packing code is {{3}}.
//    Total paid: {{4}}. We'll message you again when it ships."
// If WHATSAPP_INVOICE_AS_DOCUMENT=true the template must also have a DOCUMENT header.

export async function sendOrderWhatsApp(opts: {
  toPhone10: string;
  customerName: string;
  orderNumber: string;
  packingCode: string;
  totalText: string;
  invoiceLink?: string;
  invoiceFilename?: string;
}) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME;
  if (!token || !phoneId || !templateName) {
    throw new Error("WhatsApp is not configured (token / phone number id / template name)");
  }
  const version = process.env.WHATSAPP_API_VERSION || "v21.0";
  const asDocument = process.env.WHATSAPP_INVOICE_AS_DOCUMENT === "true";

  const components: unknown[] = [];
  if (asDocument && opts.invoiceLink) {
    components.push({
      type: "header",
      parameters: [{ type: "document", document: { link: opts.invoiceLink, filename: opts.invoiceFilename ?? "invoice.pdf" } }],
    });
  }
  components.push({
    type: "body",
    parameters: [opts.customerName, opts.orderNumber, opts.packingCode, opts.totalText].map((text) => ({
      type: "text",
      text: text.replace(/[\n\t]+/g, " ").slice(0, 200),
    })),
  });

  const res = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: `91${opts.toPhone10}`,
      type: "template",
      template: {
        name: templateName,
        language: { code: process.env.WHATSAPP_TEMPLATE_LANG || "en" },
        components,
      },
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`WhatsApp API ${res.status}: ${text.slice(0, 300)}`);
  }
}
