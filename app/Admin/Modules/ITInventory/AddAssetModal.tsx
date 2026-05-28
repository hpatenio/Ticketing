import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { ITInventory } from "../../../../types";
import { addAsset } from "../../../../Services/itInventory";
import { useEmployees } from "../../../../hooks/useEmployees";
import { Timestamp } from "firebase/firestore";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const EMPTY_SINGLE = {
  assetTag: "",
  company: "",
  serialNumber: "",
  model: "",
  brand: "",
  status: "Spare" as ITInventory["status"],
  assigneeId: "",
  assigneeName: "",
  category: "Laptop" as ITInventory["category"],
  location: "Unit 1 & 2" as ITInventory["location"],
  datePurchased: "",
  notes: "",
};

interface BulkRow {
  id: number;
  assetTag: string;
  company: string;
  serialNumber: string;
  model: string;
  brand: string;
  category: ITInventory["category"];
  status: ITInventory["status"];
  assigneeId: string;
  assigneeName: string;
  location: ITInventory["location"];
  datePurchased: string;
  notes: string;
}

const EMPTY_ROW = (id: number): BulkRow => ({
  id,
  assetTag: "",
  company: "",
  serialNumber: "",
  model: "",
  brand: "",
  category: "Laptop",
  status: "Spare",
  assigneeId: "",
  assigneeName: "",
  location: "Unit 1 & 2",
  datePurchased: "",
  notes: "",
});

// Maps flexible column header names from Excel → our field keys
const HEADER_MAP: Record<string, keyof BulkRow> = {
  "asset tag":      "assetTag",
  "assettag":       "assetTag",
  "tag":            "assetTag",
  "asset":          "assetTag",
  "company":        "company",
  "serial number":  "serialNumber",
  "serialnumber":   "serialNumber",
  "serial":         "serialNumber",
  "model":          "model",
  "brand":          "brand",
  "category":       "category",
  "type":           "category",
  "status":         "status",
  "assignee":       "assigneeName",
  "assigneename":   "assigneeName",
  "location":       "location",
  "date purchased": "datePurchased",
  "datepurchased":  "datePurchased",
  "purchased":      "datePurchased",
  "notes":          "notes",
};

const VALID_CATEGORIES = ["Laptop", "Monitor", "Desktop"];
const VALID_COMPANIES  = ["OCG", "SDB"];

const normalizeCategory = (val: string): ITInventory["category"] => {
  const match = VALID_CATEGORIES.find(
    (c) => c.toLowerCase() === val?.toString().toLowerCase().trim()
  );
  return (match as ITInventory["category"]) ?? "Laptop";
};

const normalizeCompany = (val: string): string => {
  const match = VALID_COMPANIES.find(
    (c) => c.toLowerCase() === val?.toString().toLowerCase().trim()
  );
  return match ?? val?.toString().trim() ?? "";
};

// ─── component ────────────────────────────────────────────────────────────────

const AddAssetModal: React.FC<Props> = ({ visible, onClose, onSuccess }) => {
  const [tab, setTab] = useState<"single" | "bulk">("single");

  // single
  const [form, setForm]       = useState(EMPTY_SINGLE);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  // bulk
  const [rows, setRows]               = useState<BulkRow[]>([EMPTY_ROW(1)]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError]     = useState("");
  const [bulkSuccess, setBulkSuccess] = useState(0);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { employees } = useEmployees();

  // ── single handlers ──────────────────────────────────────────────────────

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSingleSubmit = async () => {
    if (!form.assetTag || !form.company || !form.brand) {
      setError("Asset Tag, Company, and Brand are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const emp = employees.find((e) => e.id === form.assigneeId);
      await addAsset({
        ...form,
        assigneeName: emp?.name ?? "",
        datePurchased: form.datePurchased
          ? Timestamp.fromDate(new Date(form.datePurchased))
          : Timestamp.now(),
      });
      setForm(EMPTY_SINGLE);
      onSuccess();
      onClose();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── bulk / excel handlers ────────────────────────────────────────────────

  const updateRow = (id: number, field: keyof BulkRow, value: string) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));

  const addRow = () =>
    setRows((prev) => [...prev, EMPTY_ROW(Date.now())]);

  const removeRow = (id: number) =>
    setRows((prev) => prev.filter((r) => r.id !== id));



  // Parse uploaded .xlsx / .xls / .csv file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkError("");
    setParseWarnings([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data  = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb    = XLSX.read(data, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
          defval: "",
        });

        if (json.length === 0) {
          setBulkError("The file appears to be empty or has no data rows.");
          return;
        }

        const warnings: string[] = [];

        const parsed: BulkRow[] = json.map((raw, i) => {
          // Normalize headers
          const normalized: Record<string, string> = {};
          for (const key of Object.keys(raw)) {
            const mapped = HEADER_MAP[key.toLowerCase().trim()];
            if (mapped) {
              const val = String(raw[key]).trim();
              if (val) normalized[mapped] = val; // only add if not empty
            }
          }

          if (!normalized.assetTag) {
            warnings.push(`Row ${i + 2}: Missing Asset Tag`);
          }
          if (!normalized.brand) {
            warnings.push(`Row ${i + 2}: Missing Brand`);
          }
          if (!normalized.company) {
            warnings.push(`Row ${i + 2}: Missing Company`);
          }

          return {
            id:            Date.now() + i,
            assetTag:      normalized.assetTag ?? "",
            brand:         normalized.brand ?? "",
            model:         normalized.model ?? "",
            serialNumber:  normalized.serialNumber ?? "",
            category:      normalizeCategory(normalized.category ?? ""),
            company:       normalizeCompany(normalized.company ?? ""),
            status:        (normalized.status as ITInventory["status"]) ?? "Spare",
            assigneeName:  normalized.assigneeName ?? "",
            assigneeId:    normalized.assigneeId ?? "",
            location:      (normalized.location as ITInventory["location"]) ?? "Unit 1 & 2",
            datePurchased: normalized.datePurchased ?? "",
            notes:         normalized.notes ?? "",
          };
        });

        setParseWarnings(warnings);
        setRows(parsed);
      } catch {
        setBulkError("Could not read the file. Make sure it's a valid .xlsx or .csv.");
      }
    };
    reader.readAsArrayBuffer(file);

    // Reset input so same file can be re-uploaded
    e.target.value = "";
  };

  const handleBulkSubmit = async () => {
    const invalid = rows.find((r) => !r.assetTag || !r.brand || !r.company);
    if (invalid) {
      setBulkError("Every row needs Asset Tag, Brand, and Company.");
      return;
    }
    setBulkLoading(true);
    setBulkError("");
    setBulkSuccess(0);
    try {
      await Promise.all(
        rows.map((r) => {
          // Build assignee name if not provided (try to find from employees list)
          const assignee = employees.find((e) => e.id === r.assigneeId);
          const finalAssigneeName = r.assigneeName || assignee?.name || "";

          return addAsset({
            assetTag:      r.assetTag,
            company:       r.company,
            serialNumber:  r.serialNumber,
            model:         r.model,
            brand:         r.brand,
            category:      r.category,
            status:        r.status,
            assigneeId:    r.assigneeId,
            assigneeName:  finalAssigneeName,
            location:      r.location,
            notes:         r.notes,
            datePurchased: r.datePurchased
              ? Timestamp.fromDate(new Date(r.datePurchased))
              : Timestamp.now(),
          });
        })
      );
      setBulkSuccess(rows.length);
      setRows([EMPTY_ROW(1)]);
      onSuccess();
      setTimeout(onClose, 900);
    } catch {
      setBulkError("Something went wrong. Please try again.");
    } finally {
      setBulkLoading(false);
    }
  };

  // ── close / reset ────────────────────────────────────────────────────────

  const handleClose = () => {
    setForm(EMPTY_SINGLE);
    setError("");
    setRows([EMPTY_ROW(1)]);
    setBulkError("");
    setBulkSuccess(0);
    setParseWarnings([]);
    onClose();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className={`bg-white rounded-xl shadow-xl w-full overflow-y-auto p-6 transition-all
          ${tab === "bulk" ? "max-w-5xl max-h-[95vh]" : "max-w-lg max-h-[90vh]"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-semibold text-gray-800">Add Asset</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold transition-colors">
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-lg w-fit">
          {(["single", "bulk"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors capitalize
                ${tab === t ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              {t === "bulk" ? "Bulk Add" : "Single"}
            </button>
          ))}
        </div>

        {/* ── SINGLE TAB ── */}
        {tab === "single" && (
          <>
            {error && (
              <p className="text-red-500 text-sm mb-4 bg-red-50 px-3 py-2 rounded-md">{error}</p>
            )}
            <div className="flex flex-col gap-3">
              <input name="assetTag" placeholder="Asset Tag *" value={form.assetTag} onChange={handleChange} className={inputClass} />
              <select name="company" value={form.company} onChange={handleChange} className={inputClass}>
                <option value="">Select Company *</option>
                <option value="OCG">OCG</option>
                <option value="SDB">SDB</option>
              </select>
              <input name="serialNumber" placeholder="Serial Number" value={form.serialNumber} onChange={handleChange} className={inputClass} />
              <input name="brand" placeholder="Brand *" value={form.brand} onChange={handleChange} className={inputClass} />
              <input name="model" placeholder="Model" value={form.model} onChange={handleChange} className={inputClass} />
              <select name="assigneeId" value={form.assigneeId} onChange={handleChange} className={inputClass}>
                <option value="">Select Assignee</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <select name="status" value={form.status} onChange={handleChange} className={inputClass}>
                <option value="Spare">Spare</option>
                <option value="Deployed">Deployed</option>
                <option value="Defective">Defective</option>
              </select>
              <select name="category" value={form.category} onChange={handleChange} className={inputClass}>
                <option value="Laptop">Laptop</option>
                <option value="Monitor">Monitor</option>
                <option value="Desktop">Desktop</option>
              </select>
              <select name="location" value={form.location} onChange={handleChange} className={inputClass}>
                <option value="Unit 1 & 2">Unit 1 & 2</option>
                <option value="Unit 3">Unit 3</option>
                <option value="BDO Makati">BDO Makati</option>
                <option value="Triumph">Triumph</option>
                <option value="WFH">WFH</option>
              </select>
              <input name="datePurchased" type="date" value={form.datePurchased} onChange={handleChange} className={inputClass} />
              <textarea name="notes" placeholder="Notes" value={form.notes} onChange={handleChange} rows={3} className={`${inputClass} resize-none`} />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={handleClose} className={cancelBtn}>Cancel</button>
              <button onClick={handleSingleSubmit} disabled={loading} className={primaryBtn}>
                {loading ? "Saving..." : "Add Asset"}
              </button>
            </div>
          </>
        )}

        {/* ── BULK TAB ── */}
        {tab === "bulk" && (
          <>
            {/* Upload strip */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
              >
                <span>📂</span> Upload Excel / CSV
              </button>
              <a
                href="data:text/csv;charset=utf-8,Asset Tag,Company,Serial Number,Model,Brand,Category,Status,Assignee,Location,Date Purchased,Notes%0AOCG-001,OCG,SN12345,ThinkPad X1,Lenovo,Laptop,Deployed,John Doe,Unit 1 & 2,2024-01-15,In working condition"
                download="it_inventory_template.csv"
                className="text-xs text-blue-500 hover:text-blue-700 underline transition-colors"
              >
                Download template
              </a>
              <span className="text-xs text-gray-400 ml-auto">
                Columns: Asset Tag, Company, Serial Number, Model, Brand, Category, Status, Assignee, Location, Date Purchased, Notes
              </span>
            </div>

            {/* Parse warnings */}
            {parseWarnings.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 mb-3">
                <p className="text-xs font-semibold text-yellow-700 mb-1">⚠ Import warnings</p>
                {parseWarnings.slice(0, 5).map((w, i) => (
                  <p key={i} className="text-xs text-yellow-600">{w}</p>
                ))}
                {parseWarnings.length > 5 && (
                  <p className="text-xs text-yellow-500 mt-1">…and {parseWarnings.length - 5} more</p>
                )}
              </div>
            )}

            {/* Errors / success */}
            {bulkError && (
              <p className="text-red-500 text-sm mb-3 bg-red-50 px-3 py-2 rounded-md">{bulkError}</p>
            )}
            {bulkSuccess > 0 && (
              <p className="text-green-600 text-sm mb-3 bg-green-50 px-3 py-2 rounded-md">
                ✓ {bulkSuccess} asset{bulkSuccess > 1 ? "s" : ""} saved successfully!
              </p>
            )}

            {/* Table */}
            <div className="overflow-x-auto rounded-lg border border-gray-200 mb-4">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {["#", "Asset Tag *", "Company *", "Serial #", "Model", "Brand *", "Category", "Status", "Assignee", "Location", "Date Purchased", "Notes", ""].map((h) => (
                      <th key={h} className="px-2 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((row, i) => (
                    <tr key={row.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-2 py-1.5 text-xs text-gray-400 w-8">{i + 1}</td>
                      <td className="px-1 py-1"><input placeholder="e.g. OCG-001" value={row.assetTag} onChange={(e) => updateRow(row.id, "assetTag", e.target.value)} className={`${cellInput} w-20 ${!row.assetTag ? "border-red-200 bg-red-50" : ""}`} /></td>
                      <td className="px-1 py-1"><select value={row.company} onChange={(e) => updateRow(row.id, "company", e.target.value)} className={`${cellInput} w-16 ${!row.company ? "border-red-200 bg-red-50" : ""}`}><option value="">—</option><option value="OCG">OCG</option><option value="SDB">SDB</option></select></td>
                      <td className="px-1 py-1"><input placeholder="SN..." value={row.serialNumber} onChange={(e) => updateRow(row.id, "serialNumber", e.target.value)} className={`${cellInput} w-24`} /></td>
                      <td className="px-1 py-1"><input placeholder="e.g. ThinkPad" value={row.model} onChange={(e) => updateRow(row.id, "model", e.target.value)} className={`${cellInput} w-20`} /></td>
                      <td className="px-1 py-1"><input placeholder="e.g. Lenovo" value={row.brand} onChange={(e) => updateRow(row.id, "brand", e.target.value)} className={`${cellInput} w-20 ${!row.brand ? "border-red-200 bg-red-50" : ""}`} /></td>
                      <td className="px-1 py-1"><select value={row.category} onChange={(e) => updateRow(row.id, "category", e.target.value)} className={`${cellInput} w-20`}><option value="Laptop">Laptop</option><option value="Monitor">Monitor</option><option value="Desktop">Desktop</option></select></td>
                      <td className="px-1 py-1"><select value={row.status} onChange={(e) => updateRow(row.id, "status", e.target.value as ITInventory["status"])} className={`${cellInput} w-20`}><option value="Spare">Spare</option><option value="Deployed">Deployed</option><option value="Defective">Defective</option></select></td>
                      <td className="px-1 py-1"><input placeholder="Name" value={row.assigneeName} onChange={(e) => updateRow(row.id, "assigneeName", e.target.value)} className={`${cellInput} w-24`} /></td>
                      <td className="px-1 py-1"><select value={row.location} onChange={(e) => updateRow(row.id, "location", e.target.value as ITInventory["location"])} className={`${cellInput} w-24`}><option value="Unit 1 & 2">Unit 1 & 2</option><option value="Unit 3">Unit 3</option><option value="BDO Makati">BDO Makati</option><option value="Triumph">Triumph</option><option value="WFH">WFH</option></select></td>
                      <td className="px-1 py-1"><input type="date" value={row.datePurchased} onChange={(e) => updateRow(row.id, "datePurchased", e.target.value)} className={`${cellInput} w-32`} /></td>
                      <td className="px-1 py-1"><input placeholder="Notes..." value={row.notes} onChange={(e) => updateRow(row.id, "notes", e.target.value)} className={`${cellInput} w-32`} /></td>
                      <td className="px-1 py-1.5 text-center">{rows.length > 1 && (<button onClick={() => removeRow(row.id)} className="text-gray-300 hover:text-red-400 transition-colors text-base font-bold">✕</button>)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add row + footer */}
            <button
              onClick={addRow}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium mb-5 transition-colors"
            >
              <span className="text-lg leading-none">+</span> Add Row
            </button>

            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">
                {rows.length} row{rows.length !== 1 ? "s" : ""} · All fields per row · Blank cells will be empty
              </p>
              <div className="flex gap-3">
                <button onClick={handleClose} className={cancelBtn}>Cancel</button>
                <button onClick={handleBulkSubmit} disabled={bulkLoading} className={primaryBtn}>
                  {bulkLoading ? "Saving..." : `Save ${rows.length} Asset${rows.length !== 1 ? "s" : ""}`}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const inputClass =
  "w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
const cellInput =
  "w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white";
const labelClass = "block text-xs font-medium text-gray-600 mb-1";
const cancelBtn =
  "px-5 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors";
const primaryBtn =
  "px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors";

export default AddAssetModal;
