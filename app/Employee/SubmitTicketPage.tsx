import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { ADUser } from "../../types";
import { addTicket } from "../../Services/ticketService";
import { useTheme } from "../../theme/ThemeContext";
import { ChevronLeft } from "lucide-react-native";
import SupplyRequestModal from "./Modal/SupplyRequestModal"; // adjust path

// ─── Types ────────────────────────────────────────────────────────────────────

type TicketType = "it" | "hr" | "supply";
type Step = 1 | 2 | 3 | 4;

const IT_CATEGORIES = [
  "Hardware Issues",
  "Software Issues",
  "Network & Internet",
  "Printer & Peripherals",
  "Email & Account",
  "System Access",
  "Other IT Concerns",
] as const;

const HR_CATEGORIES = [
  "Overtime Filing",
  "Schedule Adjustment",
  "Attendance Correction",
  "Other HR Concerns",
] as const;

const PRIORITY_OPTIONS = ["Normal", "Urgent", "Critical"] as const;
type PriorityValue = (typeof PRIORITY_OPTIONS)[number];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDueDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const iso = trimmed.includes("-") ? trimmed : trimmed.replace(/\//g, "-");
  const parsed = new Date(iso);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  const legacy = new Date(trimmed.replace(/-/g, "/"));
  if (!Number.isNaN(legacy.getTime())) return legacy;
  return null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

type StepBarProps = {
  step: Step;
  theme: any;
  primary: string;
};

function StepBar({ step, theme, primary }: StepBarProps) {
  const steps = ["Choose Type", "Fill Details", "Review", "Done"];
  return (
    <View
      style={{ flexDirection: "row", alignItems: "center", marginBottom: 28 }}
    >
      {steps.map((label, i) => {
        const num = i + 1;
        const isDone = num < step;
        const isActive = num === step;
        return (
          <React.Fragment key={num}>
            <View
              style={{ alignItems: "center", flexDirection: "row", gap: 6 }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  borderWidth: 2,
                  borderColor: isDone
                    ? "#10B981"
                    : isActive
                      ? primary
                      : theme.border,
                  backgroundColor: isDone
                    ? "#10B981"
                    : isActive
                      ? primary
                      : theme.surface,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    fontFamily: "Outfit-SemiBold",
                    fontSize: 11,
                    color: isDone || isActive ? "#fff" : theme.subtext,
                  }}
                >
                  {isDone ? "✓" : String(num)}
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: "Outfit-SemiBold",
                  fontSize: 11,
                  color: isDone
                    ? "#10B981"
                    : isActive
                      ? primary
                      : theme.subtext,
                  flexShrink: 1,
                }}
                numberOfLines={1}
              >
                {label}
              </Text>
            </View>
            {i < steps.length - 1 && (
              <View
                style={{
                  flex: 1,
                  height: 2,
                  backgroundColor: num < step ? "#10B981" : theme.border,
                  marginHorizontal: 8,
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

type TypeCardProps = {
  icon: string;
  title: string;
  desc: string;
  badge?: string;
  selected: boolean;
  onPress: () => void;
  accentColor: string;
  accentBg: string;
  theme: any;
};

function TypeCard({
  icon,
  title,
  desc,
  badge,
  selected,
  onPress,
  accentColor,
  accentBg,
  theme,
}: TypeCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        flex: 1,
        backgroundColor: selected ? accentBg : theme.surface,
        borderWidth: 1.5,
        borderColor: selected ? accentColor : theme.border,
        borderRadius: 12,
        padding: 20,
        alignItems: "center",
        minWidth: 100,
      }}
    >
      <Text style={{ fontSize: 30, marginBottom: 10 }}>{icon}</Text>
      <Text
        style={{
          fontFamily: "Outfit-SemiBold",
          fontSize: 14,
          color: theme.textActive,
          marginBottom: 4,
          textAlign: "center",
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontFamily: "Outfit",
          fontSize: 12,
          color: theme.subtext,
          textAlign: "center",
          lineHeight: 17,
        }}
      >
        {desc}
      </Text>
      {badge && (
        <View
          style={{
            marginTop: 8,
            backgroundColor: "#FFF7ED",
            borderRadius: 100,
            borderWidth: 1,
            borderColor: "#FED7AA",
            paddingHorizontal: 8,
            paddingVertical: 2,
          }}
        >
          <Text
            style={{
              fontFamily: "Outfit-SemiBold",
              fontSize: 10,
              color: "#C2410C",
            }}
          >
            {badge}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

type SubOptProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  theme: any;
  primary: string;
  fullWidth?: boolean;
};

function SubOpt({
  label,
  selected,
  onPress,
  theme,
  primary,
  fullWidth,
}: SubOptProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 9,
        padding: 10,
        borderWidth: 1.5,
        borderColor: selected ? primary : theme.border,
        borderRadius: 8,
        backgroundColor: selected
          ? (theme.bgActive ?? "#EEF2FF")
          : "transparent",
        width: fullWidth ? "100%" : undefined,
        flex: fullWidth ? undefined : 1,
      }}
    >
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          borderWidth: 2,
          borderColor: selected ? primary : theme.border,
          backgroundColor: selected ? primary : "transparent",
        }}
      />
      <Text
        style={{
          fontFamily: "Outfit",
          fontSize: 13,
          color: theme.textActive,
          flexShrink: 1,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

type FieldProps = {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  theme: any;
};

function Field({ label, required, children, theme }: FieldProps) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text
        style={{
          fontFamily: "Outfit-SemiBold",
          fontSize: 13,
          color: theme.textActive,
          marginBottom: 6,
        }}
      >
        {label}
        {required && <Text style={{ color: "#EF4444" }}> *</Text>}
      </Text>
      {children}
    </View>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Props = {
  user: ADUser;
  onNavigate?: (key: string) => void;
};

export default function SubmitTicketPage({ user, onNavigate }: Props) {
  const { theme } = useTheme();
  const primary = theme.primary ?? "#4169E1";

  const [step, setStep] = useState<Step>(1);
  const [ticketType, setTicketType] = useState<TicketType | null>(null);
  const [submittedId, setSubmittedId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // IT fields
  const [itCategory, setItCategory] = useState<string>("");
  const [itTitle, setItTitle] = useState("");
  const [itDesc, setItDesc] = useState("");
  const [itDevice, setItDevice] = useState("");

  // HR fields
  const [hrCategory, setHrCategory] = useState<string>("Overtime Filing");
  const [hrDate, setHrDate] = useState("");
  const [hrDuration, setHrDuration] = useState("");
  const [hrStartTime, setHrStartTime] = useState("");
  const [hrEndTime, setHrEndTime] = useState("");
  const [hrReason, setHrReason] = useState("");
  const [hrNotes, setHrNotes] = useState("");
  const [supplyModalVisible, setSupplyModalVisible] = useState(false);
  // Priority (review step)
  const [priority, setPriority] = useState<PriorityValue>("Normal");

  const inputStyle = {
    backgroundColor: theme.background,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: theme.border,
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontFamily: "Outfit",
    fontSize: 13,
    color: theme.textActive,
    marginTop: 0,
  };

  // ─── Step 1: Choose Type ────────────────────────────────────────────────────
  const renderStep1 = () => (
    <View>
      <View style={{ marginBottom: 20 }}>
        <Text
          style={{
            fontFamily: "Outfit",
            fontSize: 11,
            fontWeight: "600",
            letterSpacing: 0.8,
            textTransform: "uppercase",
            color: theme.subtext,
            marginBottom: 4,
          }}
        >
          New Ticket
        </Text>
        <Text
          style={{
            fontFamily: "Outfit-SemiBold",
            fontSize: 20,
            color: theme.textActive,
            marginBottom: 4,
          }}
        >
          What do you need help with?
        </Text>
        <Text
          style={{ fontFamily: "Outfit", fontSize: 13, color: theme.subtext }}
        >
          Select the category for your request.
        </Text>
      </View>

      {/* Type cards */}
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
        <TypeCard
          icon="💻"
          title="IT Concern"
          desc="Hardware, software, network, printers, email, system access issues."
          selected={ticketType === "it"}
          onPress={() => setTicketType("it")}
          accentColor="#0EA5E9"
          accentBg={theme.background}
          theme={theme}
        />
        <TypeCard
          icon="📋"
          title="HR Concern"
          desc="Overtime filing, schedule changes, attendance corrections."
          badge="Draft Feature"
          selected={ticketType === "hr"}
          onPress={() => setTicketType("hr")}
          accentColor="#7C3AED"
          accentBg={theme.background}
          theme={theme}
        />
        <TypeCard
          icon="📦"
          title="Office Supply"
          desc="Request office supplies from available inventory."
          selected={ticketType === "supply"}
          onPress={() => setTicketType("supply")}
          accentColor="#10B981"
          accentBg={theme.background}
          theme={theme}
        />
      </View>

      <TouchableOpacity
        onPress={() => {
          if (ticketType) setStep(2);
        }}
        activeOpacity={ticketType ? 0.8 : 1}
        style={{
          backgroundColor: primary,
          borderRadius: 8,
          paddingHorizontal: 22,
          paddingVertical: 11,
          alignSelf: "flex-start",
          opacity: ticketType ? 1 : 0.4,
        }}
      >
        <Text
          style={{ fontFamily: "Outfit-SemiBold", fontSize: 13, color: "#fff" }}
        >
          Continue →
        </Text>
      </TouchableOpacity>
    </View>
  );

  // ─── Step 2a: IT Form ───────────────────────────────────────────────────────
  const renderStep2IT = () => (
    <View>
      <BackButton onPress={() => setStep(1)} theme={theme} />
      <View
        style={{
          backgroundColor: theme.surface,
          borderWidth: 1.5,
          borderColor: theme.border,
          borderRadius: 12,
          padding: 24,
        }}
      >
        <Text
          style={{
            fontFamily: "Outfit-SemiBold",
            fontSize: 17,
            color: theme.textActive,
            marginBottom: 4,
          }}
        >
          💻 IT Concern
        </Text>
        <Text
          style={{
            fontFamily: "Outfit",
            fontSize: 13,
            color: theme.subtext,
            marginBottom: 20,
          }}
        >
          Select a category and describe your issue.
        </Text>

        <Field label="IT Category" required theme={theme}>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 2,
            }}
          >
            {IT_CATEGORIES.map((cat, idx) => (
              <SubOpt
                key={cat}
                label={cat}
                selected={itCategory === cat}
                onPress={() => setItCategory(cat)}
                theme={theme}
                primary={primary}
                fullWidth={idx === IT_CATEGORIES.length - 1}
              />
            ))}
          </View>
        </Field>

        <Field label="Issue Title" required theme={theme}>
          <TextInput
            style={inputStyle}
            placeholder="e.g. Cannot connect to Wi-Fi"
            placeholderTextColor={theme.subtext}
            value={itTitle}
            onChangeText={setItTitle}
          />
        </Field>

        <Field label="Description" required theme={theme}>
          <TextInput
            style={[inputStyle, { height: 100, textAlignVertical: "top" }]}
            placeholder="Describe the problem in detail — what happened, when it started, what you've already tried…"
            placeholderTextColor={theme.subtext}
            multiline
            value={itDesc}
            onChangeText={setItDesc}
          />
        </Field>

        <Field label="Affected Device / Asset (optional)" theme={theme}>
          <TextInput
            style={inputStyle}
            placeholder="e.g. Dell Laptop — Asset Tag #0034"
            placeholderTextColor={theme.subtext}
            value={itDevice}
            onChangeText={setItDevice}
          />
        </Field>

        {error ? (
          <Text
            style={{
              fontFamily: "Outfit",
              color: "#EF4444",
              fontSize: 13,
              marginBottom: 8,
            }}
          >
            {error}
          </Text>
        ) : null}

        <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
          <SecondaryBtn label="Back" onPress={() => setStep(1)} theme={theme} />
          <PrimaryBtn
            label="Review →"
            onPress={() => {
              setError("");
              if (!itCategory) {
                setError("Please select an IT category.");
                return;
              }
              if (!itTitle.trim()) {
                setError("Please enter an issue title.");
                return;
              }
              if (!itDesc.trim()) {
                setError("Please describe the issue.");
                return;
              }
              setStep(3);
            }}
            primary={primary}
          />
        </View>
      </View>
    </View>
  );

  // ─── Step 2b: HR Form ───────────────────────────────────────────────────────
  const renderStep2HR = () => (
    <View>
      <BackButton onPress={() => setStep(1)} theme={theme} />
      <View
        style={{
          backgroundColor: theme.surface,
          borderWidth: 1.5,
          borderColor: theme.border,
          borderRadius: 12,
          padding: 24,
        }}
      >
        <Text
          style={{
            fontFamily: "Outfit-SemiBold",
            fontSize: 17,
            color: theme.textActive,
            marginBottom: 4,
          }}
        >
          📋 HR Concern
        </Text>
        <Text
          style={{
            fontFamily: "Outfit",
            fontSize: 13,
            color: theme.subtext,
            marginBottom: 16,
          }}
        >
          Submit an HR-related request for review.
        </Text>

        {/* Draft banner */}
        <View
          style={{
            flexDirection: "row",
            gap: 8,
            backgroundColor: "#FFFBEB",
            borderWidth: 1.5,
            borderColor: "#FDE68A",
            borderRadius: 8,
            padding: 11,
            marginBottom: 18,
          }}
        >
          <Text style={{ fontSize: 13, color: "#92400E" }}>
            ⚠️ This feature is in{" "}
            <Text style={{ fontFamily: "Outfit-SemiBold" }}>draft</Text>. Some
            options may change in future updates.
          </Text>
        </View>

        <Field label="HR Category" required theme={theme}>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 2,
            }}
          >
            {HR_CATEGORIES.map((cat) => (
              <SubOpt
                key={cat}
                label={cat}
                selected={hrCategory === cat}
                onPress={() => setHrCategory(cat)}
                theme={theme}
                primary={primary}
              />
            ))}
          </View>
        </Field>

        <View style={{ flexDirection: "row", gap: 14 }}>
          <View style={{ flex: 1 }}>
            <Field label="Overtime Date" required theme={theme}>
              <TextInput
                style={inputStyle}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.subtext}
                value={hrDate}
                onChangeText={setHrDate}
              />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Duration (hours)" required theme={theme}>
              <TextInput
                style={inputStyle}
                placeholder="e.g. 2.5"
                placeholderTextColor={theme.subtext}
                keyboardType="decimal-pad"
                value={hrDuration}
                onChangeText={setHrDuration}
              />
            </Field>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 14 }}>
          <View style={{ flex: 1 }}>
            <Field label="Start Time" required theme={theme}>
              <TextInput
                style={inputStyle}
                placeholder="e.g. 18:00"
                placeholderTextColor={theme.subtext}
                value={hrStartTime}
                onChangeText={setHrStartTime}
              />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label="End Time" required theme={theme}>
              <TextInput
                style={inputStyle}
                placeholder="e.g. 21:00"
                placeholderTextColor={theme.subtext}
                value={hrEndTime}
                onChangeText={setHrEndTime}
              />
            </Field>
          </View>
        </View>

        <Field label="Reason" required theme={theme}>
          <View
            style={{
              backgroundColor: theme.background,
              borderRadius: 8,
              borderWidth: 1.5,
              borderColor: theme.border,
              overflow: "hidden",
            }}
          >
            {[
              "Heavy workload / deadline",
              "Special project or task",
              "Client deliverable",
              "System maintenance",
              "Other",
            ].map((opt) => (
              <TouchableOpacity
                key={opt}
                onPress={() => setHrReason(opt)}
                activeOpacity={0.7}
                style={{
                  paddingHorizontal: 13,
                  paddingVertical: 10,
                  backgroundColor:
                    hrReason === opt
                      ? (theme.bgActive ?? "#EEF2FF")
                      : "transparent",
                  borderBottomWidth: 0.5,
                  borderBottomColor: theme.border,
                }}
              >
                <Text
                  style={{
                    fontFamily: hrReason === opt ? "Outfit-SemiBold" : "Outfit",
                    fontSize: 13,
                    color: hrReason === opt ? primary : theme.textActive,
                  }}
                >
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        <Field label="Notes" theme={theme}>
          <TextInput
            style={[inputStyle, { height: 70, textAlignVertical: "top" }]}
            placeholder="Any additional context for HR…"
            placeholderTextColor={theme.subtext}
            multiline
            value={hrNotes}
            onChangeText={setHrNotes}
          />
        </Field>

        {error ? (
          <Text
            style={{
              fontFamily: "Outfit",
              color: "#EF4444",
              fontSize: 13,
              marginBottom: 8,
            }}
          >
            {error}
          </Text>
        ) : null}

        <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
          <SecondaryBtn label="Back" onPress={() => setStep(1)} theme={theme} />
          <PrimaryBtn
            label="Review →"
            onPress={() => {
              setError("");
              if (!hrDate.trim()) {
                setError("Please enter the overtime date.");
                return;
              }
              if (!hrReason) {
                setError("Please select a reason.");
                return;
              }
              setStep(3);
            }}
            primary={primary}
          />
        </View>
      </View>
    </View>
  );

  // ─── Step 2c: Supply (simple note, as supply data comes from inventory) ─────
  const renderStep2Supply = () => (
  <View>
    <BackButton onPress={() => setStep(1)} theme={theme} />
    <SupplyRequestModal
      visible={supplyModalVisible}
      onClose={() => { setSupplyModalVisible(false); setStep(1); }}
      user={user}
      onSuccess={(ticketNumber) => {
        setSubmittedId(ticketNumber);
        setStep(4);
        setSupplyModalVisible(false);
      }}
    />
    {/* Auto-open the modal when this step is reached */}
    {!supplyModalVisible && (() => { setSupplyModalVisible(true); return null; })()}
  </View>
);

  // ─── Step 3: Review ─────────────────────────────────────────────────────────
  const typeNames: Record<TicketType, string> = {
    it: "IT Concern",
    hr: "HR Concern",
    supply: "Office Supply Request",
  };

  const getCategoryLabel = () => {
    if (ticketType === "it") return itCategory || "—";
    if (ticketType === "hr") return hrCategory || "—";
    return "Supply Request";
  };

  const getTitleLabel = () => {
    if (ticketType === "hr") return hrCategory || "—";
    return itTitle || "—";
  };

  const renderStep3 = () => (
    <View>
      <BackButton onPress={() => setStep(2)} theme={theme} />
      <View
        style={{
          backgroundColor: theme.surface,
          borderWidth: 1.5,
          borderColor: theme.border,
          borderRadius: 12,
          padding: 24,
        }}
      >
        <Text
          style={{
            fontFamily: "Outfit-SemiBold",
            fontSize: 17,
            color: theme.textActive,
            marginBottom: 4,
          }}
        >
          Review Your Ticket
        </Text>
        <Text
          style={{
            fontFamily: "Outfit",
            fontSize: 13,
            color: theme.subtext,
            marginBottom: 20,
          }}
        >
          Double-check before submitting.
        </Text>

        {/* Review rows */}
        {[
          {
            label: "Request Type",
            value: ticketType ? typeNames[ticketType] : "—",
          },
          { label: "Category", value: getCategoryLabel() },
          { label: "Title / Summary", value: getTitleLabel() },
          { label: "Submitted by", value: user.displayName },
          {
            label: "Date",
            value: new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
          },
        ].map((row, i, arr) => (
          <View
            key={row.label}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingVertical: 8,
              borderBottomWidth: i < arr.length - 1 ? 1 : 0,
              borderBottomColor: theme.border,
            }}
          >
            <Text
              style={{
                fontFamily: "Outfit",
                fontSize: 13,
                color: theme.subtext,
              }}
            >
              {row.label}
            </Text>
            <Text
              style={{
                fontFamily: "Outfit-SemiBold",
                fontSize: 13,
                color: theme.textActive,
                flexShrink: 1,
                textAlign: "right",
                maxWidth: "60%",
              }}
            >
              {row.value}
            </Text>
          </View>
        ))}

        {/* Priority */}
        <View style={{ marginTop: 20 }}>
          <Field label="Priority" theme={theme}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {PRIORITY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  onPress={() => setPriority(opt)}
                  activeOpacity={0.7}
                  style={{
                    flex: 1,
                    borderRadius: 8,
                    paddingVertical: 10,
                    alignItems: "center",
                    backgroundColor:
                      priority === opt ? primary : theme.background,
                    borderWidth: 1.5,
                    borderColor: priority === opt ? primary : theme.border,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Outfit-SemiBold",
                      fontSize: 13,
                      color: priority === opt ? "#fff" : theme.subtext,
                    }}
                  >
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text
              style={{
                fontFamily: "Outfit",
                fontSize: 11,
                color: theme.subtext,
                marginTop: 5,
              }}
            >
              Use Urgent or Critical only if this significantly affects your
              work.
            </Text>
          </Field>
        </View>

        {error ? (
          <Text
            style={{
              fontFamily: "Outfit",
              color: "#EF4444",
              fontSize: 13,
              marginBottom: 8,
            }}
          >
            {error}
          </Text>
        ) : null}

        <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
          <SecondaryBtn label="Back" onPress={() => setStep(2)} theme={theme} />
          <PrimaryBtn
            label={saving ? "Submitting…" : "Submit Ticket ✓"}
            onPress={handleSubmit}
            primary={primary}
            disabled={saving}
            loading={saving}
          />
        </View>
      </View>
    </View>
  );

  // ─── Step 4: Done ───────────────────────────────────────────────────────────
  const renderStep4 = () => (
    <View
      style={{
        backgroundColor: theme.surface,
        borderWidth: 1.5,
        borderColor: "#A7F3D0",
        borderRadius: 12,
        padding: 48,
        alignItems: "center",
      }}
    >
      <Text style={{ fontSize: 52, marginBottom: 16 }}>🎉</Text>
      <Text
        style={{
          fontFamily: "Outfit-SemiBold",
          fontSize: 20,
          color: theme.textActive,
          marginBottom: 8,
        }}
      >
        Ticket Submitted!
      </Text>
      <Text
        style={{
          fontFamily: "Outfit",
          fontSize: 14,
          color: theme.subtext,
          marginBottom: 20,
          textAlign: "center",
          lineHeight: 22,
        }}
      >
        Your request has been received and will be reviewed shortly.{"\n"}
        You'll receive a notification once it's assigned.
      </Text>

      {/* Ticket ID chip */}
      <View
        style={{
          backgroundColor: theme.bgActive ?? "#EEF2FF",
          borderRadius: 8,
          borderWidth: 1.5,
          borderColor: "#C7D2FE",
          paddingHorizontal: 22,
          paddingVertical: 8,
          marginBottom: 28,
        }}
      >
        <Text
          style={{
            fontFamily: "Outfit-SemiBold",
            fontSize: 20,
            color: primary,
            letterSpacing: 1,
          }}
        >
          {submittedId}
        </Text>
      </View>

      <View
        style={{
          flexDirection: "row",
          gap: 10,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <SecondaryBtn
          label="Submit Another"
          onPress={resetForm}
          theme={theme}
        />
        {onNavigate && (
          <PrimaryBtn
            label="View My Tickets"
            onPress={() => onNavigate("mytickets")}
            primary={primary}
          />
        )}
      </View>
    </View>
  );

  // ─── Submit handler ──────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError("");
    setSaving(true);
    try {
      const ticketNumber = `CT-${Date.now()}`;

      let summary = "";
      let details = "";
      let category:
        | "CCTV"
        | "Licenses Accounts"
        | "Hardware"
        | "Email"
        | "Network"
        | "Maintenance"
        | "Medicine"
        | "Office Supplies"
        | "Software"
        | "Other" = "Other";
      const ticketPriority: "Low" | "Medium" | "High" =
        priority === "Normal"
          ? "Low"
          : priority === "Urgent"
            ? "Medium"
            : "High";

      if (ticketType === "it") {
        summary = itTitle.trim();
        details = itDesc.trim();
        category =
          itCategory === "Hardware Issues"
            ? "Hardware"
            : itCategory === "Software Issues"
              ? "Software"
              : itCategory === "Network & Internet"
                ? "Network"
                : itCategory === "Printer & Peripherals"
                  ? "Hardware"
                  : itCategory === "Email & Account"
                    ? "Email"
                    : itCategory === "System Access"
                      ? "Licenses Accounts"
                      : "Other";
      } else if (ticketType === "hr") {
        summary = `${hrCategory} – ${hrDate}`;
        details = `Duration: ${hrDuration}h | Time: ${hrStartTime}–${hrEndTime} | Reason: ${hrReason}${hrNotes ? " | Notes: " + hrNotes : ""}`;
        category = "Other";
      } else if (ticketType === "supply") {
        summary = itTitle.trim();
        details = itDesc.trim();
        category = "Office Supplies";
      }

      await addTicket({
        ticketNumber,
        summary,
        details,
        requesterId: user.username,
        requesterName: user.displayName ?? user.username,
        assigneeId: "",
        assigneeName: "",
        category,
        priority: ticketPriority,
        status: "Pending",
        dueDate: new Date(),
      });

      setSubmittedId(`#${ticketNumber}`);
      setStep(4);
    } catch (err: any) {
      console.error("Ticket submit error:", err);
      setError(
        err?.message
          ? `Unable to submit ticket: ${err.message}`
          : "Unable to submit ticket. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setTicketType(null);
    setItCategory("");
    setItTitle("");
    setItDesc("");
    setItDevice("");
    setHrCategory("Overtime Filing");
    setHrDate("");
    setHrDuration("");
    setHrStartTime("");
    setHrEndTime("");
    setHrReason("");
    setHrNotes("");
    setPriority("Normal");
    setError("");
    setSubmittedId("");
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  const renderCurrentStep = () => {
    if (step === 1) return renderStep1();
    if (step === 2) {
      if (ticketType === "it") return renderStep2IT();
      if (ticketType === "hr") return renderStep2HR();
      if (ticketType === "supply") return renderStep2Supply();
    }
    if (step === 3) return renderStep3();
    if (step === 4) return renderStep4();
    return null;
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ padding: 24 }}>
        <StepBar step={step} theme={theme} primary={primary} />
        {renderCurrentStep()}
      </View>
    </ScrollView>
  );
}

// ─── Shared button components ─────────────────────────────────────────────────

function BackButton({ onPress, theme }: { onPress: () => void; theme: any }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginBottom: 20,
      }}
    >
      <ChevronLeft size={16} color={theme.subtext} />
      <Text
        style={{
          fontFamily: "Outfit-SemiBold",
          fontSize: 13,
          color: theme.subtext,
        }}
      >
        Back
      </Text>
    </TouchableOpacity>
  );
}

function PrimaryBtn({
  label,
  onPress,
  primary,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  primary: string;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={{
        backgroundColor: primary,
        borderRadius: 8,
        paddingHorizontal: 22,
        paddingVertical: 11,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {loading && <ActivityIndicator size="small" color="#fff" />}
      <Text
        style={{ fontFamily: "Outfit-SemiBold", fontSize: 13, color: "#fff" }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function SecondaryBtn({
  label,
  onPress,
  theme,
}: {
  label: string;
  onPress: () => void;
  theme: any;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        backgroundColor: theme.surface,
        borderRadius: 8,
        paddingHorizontal: 22,
        paddingVertical: 11,
        borderWidth: 1.5,
        borderColor: theme.border,
      }}
    >
      <Text
        style={{
          fontFamily: "Outfit-SemiBold",
          fontSize: 13,
          color: theme.subtext,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
