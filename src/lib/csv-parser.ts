import Papa from "papaparse";
import * as XLSX from "xlsx";

export type ParsedItem = { firstName: string; phone: string; notes: string };

const ALLOWED_EXT = ["csv", "xlsx", "xls"];

function normalizeKey(k: string) {
  return k.toLowerCase().replace(/[\s_-]/g, "");
}

function mapRow(row: Record<string, unknown>): ParsedItem | null {
  const normalized: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    normalized[normalizeKey(k)] = v;
  }
  const firstName = String(normalized["firstname"] ?? "").trim();
  const phoneRaw = normalized["phone"];
  const phone = phoneRaw == null ? "" : String(phoneRaw).trim();
  const notes = String(normalized["notes"] ?? "").trim();
  if (!firstName || !phone) return null;
  return { firstName, phone, notes };
}

export async function parseFile(file: File): Promise<ParsedItem[]> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXT.includes(ext)) {
    throw new Error("Only .csv, .xlsx, and .xls files are allowed.");
  }

  let rawRows: Record<string, unknown>[] = [];

  if (ext === "csv") {
    const text = await file.text();
    const result = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: true,
    });
    if (result.errors.length > 0) {
      throw new Error(`CSV parse error: ${result.errors[0].message}`);
    }
    rawRows = result.data;
  } else {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  }

  if (rawRows.length === 0) throw new Error("File is empty.");

  // Validate headers exist
  const sample = rawRows[0];
  const keys = Object.keys(sample).map(normalizeKey);
  if (!keys.includes("firstname") || !keys.includes("phone")) {
    throw new Error("File must contain 'FirstName' and 'Phone' columns (Notes optional).");
  }

  const items: ParsedItem[] = [];
  for (const row of rawRows) {
    const item = mapRow(row);
    if (item) items.push(item);
  }
  if (items.length === 0) throw new Error("No valid rows found (FirstName and Phone required).");
  return items;
}