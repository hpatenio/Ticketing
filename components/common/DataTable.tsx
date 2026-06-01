import React from "react";
import { Column } from "../../types";

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading: boolean;
  onEdit?: (row: T) => void;
  onDelete?: (id: string) => void;
  showActions?: boolean;
}

const DataTable = <T extends { id: string }>({
  columns,
  data,
  loading,
  onEdit,
  onDelete,
  showActions,
}: DataTableProps<T>) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500 text-sm">No records found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap"
              >
                {col.label}
              </th>
            ))}
            {showActions !== false ? (
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Actions
            </th>
          ) : null}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {data.map((row, index) => (
            <tr
              key={row.id}
              className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
            >
              {columns.map((col) => (
                <td
                  key={String(col.key)}
                  className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap"
                >
                  {col.render
                    ? col.render(row)
                    : String(row[col.key] ?? "-")}
                </td>
              ))}
              {showActions !== false ? (
            <td className="px-4 py-3 text-center whitespace-nowrap">
              {onEdit ? (
                <button
                  onClick={() => onEdit(row)}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors mr-2"
                >
                  Edit
                </button>
              ) : null}
              {onDelete ? (
                <button
                  onClick={() => onDelete(row.id)}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              ) : null}
            </td>
          ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;