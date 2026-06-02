import Papa from "papaparse";
import * as XLSX from "xlsx";

export type ParsedItem = { firstName: string; phone: string; notes: string };

const ALLOWED_EXTENSIONS = ["csv", "xlsx", "xls"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_ROWS = 10000;

function normalizeKey(key: string) {
  return key.toLowerCase().replace(/[\s_-]/g, "");
}

function mapRow(row: Record<string, unknown>, rowNumber: number): ParsedItem {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) normalized[normalizeKey(key)] = value;

  const firstName = String(normalized.firstname ?? "").trim();
  const phone = normalized.phone == null ? "" : String(normalized.phone).trim();
  const notes = String(normalized.notes ?? "").trim();

  if (!firstName) throw new Error(`Row ${rowNumber}: FirstName is required.`);
  if (!phone) throw new Error(`Row ${rowNumber}: Phone is required.`);
  if (!/^\+?[\d ()-]{6,25}$/.test(phone)) throw new Error(`Row ${rowNumber}: Phone is invalid.`);
  if (notes.length > 1000)
    throw new Error(`Row ${rowNumber}: Notes cannot exceed 1000 characters.`);
  return { firstName, phone, notes };
}

export async function parseFile(file: File): Promise<ParsedItem[]> {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    throw new Error("Only .csv, .xlsx, and .xls files are allowed.");
  }
  if (file.size > MAX_FILE_SIZE) throw new Error("File size cannot exceed 5 MB.");

  let rows: Record<string, unknown>[] = [];
  if (extension === "csv") {
    const result = Papa.parse<Record<string, unknown>>(await file.text(), {
      header: true,
      skipEmptyLines: "greedy",
    });
    if (result.errors.length) throw new Error(`CSV parse error: ${result.errors[0].message}`);
    rows = result.data;
  } else {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!firstSheet) throw new Error("Workbook does not contain a worksheet.");
    rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" });
  }

  if (!rows.length) throw new Error("File is empty.");
  if (rows.length > MAX_ROWS) throw new Error(`File cannot contain more than ${MAX_ROWS} rows.`);

  const headers = Object.keys(rows[0]).map(normalizeKey);
  if (!headers.includes("firstname") || !headers.includes("phone") || !headers.includes("notes")) {
    throw new Error("File must contain FirstName, Phone, and Notes columns.");
  }

  return rows.map((row, index) => mapRow(row, index + 2));
}
