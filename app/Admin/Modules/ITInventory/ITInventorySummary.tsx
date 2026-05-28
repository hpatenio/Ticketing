import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { getAllAssets } from "../../../../Services/itInventory";
import { ITInventory } from "../../../../types";

// ─── helpers ────────────────────────────────────────────────────────────────

const pct = (n: number, total: number) =>
  total === 0 ? 0 : Math.round((n / total) * 100);

const countBy = (data: ITInventory[], key: keyof ITInventory, val: string) =>
  data.filter((d) => d[key] === val).length;

// ─── sub-components ─────────────────────────────────────────────────────────

const MetricCard = ({
  label,
  value,
  sub,
  valueColor = "#1f2937",
}: {
  label: string;
  value: number | string;
  sub?: string;
  valueColor?: string;
}) => (
  <View className="flex-1 bg-white rounded-xl p-4 mx-1.5 shadow-sm border border-gray-100">
    <Text className="text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wide">
      {label}
    </Text>
    <Text style={{ color: valueColor }} className="text-2xl font-bold">
      {value}
    </Text>
    {sub ? (
      <Text className="text-xs text-gray-400 mt-1">{sub}</Text>
    ) : null}
  </View>
);

const HorizontalBar = ({
  label,
  count,
  max,
  color,
}: {
  label: string;
  count: number;
  max: number;
  color: string;
}) => (
  <View className="mb-3">
    <View className="flex-row items-center justify-between mb-1">
      <Text className="text-xs text-gray-600 font-medium">{label}</Text>
      <Text className="text-xs text-gray-400">{count}</Text>
    </View>
    <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <View
        style={{
          width: max > 0 ? `${Math.round((count / max) * 100)}%` : "0%",
          backgroundColor: color,
          height: "100%",
          borderRadius: 99,
        }}
      />
    </View>
  </View>
);

const StatusBadge = ({
  status,
  count,
  total,
}: {
  status: string;
  count: number;
  total: number;
}) => {
  const configs: Record<string, { bg: string; text: string; dot: string }> = {
    Deployed: { bg: "#f0fdf4", text: "#15803d", dot: "#22c55e" },
    Spare:    { bg: "#eff6ff", text: "#1d4ed8", dot: "#3b82f6" },
    Defective:{ bg: "#fef2f2", text: "#b91c1c", dot: "#ef4444" },
  };
  const cfg = configs[status] ?? { bg: "#f9fafb", text: "#374151", dot: "#9ca3af" };

  return (
    <View
      style={{ backgroundColor: cfg.bg }}
      className="flex-1 rounded-xl p-3 mx-1 items-center"
    >
      <View
        style={{ backgroundColor: cfg.dot }}
        className="w-2 h-2 rounded-full mb-2"
      />
      <Text style={{ color: cfg.text }} className="text-lg font-bold">
        {count}
      </Text>
      <Text style={{ color: cfg.text }} className="text-xs font-medium mt-0.5">
        {status}
      </Text>
      <Text className="text-xs text-gray-400 mt-0.5">{pct(count, total)}%</Text>
    </View>
  );
};

const SectionCard = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <View className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100">
    <Text className="text-sm font-semibold text-gray-700 mb-4">{title}</Text>
    {children}
  </View>
);

// ─── main component ──────────────────────────────────────────────────────────

const ITInventorySummary: React.FC = () => {
  const [data, setData]       = useState<ITInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await getAllAssets();
      setData(result);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center py-16">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-xs text-gray-400 mt-3">Loading summary...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center py-16">
        <Text className="text-sm text-red-500 mb-3">Failed to load data.</Text>
        <TouchableOpacity
          onPress={fetchData}
          className="bg-blue-600 px-4 py-2 rounded-lg"
        >
          <Text className="text-white text-xs font-semibold">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const total     = data.length;
  const deployed  = countBy(data, "status", "Deployed");
  const spare     = countBy(data, "status", "Spare");
  const defective = countBy(data, "status", "Defective");

  // categories
  const categories = [
    { label: "Laptop",  color: "#f97316" },
    { label: "Monitor", color: "#eab308" },
    { label: "Desktop", color: "#6366f1" },
  ].map((c) => ({ ...c, count: countBy(data, "category", c.label) }));
  const catMax = Math.max(...categories.map((c) => c.count));

  // locations
  const locations = [
    { label: "Unit 1 & 2", color: "#ec4899" },
    { label: "Unit 3",     color: "#8b5cf6" },
    { label: "BDO Makati", color: "#14b8a6" },
    { label: "Triumph",    color: "#22c55e" },
    { label: "WFH",        color: "#06b6d4" },
  ].map((l) => ({ ...l, count: countBy(data, "location", l.label) }));
  const locMax = Math.max(...locations.map((l) => l.count));

  // companies
  const companies = ["OCG", "SDB"].map((co) => {
    const assets    = data.filter((d) => d.company === co);
    const depCount  = assets.filter((d) => d.status === "Deployed").length;
    return { name: co, total: assets.length, deployed: depCount };
  });

  // utilization bar segments
  const deployedW  = pct(deployed, total);
  const spareW     = pct(spare, total);
  const defectiveW = pct(defective, total);

  return (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between mb-4">
        <View>
          <Text className="text-base font-bold text-gray-800">
            Inventory Summary
          </Text>
          <Text className="text-xs text-gray-400 mt-0.5">
            {total} total assets
          </Text>
        </View>
        <TouchableOpacity
          onPress={fetchData}
          className="bg-gray-100 px-3 py-1.5 rounded-lg"
        >
          <Text className="text-xs text-gray-500 font-medium">↻ Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Top metric cards */}
      <View className="flex-row mb-3 -mx-1.5">
        <MetricCard
          label="Total"
          value={total}
          sub="all assets"
          valueColor="#1f2937"
        />
        <MetricCard
          label="Deployed"
          value={`${pct(deployed, total)}%`}
          sub={`${deployed} units`}
          valueColor="#16a34a"
        />
        <MetricCard
          label="Defective"
          value={defective}
          sub={defective === 0 ? "none — great!" : "needs attention"}
          valueColor={defective > 0 ? "#dc2626" : "#16a34a"}
        />
      </View>

      {/* Status breakdown */}
      <SectionCard title="Status breakdown">
        <View className="flex-row -mx-1">
          <StatusBadge status="Deployed"  count={deployed}  total={total} />
          <StatusBadge status="Spare"     count={spare}     total={total} />
          <StatusBadge status="Defective" count={defective} total={total} />
        </View>

        {/* Utilization stacked bar */}
        <View className="mt-4">
          <Text className="text-xs text-gray-400 mb-2">Utilization rate</Text>
          <View
            className="flex-row overflow-hidden rounded-full"
            style={{ height: 10, backgroundColor: "#f3f4f6" }}
          >
            <View
              style={{ width: `${deployedW}%`, backgroundColor: "#22c55e" }}
            />
            <View
              style={{ width: `${spareW}%`, backgroundColor: "#3b82f6" }}
            />
            <View
              style={{ width: `${defectiveW}%`, backgroundColor: "#ef4444" }}
            />
          </View>
          <View className="flex-row justify-between mt-1.5">
            <Text className="text-xs text-gray-400">
              <Text style={{ color: "#22c55e" }}>●</Text> Deployed {deployedW}%
            </Text>
            <Text className="text-xs text-gray-400">
              <Text style={{ color: "#3b82f6" }}>●</Text> Spare {spareW}%
            </Text>
            <Text className="text-xs text-gray-400">
              <Text style={{ color: "#ef4444" }}>●</Text> Defective {defectiveW}%
            </Text>
          </View>
        </View>
      </SectionCard>

      {/* Category + Location side by side */}
      <View className="flex-row gap-3 mb-3">
        {/* Category */}
        <View className="flex-1 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <Text className="text-sm font-semibold text-gray-700 mb-4">
            By category
          </Text>
          {categories.map((c) => (
            <HorizontalBar
              key={c.label}
              label={c.label}
              count={c.count}
              max={catMax}
              color={c.color}
            />
          ))}
        </View>

        {/* Location */}
        <View className="flex-1 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <Text className="text-sm font-semibold text-gray-700 mb-4">
            By location
          </Text>
          {locations.map((l) => (
            <HorizontalBar
              key={l.label}
              label={l.label}
              count={l.count}
              max={locMax}
              color={l.color}
            />
          ))}
        </View>
      </View>

      {/* Company split */}
      <SectionCard title="Company split">
        {companies.map((co, i) => (
          <View
            key={co.name}
            className={`flex-row items-center py-3 ${
              i < companies.length - 1 ? "border-b border-gray-100" : ""
            }`}
          >
            {/* Company pill */}
            <View
              style={{
                backgroundColor: co.name === "OCG" ? "#eff6ff" : "#f5f3ff",
              }}
              className="px-3 py-1 rounded-md mr-3"
            >
              <Text
                style={{ color: co.name === "OCG" ? "#1d4ed8" : "#7c3aed" }}
                className="text-xs font-bold"
              >
                {co.name}
              </Text>
            </View>

            <View className="flex-1">
              <Text className="text-xs text-gray-400">
                {co.total} assets · {co.deployed} deployed
              </Text>
              {/* mini bar */}
              <View
                className="mt-1.5 h-1.5 rounded-full overflow-hidden"
                style={{ backgroundColor: "#f3f4f6" }}
              >
                <View
                  style={{
                    width: `${pct(co.deployed, co.total)}%`,
                    backgroundColor:
                      co.name === "OCG" ? "#3b82f6" : "#8b5cf6",
                    height: "100%",
                    borderRadius: 99,
                  }}
                />
              </View>
            </View>

            <Text
              style={{ color: co.name === "OCG" ? "#1d4ed8" : "#7c3aed" }}
              className="text-sm font-bold ml-3"
            >
              {pct(co.deployed, co.total)}%
            </Text>
          </View>
        ))}
      </SectionCard>
    </ScrollView>
  );
};

export default ITInventorySummary;
