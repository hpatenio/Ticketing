import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Dimensions,
} from "react-native";
import {
  Search,
  X,
  ChevronRight,
  Clock,
  CheckCircle,
  Circle,
  RefreshCw,
  Package,
  MonitorSmartphone,
} from "lucide-react-native";
import { useTheme } from "../../theme/ThemeContext";
import { ADUser, ConcernTicket, SupplyRequest } from "../../types";
import { getTicketsByRequester } from "../../Services/ticketService";
import { db } from "../../firebase";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
} from "firebase/firestore";

// ─── Unified ticket type ──────────────────────────────────────────────────────

type TicketSource = "it" | "supply";

type UnifiedTicket = {
  _source: TicketSource;
  id: string;
  ticketNumber: string;
  title: string;
  status: string;
  dateCreated: any;
  category: string;
  itTicket?: ConcernTicket;
  supplyRequest?: SupplyRequest;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const toReadableDate = (value: any): string => {
  if (!value) return "—";
  try {
    let date: Date;
    if (value instanceof Timestamp) date = value.toDate();
    else if (typeof value?.toDate === "function") date = value.toDate();
    else if (value instanceof Date) date = value;
    else date = new Date(value);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};

const SUPPLY_STATUS_MAP: Record<string, string> = {
  pending: "Pending",
  awaiting_stock: "In Progress",
  resolved: "Resolved",
  rejected: "Rejected",
};
const normaliseSupplyStatus = (raw: string) => SUPPLY_STATUS_MAP[raw] ?? raw;

// ─── Status / source config ───────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { bg: string; border: string; text: string }
> = {
  Pending: { bg: "#FEF9C3", border: "#FDE047", text: "#A16207" },
  "In Progress": { bg: "#DBEAFE", border: "#93C5FD", text: "#1D4ED8" },
  Resolved: { bg: "#DCFCE7", border: "#86EFAC", text: "#15803D" },
  Rejected: { bg: "#FEE2E2", border: "#FECACA", text: "#DC2626" },
};

const SOURCE_CONFIG: Record<
  TicketSource,
  { bg: string; text: string; label: string }
> = {
  it: { bg: "#EEF2FF", text: "#4338CA", label: "IT" },
  supply: { bg: "#F0FDF4", text: "#15803D", label: "Supply" },
};

// ─── Fetch supply requests ────────────────────────────────────────────────────

async function getSupplyRequestsByUser(
  userId: string,
  userName: string,
): Promise<SupplyRequest[]> {
  // The document stores requestedBy as a DocumentReference (not a string field),
  // so we fetch all and filter client-side by requestedByName or the ref path.
  const snap = await getDocs(collection(db, "supply_requests"));
  return snap.docs
    .map((d) => {
      const data = d.data();
      // Resolve requestedById from the DocumentReference path if present
      const resolvedId =
        data.requestedBy?.path?.split("/").pop() ?? data.requestedById ?? "";
      return { id: d.id, ...data, requestedById: resolvedId } as SupplyRequest;
    })
    .filter(
      (r) => r.requestedById === userId || r.requestedByName === userName,
    );
}

// ─── Merge ────────────────────────────────────────────────────────────────────

function mergeTickets(
  it: ConcernTicket[],
  supply: SupplyRequest[],
): UnifiedTicket[] {
  const itUnified: UnifiedTicket[] = it.map((t) => ({
    _source: "it",
    id: t.id ?? t.ticketNumber,
    ticketNumber: t.ticketNumber,
    title: t.summary,
    status: t.status,
    dateCreated: t.dateCreated,
    category: t.category ?? "IT Concern",
    itTicket: t,
  }));

  const supplyUnified: UnifiedTicket[] = supply.map((r) => ({
    _source: "supply",
    id: r.id,
    ticketNumber: r.ticketNumber,
    title: r.items?.length
      ? r.items.length === 1
        ? r.items[0].itemName
        : `${r.items[0].itemName} +${r.items.length - 1} more`
      : "Supply Request",
    status: normaliseSupplyStatus(r.status),
    dateCreated: r.createdAt,
    category: "Supply",
    supplyRequest: r,
  }));

  const toMs = (v: any): number => {
    if (!v) return 0;
    if (v instanceof Timestamp) return v.toDate().getTime();
    if (typeof v?.toDate === "function") return v.toDate().getTime();
    if (v instanceof Date) return v.getTime();
    const d = new Date(v);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  };

  return [...itUnified, ...supplyUnified].sort(
    (a, b) => toMs(b.dateCreated) - toMs(a.dateCreated),
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status] ?? {
    bg: "#F3F4F6",
    border: "#D1D5DB",
    text: "#6B7280",
  };
  return (
    <View
      style={{
        backgroundColor: c.bg,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 100,
        paddingHorizontal: 9,
        paddingVertical: 3,
      }}
    >
      <Text
        style={{ fontFamily: "Outfit-medium", fontSize: 11, color: c.text }}
      >
        {status}
      </Text>
    </View>
  );
}

// ─── Source Tag ───────────────────────────────────────────────────────────────

function SourceTag({ source }: { source: TicketSource }) {
  const c = SOURCE_CONFIG[source];
  return (
    <View
      style={{
        backgroundColor: c.bg,
        borderRadius: 6,
        paddingHorizontal: 7,
        paddingVertical: 2,
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
      }}
    >
      {source === "it" ? (
        <MonitorSmartphone size={9} color={c.text} />
      ) : (
        <Package size={9} color={c.text} />
      )}
      <Text
        style={{
          fontFamily: "Outfit-medium",
          fontSize: 10,
          color: c.text,
          textTransform: "uppercase",
          letterSpacing: 0.4,
        }}
      >
        {c.label}
      </Text>
    </View>
  );
}

// ─── Ticket Row ───────────────────────────────────────────────────────────────

function TicketRow({
  ticket,
  onPress,
  theme,
  primary,
}: {
  ticket: UnifiedTicket;
  onPress: () => void;
  theme: any;
  primary: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 13,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
      }}
    >
      <View style={{ flex: 1, marginRight: 10 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            marginBottom: 4,
          }}
        >
          <Text
            style={{
              fontFamily: "Outfit-medium",
              fontSize: 11,
              color: primary,
            }}
          >
            #{ticket.ticketNumber}
          </Text>
          <SourceTag source={ticket._source} />
        </View>
        <Text
          style={{
            fontFamily: "Outfit-medium",
            fontSize: 13,
            color: theme.textActive ?? theme.text,
            lineHeight: 18,
          }}
          numberOfLines={2}
        >
          {ticket.title}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
        <Text
          style={{ fontFamily: "Outfit", fontSize: 11, color: theme.subtext }}
        >
          {toReadableDate(ticket.dateCreated)}
        </Text>
        <StatusBadge status={ticket.status} />
      </View>
      <ChevronRight size={14} color={theme.subtext} style={{ marginLeft: 6 }} />
    </TouchableOpacity>
  );
}

// ─── Status Timeline strip ────────────────────────────────────────────────────

function StatusTimeline({
  steps,
  currentStatus,
  theme,
}: {
  steps: string[];
  currentStatus: string;
  theme: any;
}) {
  const currentIdx = steps.indexOf(currentStatus);
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: theme.background,
        borderRadius: 12,
        padding: 14,
        marginBottom: 18,
        borderWidth: 1,
        borderColor: theme.border,
      }}
    >
      {steps.map((s, i) => {
        const c = STATUS_CONFIG[s] ?? STATUS_CONFIG["Pending"];
        const filled = i <= currentIdx;
        return (
          <React.Fragment key={s}>
            <View style={{ alignItems: "center", flex: 1 }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: filled
                    ? c.bg
                    : (theme.surfaceRaised ?? theme.background),
                  borderWidth: 2,
                  borderColor: filled ? c.border : theme.border,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 5,
                }}
              >
                {s === "Resolved" ? (
                  <CheckCircle
                    size={13}
                    color={filled ? c.text : theme.subtext}
                  />
                ) : s === "In Progress" ? (
                  <Clock size={13} color={filled ? c.text : theme.subtext} />
                ) : (
                  <Circle size={13} color={filled ? c.text : theme.subtext} />
                )}
              </View>
              <Text
                style={{
                  fontFamily: i === currentIdx ? "Outfit-medium" : "Outfit",
                  fontSize: 10,
                  color: i === currentIdx ? c.text : theme.subtext,
                  textAlign: "center",
                }}
              >
                {s}
              </Text>
            </View>
            {i < steps.length - 1 && (
              <View
                style={{
                  height: 2,
                  flex: 0.4,
                  backgroundColor:
                    i < currentIdx
                      ? STATUS_CONFIG["In Progress"].border
                      : theme.border,
                  marginBottom: 18,
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ─── Meta rows ────────────────────────────────────────────────────────────────

function MetaCard({
  fields,
  theme,
}: {
  fields: { label: string; value: string }[];
  theme: any;
}) {
  return (
    <View
      style={{
        backgroundColor: theme.background,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.border,
        marginBottom: 16,
        overflow: "hidden",
      }}
    >
      {fields.map((f, i) => (
        <View
          key={f.label}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 15,
            paddingVertical: 11,
            borderBottomWidth: i < fields.length - 1 ? 1 : 0,
            borderBottomColor: theme.border,
          }}
        >
          <Text
            style={{
              fontFamily: "Outfit",
              fontSize: 12,
              color: theme.subtext,
              flex: 1,
            }}
          >
            {f.label}
          </Text>
          <Text
            style={{
              fontFamily: "Outfit-medium",
              fontSize: 12,
              color: theme.textActive ?? theme.text,
              flex: 2,
              textAlign: "right",
            }}
            numberOfLines={2}
          >
            {f.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── IT Detail ────────────────────────────────────────────────────────────────

function ITDetailContent({
  ticket,
  theme,
  primary,
}: {
  ticket: ConcernTicket;
  theme: any;
  primary: string;
}) {
  return (
    <>
      <StatusTimeline
        steps={["Pending", "In Progress", "Resolved"]}
        currentStatus={ticket.status}
        theme={theme}
      />
      <MetaCard
        fields={[
          { label: "Ticket ID", value: ticket.ticketNumber },
          { label: "Category", value: ticket.category ?? "—" },
          { label: "Priority", value: ticket.priority ?? "—" },
          { label: "Assignee", value: ticket.assigneeName || "Unassigned" },
          { label: "Date Created", value: toReadableDate(ticket.dateCreated) },
          { label: "Due Date", value: toReadableDate(ticket.dueDate) },
        ]}
        theme={theme}
      />
      {ticket.details ? (
        <View
          style={{
            backgroundColor: theme.background,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 15,
          }}
        >
          <Text
            style={{
              fontFamily: "Outfit-medium",
              fontSize: 11,
              color: theme.subtext,
              textTransform: "uppercase",
              letterSpacing: 0.6,
              marginBottom: 8,
            }}
          >
            Description
          </Text>
          <Text
            style={{
              fontFamily: "Outfit",
              fontSize: 13,
              color: theme.textActive ?? theme.text,
              lineHeight: 20,
            }}
          >
            {ticket.details}
          </Text>
        </View>
      ) : null}
    </>
  );
}

// ─── Supply Detail ────────────────────────────────────────────────────────────

function SupplyDetailContent({
  request,
  theme,
  primary,
}: {
  request: SupplyRequest;
  theme: any;
  primary: string;
}) {
  const displayStatus = normaliseSupplyStatus(request.status);
  const isRejected = request.status === "rejected";

  return (
    <>
      {isRejected ? (
        <View
          style={{
            backgroundColor: "#FEF2F2",
            borderWidth: 1,
            borderColor: "#FECACA",
            borderRadius: 12,
            padding: 14,
            marginBottom: 18,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Text style={{ fontSize: 20 }}>❌</Text>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: "Outfit-medium",
                fontSize: 13,
                color: "#DC2626",
              }}
            >
              Request Rejected
            </Text>
            {request.rejectionReason ? (
              <Text
                style={{
                  fontFamily: "Outfit",
                  fontSize: 12,
                  color: "#DC2626",
                  marginTop: 3,
                }}
              >
                {request.rejectionReason}
              </Text>
            ) : null}
          </View>
        </View>
      ) : (
        <StatusTimeline
          steps={["Pending", "In Progress", "Resolved"]}
          currentStatus={displayStatus}
          theme={theme}
        />
      )}

      <MetaCard
        fields={[
          { label: "Ticket ID", value: request.ticketNumber },
          { label: "Date Created", value: toReadableDate(request.createdAt) },
          {
            label: "Total items",
            value: `${request.items?.length ?? 0} item${(request.items?.length ?? 0) !== 1 ? "s" : ""}`,
          },
          {
            label: "Reviewed by",
            value: request.reviewedByName || "Pending review",
          },
          {
            label: "Resolved at",
            value: request.resolvedAt
              ? toReadableDate(request.resolvedAt)
              : "—",
          },
        ]}
        theme={theme}
      />

      {/* Items */}
      <Text
        style={{
          fontFamily: "Outfit-medium",
          fontSize: 13,
          color: theme.textActive ?? theme.text,
          marginBottom: 10,
        }}
      >
        Items ({request.items?.length ?? 0})
      </Text>
      <View
        style={{
          backgroundColor: theme.background,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.border,
          overflow: "hidden",
          marginBottom: 16,
        }}
      >
        {(request.items ?? []).map((item, i) => (
          <View
            key={item.itemId + i}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 15,
              paddingVertical: 11,
              borderBottomWidth: i < (request.items?.length ?? 0) - 1 ? 1 : 0,
              borderBottomColor: theme.border,
            }}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: primary + "15",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
              }}
            >
              <Package size={13} color={primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: "Outfit-medium",
                  fontSize: 13,
                  color: theme.textActive ?? theme.text,
                }}
                numberOfLines={1}
              >
                {item.itemName}
              </Text>
              <Text
                style={{
                  fontFamily: "Outfit",
                  fontSize: 11,
                  color: theme.subtext,
                }}
              >
                {item.itemCode} · {item.category}
              </Text>
            </View>
            <View
              style={{
                backgroundColor: primary + "15",
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <Text
                style={{
                  fontFamily: "Outfit-medium",
                  fontSize: 13,
                  color: primary,
                }}
              >
                ×{item.quantityRequested}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {request.notes ? (
        <View
          style={{
            backgroundColor: theme.background,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 15,
          }}
        >
          <Text
            style={{
              fontFamily: "Outfit-medium",
              fontSize: 11,
              color: theme.subtext,
              textTransform: "uppercase",
              letterSpacing: 0.6,
              marginBottom: 8,
            }}
          >
            Notes
          </Text>
          <Text
            style={{
              fontFamily: "Outfit",
              fontSize: 13,
              color: theme.textActive ?? theme.text,
              lineHeight: 20,
            }}
          >
            {request.notes}
          </Text>
        </View>
      ) : null}
    </>
  );
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────

function DetailDrawer({
  ticket,
  onClose,
  theme,
  primary,
}: {
  ticket: UnifiedTicket | null;
  onClose: () => void;
  theme: any;
  primary: string;
}) {
  if (!ticket) return null;
  const DRAWER_W = Math.min(SCREEN_W * 0.95, 480);
  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.45)",
          justifyContent: "flex-end",
        }}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={{
            width: DRAWER_W,
            maxHeight: SCREEN_H * 0.88,
            backgroundColor: theme.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            overflow: "hidden",
            alignSelf: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.15,
            shadowRadius: 20,
            elevation: 20,
          }}
        >
          {/* Handle */}
          <View
            style={{ alignItems: "center", paddingTop: 12, paddingBottom: 4 }}
          >
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: theme.border,
              }}
            />
          </View>
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingTop: 10,
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
            }}
          >
            <View style={{ flex: 1, marginRight: 12 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 7,
                  marginBottom: 5,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Outfit",
                    fontSize: 11,
                    color: theme.subtext,
                  }}
                >
                  #{ticket.ticketNumber}
                </Text>
                <SourceTag source={ticket._source} />
              </View>
              <Text
                style={{
                  fontFamily: "Outfit-medium",
                  fontSize: 17,
                  color: theme.textActive ?? theme.text,
                  lineHeight: 23,
                }}
              >
                {ticket.title}
              </Text>
              <View style={{ marginTop: 8 }}>
                <StatusBadge status={ticket.status} />
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: theme.background,
                alignItems: "center",
                justifyContent: "center",
                marginTop: 4,
              }}
            >
              <X size={15} color={theme.subtext} />
            </TouchableOpacity>
          </View>
          {/* Body */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          >
            {ticket._source === "it" && ticket.itTicket ? (
              <ITDetailContent
                ticket={ticket.itTicket}
                theme={theme}
                primary={primary}
              />
            ) : ticket.supplyRequest ? (
              <SupplyDetailContent
                request={ticket.supplyRequest}
                theme={theme}
                primary={primary}
              />
            ) : null}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({
  tab,
  hasSearch,
  theme,
}: {
  tab: string;
  hasSearch: boolean;
  theme: any;
}) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 60 }}>
      <Text style={{ fontSize: 38, marginBottom: 10 }}>
        {hasSearch ? "🔍" : "📋"}
      </Text>
      <Text
        style={{
          fontFamily: "Outfit-medium",
          fontSize: 14,
          color: theme.textActive ?? theme.text,
          marginBottom: 4,
        }}
      >
        {hasSearch
          ? "No tickets match your search"
          : tab === "All"
            ? "No tickets yet"
            : `No ${tab} tickets`}
      </Text>
      <Text
        style={{
          fontFamily: "Outfit",
          fontSize: 12,
          color: theme.subtext,
          textAlign: "center",
        }}
      >
        {hasSearch
          ? "Try a different keyword"
          : "Tickets you submit will appear here"}
      </Text>
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type TabKey = "All" | "Pending" | "In Progress" | "Resolved" | "Rejected";
const TABS: TabKey[] = [
  "All",
  "Pending",
  "In Progress",
  "Resolved",
  "Rejected",
];
type Props = { user: ADUser };

export default function MyTicketsPage({ user }: Props) {
  const { theme } = useTheme();
  const primary = theme.primary ?? "#4169E1";

  const [unified, setUnified] = useState<UnifiedTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<UnifiedTicket | null>(null);

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      try {
        const [itTickets, supplyRequests] = await Promise.all([
          getTicketsByRequester(user.username),
          getSupplyRequestsByUser(
            user.username,
            user.displayName ?? user.username,
          ),
        ]);
        setUnified(mergeTickets(itTickets, supplyRequests));
      } catch (err) {
        console.error("Failed to load tickets:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user.username],
  );

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = {
      All: unified.length,
      Pending: 0,
      "In Progress": 0,
      Resolved: 0,
      Rejected: 0,
    };
    unified.forEach((t) => {
      if (t.status in c) (c as any)[t.status]++;
    });
    return c;
  }, [unified]);

  const displayed = useMemo(() => {
    let result = unified;
    if (activeTab !== "All")
      result = result.filter((t) => t.status === activeTab);
    const q = search.trim().toLowerCase();
    if (q)
      result = result.filter(
        (t) =>
          t.title?.toLowerCase().includes(q) ||
          t.ticketNumber?.toLowerCase().includes(q) ||
          t.category?.toLowerCase().includes(q),
      );
    return result;
  }, [unified, activeTab, search]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Top bar */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 20,
          backgroundColor: theme.background,
        }}
      >
        {/* Title */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <View>
            <Text
              style={{
                fontFamily: "Outfit-medium",
                fontSize: 20,
                color: theme.textActive ?? theme.text,
              }}
            >
              My Tickets
            </Text>
            <Text
              style={{
                fontFamily: "Outfit",
                fontSize: 12,
                color: theme.subtext,
                marginTop: 2,
              }}
            >
              Active and pending requests
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setRefreshing(true);
              load(true);
            }}
            activeOpacity={0.7}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: theme.surface ?? theme.background,
              borderWidth: 1,
              borderColor: theme.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <RefreshCw size={15} color={theme.subtext} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: theme.surface ?? theme.background,
            borderWidth: 1.5,
            borderColor: theme.border,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: Platform.OS === "ios" ? 10 : 8,
            marginBottom: 14,
          }}
        >
          <Search size={14} color={theme.subtext} />
          <TextInput
            placeholder="Search tickets..."
            placeholderTextColor={theme.subtext}
            value={search}
            onChangeText={setSearch}
            style={{
              flex: 1,
              fontFamily: "Outfit",
              fontSize: 13,
              color: theme.textActive ?? theme.text,
              padding: 0,
            }}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <X size={13} color={theme.subtext} />
            </TouchableOpacity>
          )}
        </View>

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingBottom: 14 }}
        >
          {TABS.map((tab) => {
            if (
              tab === "Rejected" &&
              counts.Rejected === 0 &&
              activeTab !== "Rejected"
            )
              return null;
            const active = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.7}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 100,
                  backgroundColor: active ? primary : "transparent",
                  borderWidth: active ? 0 : 1.5,
                  borderColor: theme.border,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Outfit-medium",
                    fontSize: 12,
                    color: active ? "#fff" : theme.subtext,
                  }}
                >
                  {tab}
                </Text>
                <View
                  style={{
                    backgroundColor: active
                      ? "rgba(255,255,255,0.25)"
                      : (theme.surfaceRaised ?? theme.background),
                    borderRadius: 100,
                    paddingHorizontal: 6,
                    paddingVertical: 1,
                    minWidth: 20,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Outfit-medium",
                      fontSize: 10,
                      color: active ? "#fff" : theme.subtext,
                    }}
                  >
                    {counts[tab]}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={{ height: 1, backgroundColor: theme.border }} />

      {/* List */}
      {loading ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" color={primary} />
          <Text
            style={{
              fontFamily: "Outfit",
              fontSize: 12,
              color: theme.subtext,
              marginTop: 12,
            }}
          >
            Loading your tickets…
          </Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load(true);
              }}
              tintColor={primary}
            />
          }
        >
          <View
            style={{
              marginHorizontal: 16,
              marginTop: 14,
              marginBottom: 24,
              backgroundColor: theme.surface ?? theme.background,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: theme.border,
              overflow: "hidden",
            }}
          >
            {displayed.length === 0 ? (
              <EmptyState
                tab={activeTab}
                hasSearch={search.trim().length > 0}
                theme={theme}
              />
            ) : (
              displayed.map((t) => (
                <TicketRow
                  key={`${t._source}-${t.id}`}
                  ticket={t}
                  onPress={() => setSelected(t)}
                  theme={theme}
                  primary={primary}
                />
              ))
            )}
          </View>
          {displayed.length > 0 && (
            <Text
              style={{
                fontFamily: "Outfit",
                fontSize: 11,
                color: theme.subtext,
                textAlign: "center",
                marginBottom: 20,
              }}
            >
              Showing {displayed.length} of {unified.length} ticket
              {unified.length !== 1 ? "s" : ""}
            </Text>
          )}
        </ScrollView>
      )}

      <DetailDrawer
        ticket={selected}
        onClose={() => setSelected(null)}
        theme={theme}
        primary={primary}
      />
    </View>
  );
}
