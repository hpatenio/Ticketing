import React, { useEffect, useState } from "react";
import { ITInventory } from "../../../../types";
import { updateAsset } from "../../../../Services/itInventory";
import { Timestamp } from "firebase/firestore";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onDelete: (assetTag: string) => Promise<void>;
  selectedAsset: ITInventory | null;
}

const EMPTY_FORM = {
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

const EditAssetModal: React.FC<Props> = ({
  visible,
  onClose,
  onSuccess,
  onDelete,
  selectedAsset,
}) => {
  const [form, setForm]             = useState(EMPTY_FORM);
  const [loading, setLoading]       = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError]           = useState("");

  useEffect(() => {
    if (selectedAsset) {
      setForm({
        company:      selectedAsset.company,
        serialNumber: selectedAsset.serialNumber,
        model:        selectedAsset.model,
        brand:        selectedAsset.brand,
        status:       selectedAsset.status,
        assigneeId:   selectedAsset.assigneeId,
        assigneeName: selectedAsset.assigneeName,
        category:     selectedAsset.category,
        location:     selectedAsset.location,
        datePurchased: selectedAsset.datePurchased
          ? selectedAsset.datePurchased.toDate().toISOString().split("T")[0]
          : "",
        notes: selectedAsset.notes,
      });
    }
    setError("");
    setConfirmDelete(false);
  }, [selectedAsset, visible]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!form.company || !form.brand) {
      setError("Company and Brand are required.");
      return;
    }
    if (!selectedAsset) return;

    setLoading(true);
    setError("");

    try {
      await updateAsset(selectedAsset.assetTag, {
        ...form,
        datePurchased: form.datePurchased
          ? Timestamp.fromDate(new Date(form.datePurchased))
          : selectedAsset.datePurchased,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    handleConfirmDelete();
  };

  const handleConfirmDelete = async () => {
    if (!selectedAsset) return;
    setDeleting(true);
    try {
      await onDelete(selectedAsset.assetTag);
      onClose();
    } catch (err) {
      setError("Failed to delete asset. Please try again.");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleClose = () => {
    setError("");
    setConfirmDelete(false);
    onClose();
  };

  if (!visible || !selectedAsset) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Edit Asset</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Asset Tag: {selectedAsset.assetTag}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Error */}
        {error && (
          <p className="text-red-500 text-sm mb-4 bg-red-50 px-3 py-2 rounded-md">
            {error}
          </p>
        )}

        {/* Fields */}
        <div className="flex flex-col gap-3">
          <input
            name="company"
            placeholder="Company *"
            value={form.company}
            onChange={handleChange}
            className={inputClass}
          />
          <input
            name="serialNumber"
            placeholder="Serial Number"
            value={form.serialNumber}
            onChange={handleChange}
            className={inputClass}
          />
          <input
            name="brand"
            placeholder="Brand *"
            value={form.brand}
            onChange={handleChange}
            className={inputClass}
          />
          <input
            name="model"
            placeholder="Model"
            value={form.model}
            onChange={handleChange}
            className={inputClass}
          />
          <input
            name="assigneeName"
            placeholder="Assignee Name"
            value={form.assigneeName}
            onChange={handleChange}
            className={inputClass}
          />

          <select
            name="status"
            value={form.status}
            onChange={handleChange}
            className={inputClass}
          >
            <option value="Spare">Spare</option>
            <option value="Deployed">Deployed</option>
            <option value="Defective">Defective</option>
          </select>

          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            className={inputClass}
          >
            <option value="Laptop">Laptop</option>
            <option value="Monitor">Monitor</option>
            <option value="Desktop">Desktop</option>
          </select>

          <select
            name="location"
            value={form.location}
            onChange={handleChange}
            className={inputClass}
          >
            <option value="Unit 1 & 2">Unit 1 & 2</option>
            <option value="Unit 3">Unit 3</option>
            <option value="BDO Makati">BDO Makati</option>
            <option value="Triumph">Triumph</option>
            <option value="WFH">WFH</option>
          </select>

          <input
            name="datePurchased"
            type="date"
            value={form.datePurchased}
            onChange={handleChange}
            className={inputClass}
          />

          <textarea
            name="notes"
            placeholder="Notes"
            value={form.notes}
            onChange={handleChange}
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-6">
          {/* Delete — left side */}
          <button
            onClick={handleDeleteClick}
            disabled={deleting || loading}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
              confirmDelete
                ? "bg-red-600 text-white hover:bg-red-700"
                : "text-red-600 border border-red-300 bg-white hover:bg-red-50"
            }`}
          >
            {deleting
              ? "Deleting..."
              : confirmDelete
              ? "Confirm Delete"
              : "Delete Asset"}
          </button>

          {/* Cancel confirm / right side actions */}
          <div className="flex gap-3">
            {confirmDelete && (
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            )}
            {!confirmDelete && (
              <>
                <button
                  onClick={handleClose}
                  className="px-5 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? "Saving..." : "Update Asset"}
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

const inputClass =
  "w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

export default EditAssetModal;
