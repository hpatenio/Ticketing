import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
} from "react-native";
import { getAllAssets } from "../../../../Services/itInventory";
import { ITInventory } from "../../../../types";
import { useTheme } from "../../../../theme/ThemeContext";

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
  valueColor,
  onPress,
}: {
  label: string;
  value: number | string;
  sub?: string;
  valueColor?: string;
  onPress?: () => void;
}) => {
  const { theme } = useTheme();
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flex: 1,
        backgroundColor: theme.surface,
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 6,
        borderWidth: 1,
        borderColor: theme.border,
      }}
    >
      <Text
        style={{
          fontSize: 10,
          color: theme.subtext,
          marginBottom: 6,
          fontWeight: "500",
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: valueColor ?? theme.text,
          fontSize: 24,
          fontWeight: "700",
        }}
      >
        {value}
      </Text>
      {sub ? (
        <Text style={{ fontSize: 10, color: theme.subtext, marginTop: 4 }}>
          {sub}
        </Text>
      ) : null}
      {onPress && (
        <Text
          style={{
            fontSize: 9,
            color: theme.subtext,
            marginTop: 6,
            opacity: 0.6,
          }}
        >
          Tap to view →
        </Text>
      )}
    </Wrapper>
  );
};

const HorizontalBar = ({
  label,
  count,
  max,
  color,
  animatedWidth,
  onPress,
}: {
  label: string;
  count: number;
  max: number;
  color: string;
  animatedWidth?: Animated.AnimatedInterpolation<string | number> | string;
  onPress?: () => void;
}) => {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.65 : 1}
      style={{ marginBottom: 12 }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 4,
        }}
      >
        <Text style={{ fontSize: 10, color: theme.text, fontWeight: "500" }}>
          {label}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ fontSize: 10, color: theme.subtext }}>{count}</Text>
          {onPress && (
            <Text style={{ fontSize: 9, color: color, opacity: 0.8 }}>→</Text>
          )}
        </View>
      </View>
      <View
        style={{
          height: 8,
          backgroundColor: theme.border,
          borderRadius: 99,
          overflow: "hidden",
        }}
      >
        <Animated.View
          style={{
            width:
              (animatedWidth as any) ??
              (max > 0 ? `${Math.round((count / max) * 100)}%` : "0%"),
            backgroundColor: color,
            height: "100%",
            borderRadius: 99,
          }}
        />
      </View>
    </TouchableOpacity>
  );
};

const StatusBadge = ({
  status,
  count,
  total,
  onPress,
}: {
  status: string;
  count: number;
  total: number;
  onPress?: () => void;
}) => {
  const { theme } = useTheme();

  const configs: Record<string, { bg: string; text: string; dot: string }> = {
    Deployed: {
      bg: theme.mode === "dark" ? "#0f2e1a" : "#f0fdf4",
      text: theme.mode === "dark" ? "#4ade80" : "#15803d",
      dot: "#22c55e",
    },
    Spare: {
      bg: theme.mode === "dark" ? "#0f1e3a" : "#eff6ff",
      text: theme.mode === "dark" ? "#60a5fa" : "#1d4ed8",
      dot: "#3b82f6",
    },
    Defective: {
      bg: theme.mode === "dark" ? "#2e0f0f" : "#fef2f2",
      text: theme.mode === "dark" ? "#f87171" : "#b91c1c",
      dot: "#ef4444",
    },
  };
  const cfg = configs[status] ?? {
    bg: theme.surface,
    text: theme.text,
    dot: theme.subtext,
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flex: 1,
        backgroundColor: cfg.bg,
        borderRadius: 12,
        padding: 12,
        marginHorizontal: 4,
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 99,
          backgroundColor: cfg.dot,
          marginBottom: 8,
        }}
      />
      <Text style={{ color: cfg.text, fontSize: 18, fontWeight: "700" }}>
        {count}
      </Text>
      <Text
        style={{
          color: cfg.text,
          fontSize: 10,
          fontWeight: "500",
          marginTop: 2,
        }}
      >
        {status}
      </Text>
      <Text style={{ fontSize: 10, color: theme.subtext, marginTop: 2 }}>
        {pct(count, total)}%
      </Text>
      <Text style={{ fontSize: 9, color: cfg.dot, marginTop: 6, opacity: 0.8 }}>
        Tap to view →
      </Text>
    </TouchableOpacity>
  );
};

const SectionCard = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => {
  const { theme } = useTheme();
  return (
    <View
      style={{
        backgroundColor: theme.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: theme.border,
      }}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: theme.text,
          marginBottom: 16,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
};

// ─── main component ──────────────────────────────────────────────────────────

export type InventoryFilter = {
  field: "status" | "category" | "location" | "company";
  value: string;
};

type Props = {
  onFilterNavigate: (filter: InventoryFilter | null) => void;
};

const ITInventorySummary: React.FC<Props> = ({ onFilterNavigate }) => {
  const { theme } = useTheme();

  const [data, setData] = useState<ITInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const progressAnims = useRef({
    deployed: new Animated.Value(0),
    spare: new Animated.Value(0),
    defective: new Animated.Value(0),
    categories: [
      new Animated.Value(0),
      new Animated.Value(0),
      new Animated.Value(0),
      new Animated.Value(0),
      new Animated.Value(0),
      new Animated.Value(0),
    ],
    locations: [
      new Animated.Value(0),
      new Animated.Value(0),
      new Animated.Value(0),
      new Animated.Value(0),
      new Animated.Value(0),
    ],
    companies: [new Animated.Value(0), new Animated.Value(0)],
  }).current;
  const initialDataLoaded = useRef(false);

  // ── navigate to IT Inventory with a pre-applied filter ──────────────────────
  const goToInventory = (filter: InventoryFilter | null) => {
    onFilterNavigate(filter);
  };

  const animateWidths = (
    animatedValues: Animated.Value[],
    toPercents: number[],
    duration = 320,
  ) =>
    Animated.parallel(
      animatedValues.map((animatedValue, index) =>
        Animated.timing(animatedValue, {
          toValue: toPercents[index] ?? 0,
          duration,
          useNativeDriver: false,
        }),
      ),
    );

  const animateProgress = (resultData: ITInventory[]) => {
    const total = resultData.length;
    const deployed = countBy(resultData, "status", "Deployed");
    const spare = countBy(resultData, "status", "Spare");
    const defective = countBy(resultData, "status", "Defective");
    const deployedW = pct(deployed, total);
    const spareW = pct(spare, total);
    const defectiveW = pct(defective, total);

    const categoryLabels = [
      "Laptop",
      "Monitor",
      "Desktop",
      "UPS",
      "Network Device",
      "Server",
    ];
    const categoryCounts = categoryLabels.map((label) =>
      countBy(resultData, "category", label),
    );
    const categoryMax = Math.max(...categoryCounts, 1);
    const categoryWidths = categoryCounts.map((count) =>
      Math.round((count / categoryMax) * 100),
    );

    const locationLabels = [
      "Unit 1 & 2",
      "Unit 3",
      "BDO Makati",
      "Triumph",
      "WFH",
    ];
    const locationCounts = locationLabels.map((label) =>
      countBy(resultData, "location", label),
    );
    const locationMax = Math.max(...locationCounts, 1);
    const locationWidths = locationCounts.map((count) =>
      Math.round((count / locationMax) * 100),
    );

    const companyCounts = ["OCG", "SDB"].map((co) => {
      const assets = resultData.filter((d) => d.company === co);
      const depCount = assets.filter((d) => d.status === "Deployed").length;
      return { total: assets.length, deployed: depCount };
    });
    const companyPercents = companyCounts.map((co) =>
      pct(co.deployed, co.total),
    );

    Animated.parallel([
      Animated.timing(progressAnims.deployed, {
        toValue: deployedW,
        duration: 320,
        useNativeDriver: false,
      }),
      Animated.timing(progressAnims.spare, {
        toValue: spareW,
        duration: 320,
        useNativeDriver: false,
      }),
      Animated.timing(progressAnims.defective, {
        toValue: defectiveW,
        duration: 320,
        useNativeDriver: false,
      }),
      animateWidths(progressAnims.categories, categoryWidths),
      animateWidths(progressAnims.locations, locationWidths),
      animateWidths(progressAnims.companies, companyPercents),
    ]).start();
  };

  const fetchData = async (isRefresh = false) => {
    const shouldAnimateRefresh = isRefresh && data.length > 0;

    if (shouldAnimateRefresh) {
      setRefreshing(true);
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start();
    } else {
      setLoading(true);
    }

    setError(false);
    try {
      const result = await getAllAssets();
      setData(result);
      animateProgress(result);
      initialDataLoaded.current = true;
    } catch {
      setError(true);
    } finally {
      if (shouldAnimateRefresh) {
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }).start(() => setRefreshing(false));
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 64,
        }}
      >
        <ActivityIndicator size="large" color={theme.iconActive} />
        <Text style={{ fontSize: 10, color: theme.subtext, marginTop: 12 }}>
          Loading summary...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 64,
        }}
      >
        <Text style={{ fontSize: 13, color: "#ef4444", marginBottom: 12 }}>
          Failed to load data.
        </Text>
        <TouchableOpacity
          onPress={() => fetchData(false)}
          style={{
            backgroundColor: theme.iconActive,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: "#ffffff", fontSize: 10, fontWeight: "600" }}>
            Retry
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const total = data.length;
  const deployed = countBy(data, "status", "Deployed");
  const spare = countBy(data, "status", "Spare");
  const defective = countBy(data, "status", "Defective");

  const categories = [
    { label: "Laptop", color: "#f97316" },
    { label: "Monitor", color: "#eab308" },
    { label: "Desktop", color: "#6366f1" },
    { label: "UPS", color: "#06b6d4" },
    { label: "Network Device", color: "#10b981" },
    { label: "Server", color: "#8b5cf6" },
  ].map((c) => ({ ...c, count: countBy(data, "category", c.label) }));
  const catMax = Math.max(...categories.map((c) => c.count));

  const locations = [
    { label: "Unit 1 & 2", color: "#ec4899" },
    { label: "Unit 3", color: "#8b5cf6" },
    { label: "BDO Makati", color: "#14b8a6" },
    { label: "Triumph", color: "#22c55e" },
    { label: "WFH", color: "#06b6d4" },
  ].map((l) => ({ ...l, count: countBy(data, "location", l.label) }));
  const locMax = Math.max(...locations.map((l) => l.count));

  const companies = ["OCG", "SDB"].map((co) => {
    const assets = data.filter((d) => d.company === co);
    const depCount = assets.filter((d) => d.status === "Deployed").length;
    return { name: co, total: assets.length, deployed: depCount };
  });

  const deployedW = pct(deployed, total);
  const spareW = pct(spare, total);
  const defectiveW = pct(defective, total);

  const companyColors: Record<
    string,
    { bg: string; text: string; bar: string }
  > = {
    OCG: {
      bg: theme.mode === "dark" ? "#0f1e3a" : "#eff6ff",
      text: theme.mode === "dark" ? "#60a5fa" : "#1d4ed8",
      bar: "#3b82f6",
    },
    SDB: {
      bg: theme.mode === "dark" ? "#1e0f3a" : "#f5f3ff",
      text: theme.mode === "dark" ? "#a78bfa" : "#7c3aed",
      bar: "#8b5cf6",
    },
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.background,
        padding: 16,
        paddingBottom: 32,
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <View>
          <Text style={{ fontSize: 15, fontWeight: "700", color: theme.text }}>
            Inventory Summary
          </Text>
          <Text style={{ fontSize: 10, color: theme.subtext, marginTop: 2 }}>
            {total} total assets
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => fetchData(true)}
          style={{
            backgroundColor: theme.bgActive,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 8,
          }}
          disabled={refreshing}
        >
          <Text
            style={{ fontSize: 10, color: theme.subtext, fontWeight: "500" }}
          >
            ↻ Refresh
          </Text>
        </TouchableOpacity>
      </View>

      <Animated.View style={{ opacity: fadeAnim }}>
        {/* Top metric cards */}
        <View
          style={{
            flexDirection: "row",
            marginBottom: 12,
            marginHorizontal: -6,
          }}
        >
          <MetricCard
            label="Total"
            value={total}
            sub="all assets"
            valueColor={theme.text}
            onPress={() => goToInventory(null)}
          />
          <MetricCard
            label="Deployed"
            value={`${pct(deployed, total)}%`}
            sub={`${deployed} units`}
            valueColor="#16a34a"
            onPress={() =>
              goToInventory({ field: "status", value: "Deployed" })
            }
          />
          <MetricCard
            label="Defective"
            value={defective}
            sub={defective === 0 ? "none — great!" : "needs attention"}
            valueColor={defective > 0 ? "#dc2626" : "#16a34a"}
            onPress={() =>
              goToInventory({ field: "status", value: "Defective" })
            }
          />
        </View>

        {/* Status breakdown */}
        <SectionCard title="Status breakdown">
          <View style={{ flexDirection: "row", marginHorizontal: -4 }}>
            <StatusBadge
              status="Deployed"
              count={deployed}
              total={total}
              onPress={() =>
                goToInventory({ field: "status", value: "Deployed" })
              }
            />
            <StatusBadge
              status="Spare"
              count={spare}
              total={total}
              onPress={() => goToInventory({ field: "status", value: "Spare" })}
            />
            <StatusBadge
              status="Defective"
              count={defective}
              total={total}
              onPress={() =>
                goToInventory({ field: "status", value: "Defective" })
              }
            />
          </View>

          {/* Utilization stacked bar */}
          <View style={{ marginTop: 16 }}>
            <Text
              style={{ fontSize: 10, color: theme.subtext, marginBottom: 8 }}
            >
              Utilization rate
            </Text>
            <View
              style={{
                flexDirection: "row",
                overflow: "hidden",
                borderRadius: 99,
                height: 10,
                backgroundColor: theme.border,
              }}
            >
              <Animated.View
                style={{
                  width: progressAnims.deployed.interpolate({
                    inputRange: [0, 100],
                    outputRange: ["0%", "100%"],
                  }),
                  backgroundColor: "#22c55e",
                }}
              />
              <Animated.View
                style={{
                  width: progressAnims.spare.interpolate({
                    inputRange: [0, 100],
                    outputRange: ["0%", "100%"],
                  }),
                  backgroundColor: "#3b82f6",
                }}
              />
              <Animated.View
                style={{
                  width: progressAnims.defective.interpolate({
                    inputRange: [0, 100],
                    outputRange: ["0%", "100%"],
                  }),
                  backgroundColor: "#ef4444",
                }}
              />
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 6,
              }}
            >
              <Text style={{ fontSize: 10, color: theme.subtext }}>
                <Text style={{ color: "#22c55e" }}>●</Text> Deployed {deployedW}
                %
              </Text>
              <Text style={{ fontSize: 10, color: theme.subtext }}>
                <Text style={{ color: "#3b82f6" }}>●</Text> Spare {spareW}%
              </Text>
              <Text style={{ fontSize: 10, color: theme.subtext }}>
                <Text style={{ color: "#ef4444" }}>●</Text> Defective{" "}
                {defectiveW}%
              </Text>
            </View>
          </View>
        </SectionCard>

        {/* Category + Location side by side */}
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
          {/* Category */}
          <View
            style={{
              flex: 1,
              backgroundColor: theme.surface,
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: theme.text,
                marginBottom: 16,
              }}
            >
              By category
            </Text>
            {categories.map((c, index) => (
              <HorizontalBar
                key={c.label}
                label={c.label}
                count={c.count}
                max={catMax}
                color={c.color}
                animatedWidth={progressAnims.categories[index].interpolate({
                  inputRange: [0, 100],
                  outputRange: ["0%", "100%"],
                })}
                onPress={() =>
                  goToInventory({ field: "category", value: c.label })
                }
              />
            ))}
          </View>

          {/* Location */}
          <View
            style={{
              flex: 1,
              backgroundColor: theme.surface,
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: theme.text,
                marginBottom: 16,
              }}
            >
              By location
            </Text>
            {locations.map((l, index) => (
              <HorizontalBar
                key={l.label}
                label={l.label}
                count={l.count}
                max={locMax}
                color={l.color}
                animatedWidth={progressAnims.locations[index].interpolate({
                  inputRange: [0, 100],
                  outputRange: ["0%", "100%"],
                })}
                onPress={() =>
                  goToInventory({ field: "location", value: l.label })
                }
              />
            ))}
          </View>
        </View>

        {/* Company split */}
        <SectionCard title="Company split">
          {companies.map((co, i) => {
            const colors = companyColors[co.name] ?? {
              bg: theme.bgActive,
              text: theme.text,
              bar: theme.iconActive,
            };
            return (
              <TouchableOpacity
                key={co.name}
                onPress={() =>
                  goToInventory({ field: "company", value: co.name })
                }
                activeOpacity={0.7}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 12,
                  borderBottomWidth: i < companies.length - 1 ? 1 : 0,
                  borderBottomColor: theme.border,
                }}
              >
                {/* Company pill */}
                <View
                  style={{
                    backgroundColor: colors.bg,
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderRadius: 6,
                    marginRight: 12,
                  }}
                >
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 10,
                      fontWeight: "700",
                    }}
                  >
                    {co.name}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, color: theme.subtext }}>
                    {co.total} assets · {co.deployed} deployed
                  </Text>
                  <View
                    style={{
                      marginTop: 6,
                      height: 6,
                      borderRadius: 99,
                      overflow: "hidden",
                      backgroundColor: theme.border,
                    }}
                  >
                    <Animated.View
                      style={{
                        width: progressAnims.companies[i].interpolate({
                          inputRange: [0, 100],
                          outputRange: ["0%", "100%"],
                        }),
                        backgroundColor: colors.bar,
                        height: "100%",
                        borderRadius: 99,
                      }}
                    />
                  </View>
                </View>

                <Text
                  style={{
                    color: colors.text,
                    fontSize: 13,
                    fontWeight: "700",
                    marginLeft: 12,
                  }}
                >
                  {pct(co.deployed, co.total)}%
                </Text>

                <Text
                  style={{
                    fontSize: 10,
                    color: colors.bar,
                    marginLeft: 8,
                    opacity: 0.8,
                  }}
                >
                  →
                </Text>
              </TouchableOpacity>
            );
          })}
        </SectionCard>
      </Animated.View>
    </View>
  );
};

export default ITInventorySummary;