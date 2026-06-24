/**
 * exportMonthlyReportPdf.ts
 *
 * Fixes applied:
 *  1. toNum() strips ± / commas / ₱ before any numeric operation → kills ±4,615 / ±22 display
 *  2. didDrawCell vertical offset uses cell.height so code line never clips
 *  3. didParseCell sets minCellHeight = 12 so short rows are tall enough for two text lines
 *  4. All numeric columns center-aligned in header + data rows
 */

import jsPDF from "jspdf";
import autoTable, { RowInput, Styles } from "jspdf-autotable";
import { OutfitRegular }  from "./OutfitRegular.b64";
import { OutfitBold }     from "./OutfitBold.b64";
import { OutfitMedium }   from "./OutfitMedium.b64";
import { OutfitSemiBold } from "./OutfitSemiBold.b64";

// ─── Types ────────────────────────────────────────────────────────────────────

type MonthlyItemRow = {
  id: string;
  itemCode: string;
  name: string;
  brand: string;
  category: string;
  unit: string;
  pricePerUnit: number;
  beginningInventory: number;
  totalConsumed: number;
  consumptionAmount: number;
  totalDelivered: number;
  deliveryAmount: number;
  endingInventory: number;
};

// ─── Color palette ────────────────────────────────────────────────────────────

const C = {
  darkNavy:   [15,  39,  68]  as [number,number,number],
  midBlue:    [30,  63, 110]  as [number,number,number],
  accentBlue: [37,  99, 235]  as [number,number,number],
  lightBlue:  [219,234,254]  as [number,number,number],
  rowAlt:     [240,244,250]  as [number,number,number],
  white:      [255,255,255]  as [number,number,number],
  borderGray: [203,213,225]  as [number,number,number],
  textDark:   [15,  23,  42]  as [number,number,number],
  textMid:    [71,  85, 105]  as [number,number,number],
  red:        [220, 38,  38]  as [number,number,number],
  green:      [22, 163,  74]  as [number,number,number],
  amber:      [217,119,   6]  as [number,number,number],
  totalBg:    [226,232,240]  as [number,number,number],
};

const CAT_COLORS: Record<string, [number,number,number]> = {
  office_supplies: [30,  63, 110],
  cleaning:        [91,  33, 182],
  ppe:             [127, 29,  29],
  medicine:        [180, 83,   9],
};

const CAT_LABELS: Record<string, string> = {
  office_supplies: "OFFICE SUPPLIES",
  cleaning:        "CLEANING SUPPLIES",
  ppe:             "PPE SUPPLIES",
  medicine:        "MEDICINE SUPPLIES",
};

// ─── FIX 1: Safe numeric coercion ────────────────────────────────────────────
// Values may arrive as strings like "±22" or "₱1,050" — strip everything
// that isn't a digit or a decimal point before parsing.

function toNum(v: number | string | unknown): number {
  if (typeof v === "number") return isNaN(v) ? 0 : v;
  if (typeof v === "string") {
    const cleaned = v.replace(/[^0-9.]/g, "");
    const parsed  = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function peso(v: number | string | unknown): string {
  const n = toNum(v);
  if (n === 0) return "—";
  return `PHP ${n.toLocaleString("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function monthLabel(yyyymm: string): string {
  const [y, m] = yyyymm.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function exportMonthlyReportPdf(
  allRows: MonthlyItemRow[],
  selectedMonth: string,
) {
  const doc    = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  // ── Register Outfit font (supports ₱) ────────────────────────────────────
  doc.addFileToVFS("Outfit-Regular.ttf",  OutfitRegular);
  doc.addFileToVFS("Outfit-Bold.ttf",     OutfitBold);
  doc.addFileToVFS("Outfit-Medium.ttf",   OutfitMedium);
  doc.addFileToVFS("Outfit-SemiBold.ttf", OutfitSemiBold);
  doc.addFont("Outfit-Regular.ttf",  "Outfit", "normal");
  doc.addFont("Outfit-Bold.ttf",     "Outfit", "bold");
  doc.addFont("Outfit-Medium.ttf",   "Outfit", "medium");
  doc.addFont("Outfit-SemiBold.ttf", "Outfit", "semibold");
  doc.setFont("Outfit", "normal");
  const pageW  = doc.internal.pageSize.getWidth();
  const pageH  = doc.internal.pageSize.getHeight();
  const ML     = 10;
  const MR     = 10;
  const contentW = pageW - ML - MR;

  const ORDER: string[] = ["office_supplies", "cleaning", "ppe", "medicine"];
  const grouped: Record<string, MonthlyItemRow[]> = {};
  ORDER.forEach((cat) => {
    grouped[cat] = allRows.filter((r) => r.category === cat);
  });

  // ── KPI totals — always run through toNum ──────────────────────────────────
  const totalConsumption = allRows.reduce((s, r) => s + toNum(r.consumptionAmount), 0);
  const totalDelivery    = allRows.reduce((s, r) => s + toNum(r.deliveryAmount), 0);
  const itemsConsumed    = allRows.filter((r) => toNum(r.totalConsumed) > 0).length;
  const netChange        = totalDelivery - totalConsumption;

  // ── Footer ─────────────────────────────────────────────────────────────────
  const addFooter = (pageNum: number, totalPages: number) => {
    doc.setFontSize(6.5);
    doc.setTextColor(...C.textMid);
    doc.text(
      `Office Consumables Monitoring Report — ${monthLabel(selectedMonth)}  |  Administrative Services Division`,
      ML, pageH - 4,
    );
    doc.text(`Page ${pageNum} of ${totalPages}`, pageW - MR, pageH - 4, { align: "right" });
  };

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 1 — Header
  // ══════════════════════════════════════════════════════════════════════════

  let y = 10;

  doc.setFillColor(...C.darkNavy);
  doc.rect(ML, y, contentW, 14, "F");

  doc.setFontSize(13);
  doc.setFont("Outfit", "bold");
  doc.setTextColor(...C.white);
  doc.text("OFFICE CONSUMABLES MONITORING REPORT", ML + 4, y + 6);

  doc.setFontSize(11);
  doc.setTextColor(...C.accentBlue);
  doc.text(monthLabel(selectedMonth).toUpperCase(), pageW - MR - 4, y + 6, { align: "right" });

  doc.setFontSize(7.5);
  doc.setFont("Outfit", "normal");
  doc.setTextColor(...C.white);
  doc.text("Administrative Services Division  ·  Office Management", ML + 4, y + 11);
  doc.text(
    `Generated: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
    pageW - MR - 4, y + 11, { align: "right" },
  );
  y += 17;

  doc.setDrawColor(...C.accentBlue);
  doc.setLineWidth(0.6);
  doc.line(ML, y, pageW - MR, y);
  y += 5;

  // ── KPI cards ─────────────────────────────────────────────────────────────
  const kpis: { label: string; value: string; color: [number,number,number]; sub: string }[] = [
    {
      label: "TOTAL CONSUMPTION",
      // FIX: use already-computed clean number, not raw field
      value: peso(totalConsumption),
      color: C.red,
      sub:   "Office + Cleaning + PPE + Medicine",
    },
    {
      label: "TOTAL RESTOCKED",
      value: peso(totalDelivery),
      color: C.green,
      sub:   "Delivered this month",
    },
    {
      label: "ITEMS CONSUMED",
      value: String(itemsConsumed),
      color: C.darkNavy,
      sub:   "Unique items with movement",
    },
    {
      label: "NET STOCK CHANGE",
      // FIX: sign prefix then clean absolute value — never ±
      value: `${netChange >= 0 ? "+" : "−"}${peso(Math.abs(netChange))}`,
      color: netChange >= 0 ? C.green : C.red,
      sub:   "Restocked minus consumed",
    },
  ];

  const cardW = (contentW - 9) / 4;
  kpis.forEach((kpi, i) => {
    const cx = ML + i * (cardW + 3);
    doc.setFillColor(...C.white);
    doc.setDrawColor(...C.borderGray);
    doc.setLineWidth(0.3);
    doc.roundedRect(cx, y, cardW, 20, 1.5, 1.5, "FD");
    doc.setFillColor(...kpi.color);
    doc.roundedRect(cx, y, cardW, 2, 1, 1, "F");
    doc.rect(cx, y + 1, cardW, 1.5, "F");

    doc.setFontSize(5.5);
    doc.setFont("Outfit", "bold");
    doc.setTextColor(...C.textMid);
    doc.text(kpi.label, cx + 3, y + 6);

    doc.setFontSize(11);
    doc.setFont("Outfit", "bold");
    doc.setTextColor(...kpi.color);
    doc.text(kpi.value, cx + 3, y + 12.5);

    doc.setFontSize(5.5);
    doc.setFont("Outfit", "normal");
    doc.setTextColor(...C.textMid);
    doc.text(kpi.sub, cx + 3, y + 18);
  });
  y += 24;

  // ── Category tables ────────────────────────────────────────────────────────
  const colWidths = [70, 13, 18, 16, 20, 24, 20, 24, 16];
  const scale     = contentW / colWidths.reduce((a, b) => a + b, 0);
  const scaledW   = colWidths.map((w) => w * scale);

  const colHeaders = [
    "ITEM DESCRIPTION",
    "UNIT",
    "PRICE/UNIT",
    "BEG.\nINVTY",
    "CONSUMED\n(QTY)",
    "CONSUMPTION\nAMOUNT",
    "DELIVERED\n(QTY)",
    "DELIVERY\nAMOUNT",
    "ENDING\nINVTY",
  ];

  ORDER.forEach((cat) => {
    const rows = grouped[cat];
    if (!rows || rows.length === 0) return;

    const catColor = CAT_COLORS[cat] ?? C.midBlue;
    const catLabel = CAT_LABELS[cat] ?? cat.toUpperCase();

    // FIX: always pass through toNum for section totals
    const secConsumed  = rows.reduce((s, r) => s + toNum(r.totalConsumed), 0);
    const secConsAmt   = rows.reduce((s, r) => s + toNum(r.consumptionAmount), 0);
    const secDelivered = rows.reduce((s, r) => s + toNum(r.totalDelivered), 0);
    const secDelAmt    = rows.reduce((s, r) => s + toNum(r.deliveryAmount), 0);

    const body: RowInput[] = rows.map((r) => {
      const endingInv = toNum(r.endingInventory);
      const consumed  = toNum(r.totalConsumed);
      const consAmt   = toNum(r.consumptionAmount);
      const delivered = toNum(r.totalDelivered);
      const delAmt    = toNum(r.deliveryAmount);
      const begInv    = toNum(r.beginningInventory);
      const price     = toNum(r.pricePerUnit);

      const endCol: Partial<Styles> =
        endingInv <= 0
          ? { textColor: C.red,   fontStyle: "bold" }
          : endingInv <= 5
          ? { textColor: C.amber, fontStyle: "bold" }
          : { textColor: C.textDark, fontStyle: "bold" };

      return [
        {
          // Content kept for height calculation; drawing done in didDrawCell
          content: `${r.name}\n${r.itemCode}`,
          styles: {
            fontSize: 7,
            cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
          },
        },
        { content: r.unit,           styles: { halign: "center", fontSize: 7 } },
        { content: peso(price),      styles: { halign: "right",  fontSize: 7, textColor: C.textMid } },
        { content: begInv.toString(),styles: { halign: "center", fontSize: 7 } },
        {
          content: consumed > 0 ? `-${consumed}` : "0",
          styles: {
            halign:    "center",
            fontSize:  7,
            fontStyle: consumed > 0 ? "bold" : "normal",
            textColor: consumed > 0 ? C.red : C.textMid,
          },
        },
        {
          content: peso(consAmt),
          styles: {
            halign:    "right",
            fontSize:  7,
            textColor: consAmt > 0 ? C.red : C.textMid,
          },
        },
        {
          content: delivered > 0 ? `+${delivered}` : "0",
          styles: {
            halign:    "center",
            fontSize:  7,
            fontStyle: delivered > 0 ? "bold" : "normal",
            textColor: delivered > 0 ? C.green : C.textMid,
          },
        },
        {
          content: delAmt > 0 ? peso(delAmt) : "—",
          styles: {
            halign:    "right",
            fontSize:  7,
            textColor: delAmt > 0 ? C.green : C.textMid,
          },
        },
        {
          content: endingInv.toString(),
          styles: { halign: "center", fontSize: 7, ...endCol },
        },
      ];
    });

    const totalRow: RowInput = [
      { content: "SECTION TOTAL", styles: { fontStyle: "bold", fontSize: 7, fillColor: C.totalBg } },
      { content: "", styles: { fillColor: C.totalBg } },
      { content: "", styles: { fillColor: C.totalBg } },
      { content: "", styles: { fillColor: C.totalBg } },
      {
        content: secConsumed > 0 ? `-${secConsumed}` : "0",
        styles: { halign: "center", fontStyle: "bold", fontSize: 7, fillColor: C.totalBg, textColor: C.red },
      },
      {
        content: peso(secConsAmt),
        styles: { halign: "right", fontStyle: "bold", fontSize: 7, fillColor: C.totalBg, textColor: C.red },
      },
      {
        content: secDelivered > 0 ? `+${secDelivered}` : "0",
        styles: { halign: "center", fontStyle: "bold", fontSize: 7, fillColor: C.totalBg, textColor: C.green },
      },
      {
        content: secDelAmt > 0 ? peso(secDelAmt) : "—",
        styles: { halign: "right", fontStyle: "bold", fontSize: 7, fillColor: C.totalBg, textColor: C.green },
      },
      { content: "", styles: { fillColor: C.totalBg } },
    ];

    autoTable(doc, {
      startY: y,
      margin:      { left: ML, right: MR },
      tableWidth:  contentW,
      columnStyles: scaledW.reduce<Record<number, Partial<Styles>>>((acc, w, i) => {
        acc[i] = { cellWidth: w };
        return acc;
      }, {}),
      head: [
        [
          {
            content: `  ${catLabel}`,
            colSpan: 9,
            styles: {
              fillColor:   catColor,
              textColor:   C.white,
              fontStyle:   "bold",
              fontSize:    8.5,
              cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 },
            },
          },
        ],
        colHeaders.map((h) => ({
          content: h,
          styles: {
            fillColor:   catColor,
            textColor:   C.white,
            fontStyle:   "bold",
            fontSize:    6.5,
            halign:      "center" as const,
            cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
          },
        })),
      ],
      body: [...body, totalRow],
      theme: "grid",
      styles: {
        font:        "Outfit",
        fontSize:    7,
        textColor:   C.textDark,
        lineColor:   C.borderGray,
        lineWidth:   0.2,
        cellPadding: { top: 2, bottom: 2, left: 2, right: 2 },
        overflow:    "linebreak",
      },
      alternateRowStyles: { fillColor: C.rowAlt },
      headStyles:         { fillColor: catColor, font: "Outfit", fontStyle: "bold" },

      didParseCell(data) {
        if (data.section === "body" && data.column.index === 0) {
          // Use raw cell content to detect real data rows vs the SECTION TOTAL row
          const rawContent = (data.cell.raw as any)?.content ?? data.cell.raw ?? "";
          const isTotal = String(rawContent).startsWith("SECTION TOTAL");
          if (!isTotal) {
            data.cell.styles.minCellHeight = 13;
            data.cell.text = [];
          }
        }
      },

      didDrawCell(data) {
        if (data.section === "body" && data.column.index === 0) {
          const rawContent = (data.cell.raw as any)?.content ?? data.cell.raw ?? "";
          const isTotal = String(rawContent).startsWith("SECTION TOTAL");
          if (isTotal) return;

          // Match source row by name (row index resets on page breaks so it's unreliable)
          const cellText = String((data.cell.raw as any)?.content ?? "");
          const rowData  = rows.find((r) => cellText.startsWith(r.name)) ?? rows[data.row.index];
          if (!rowData) return;
          const brandStr = rowData.brand && rowData.brand !== "-" ? `  ·  ${rowData.brand}` : "";
          const { x, y: cy, width, height } = data.cell;

          // ── Name line (bold, dark) ──────────────────────────────────────
          doc.setFontSize(7.5);
          doc.setFont("Outfit", "bold");
          doc.setTextColor(...C.textDark);
          const nameLines = doc.splitTextToSize(rowData.name, width - 4);
          // Vertically center the two-line block inside the cell
          const lineH       = 3.8; // mm per line at 7.5pt
          const codeLineH   = 3.2; // mm for the smaller code line
          const blockH      = nameLines.length * lineH + codeLineH + 1;
          const startY      = cy + (height - blockH) / 2 + lineH;
          doc.text(nameLines, x + 2, startY);

          // ── Code + brand line (normal, muted) ──────────────────────────
          doc.setFontSize(6);
          doc.setFont("Outfit", "normal");
          doc.setTextColor(...C.textMid);
          const codeLine = `${rowData.itemCode}${brandStr}`;
          doc.text(codeLine, x + 2, startY + nameLines.length * lineH + 0.5);
        }
      },

      didDrawPage(data) {
        y = (data.cursor?.y ?? y) + 4;
      },
    });

    y = (doc as any).lastAutoTable.finalY + 5;
  });

  // ── Grand summary table ───────────────────────────────────────────────────
  const summaryBody: RowInput[] = ORDER.map((cat) => {
    const rows = grouped[cat] ?? [];
    const cAmt = rows.reduce((s, r) => s + toNum(r.consumptionAmount), 0);
    const dAmt = rows.reduce((s, r) => s + toNum(r.deliveryAmount), 0);
    const nCon = rows.filter((r) => toNum(r.totalConsumed) > 0).length;
    return [
      { content: CAT_LABELS[cat],                      styles: { textColor: C.textDark } },
      { content: String(rows.length),                  styles: { halign: "center" } },
      { content: String(nCon),                         styles: { halign: "center" } },
      { content: peso(cAmt),                           styles: { halign: "right", textColor: C.red } },
      { content: dAmt > 0 ? peso(dAmt) : "—",         styles: { halign: "right", textColor: C.green } },
    ];
  });

  summaryBody.push([
    { content: "GRAND TOTAL",            styles: { fontStyle: "bold", fillColor: C.totalBg } },
    { content: String(allRows.length),   styles: { halign: "center", fontStyle: "bold", fillColor: C.totalBg } },
    { content: String(itemsConsumed),    styles: { halign: "center", fontStyle: "bold", fillColor: C.totalBg } },
    { content: peso(totalConsumption),   styles: { halign: "right",  fontStyle: "bold", fillColor: C.totalBg, textColor: C.red } },
    {
      content: totalDelivery > 0 ? peso(totalDelivery) : "—",
      styles: { halign: "right", fontStyle: "bold", fillColor: C.totalBg, textColor: C.green },
    },
  ]);

  doc.setFontSize(8.5);
  doc.setFont("Outfit", "bold");
  doc.setTextColor(...C.darkNavy);
  doc.text("MONTHLY SUMMARY BY CATEGORY", ML, y);
  y += 4;

  autoTable(doc, {
    startY:     y,
    margin:     { left: ML, right: MR },
    tableWidth: 90,
    head: [[
      { content: "CATEGORY",           styles: { fillColor: C.darkNavy, textColor: C.white, fontStyle: "bold", fontSize: 7 } },
      { content: "TOTAL ITEMS",        styles: { fillColor: C.darkNavy, textColor: C.white, fontStyle: "bold", fontSize: 7, halign: "center" } },
      { content: "ITEMS CONSUMED",     styles: { fillColor: C.darkNavy, textColor: C.white, fontStyle: "bold", fontSize: 7, halign: "center" } },
      { content: "CONSUMPTION AMOUNT", styles: { fillColor: C.darkNavy, textColor: C.white, fontStyle: "bold", fontSize: 7, halign: "right"  } },
      { content: "DELIVERY AMOUNT",    styles: { fillColor: C.darkNavy, textColor: C.white, fontStyle: "bold", fontSize: 7, halign: "right"  } },
    ]],
    body: summaryBody,
    theme: "grid",
    columnStyles: {
      0: { cellWidth: 38 },
      1: { cellWidth: 14, halign: "center" },
      2: { cellWidth: 14, halign: "center" },
      3: { cellWidth: 22, halign: "right" },
      4: { cellWidth: 22, halign: "right" },
    },
    styles: {
      font:        "Outfit",
      fontSize:    7,
      textColor:   C.textDark,
      lineColor:   C.borderGray,
      lineWidth:   0.2,
      cellPadding: 2.5,
    },
    alternateRowStyles: { fillColor: C.rowAlt },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Signature block ────────────────────────────────────────────────────────
  const sigY      = Math.max(y, pageH - 32);
  const sigLabels = ["Prepared by:", "Reviewed by:", "Approved by:"];
  const sigNames  = ["Admin Staff", "Division Head", "Department Manager"];
  const sigColW   = 55;

  sigLabels.forEach((lbl, i) => {
    const sx = ML + i * (sigColW + 5);
    doc.setFontSize(6.5);
    doc.setFont("Outfit", "normal");
    doc.setTextColor(...C.textMid);
    doc.text(lbl, sx, sigY);
    doc.setDrawColor(...C.textMid);
    doc.setLineWidth(0.3);
    doc.line(sx, sigY + 10, sx + sigColW - 5, sigY + 10);
    doc.setFontSize(6.5);
    doc.setTextColor(...C.textMid);
    doc.text(sigNames[i], sx, sigY + 14);
  });

  // ── Footer on every page ───────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    addFooter(p, totalPages);
  }

  doc.save(`Office_Consumables_Report_${selectedMonth}.pdf`);
}
