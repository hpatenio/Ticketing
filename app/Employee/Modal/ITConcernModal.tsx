import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { X, CheckCircle, ChevronRight, ChevronDown, Monitor } from "lucide-react-native";
import { useTheme } from "../../../theme/ThemeContext";
import { ADUser } from "../../../types";
import { addTicket } from "../../../Services/ticketService";
import { getDropdownOptions } from "../../../Services/dropdownConfigs";
import { DropdownOption } from "../../SuperAdmin/ManageColumnsModal";

// ─── Types ────────────────────────────────────────────────────────────────────

type ModalStep = "form" | "confirm" | "done";
type PriorityValue = "Normal" | "Urgent" | "Critical";

const PRIORITY_OPTIONS: PriorityValue[] = ["Normal", "Urgent", "Critical"];

// Fallback shown if Firestore is unreachable
const FALLBACK_CATEGORIES: DropdownOption[] = [
  { label: "Hardware Issues",       value: "Hardware Issues",       badgeClass: "" },
  { label: "Software Issues",       value: "Software Issues",       badgeClass: "" },
  { label: "Network & Internet",    value: "Network & Internet",    badgeClass: "" },
  { label: "Printer & Peripherals", value: "Printer & Peripherals", badgeClass: "" },
  { label: "Email & Account",       value: "Email & Account",       badgeClass: "" },
  { label: "System Access",         value: "System Access",         badgeClass: "" },
  { label: "Other IT Concerns",     value: "Other IT Concerns",     badgeClass: "" },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  user: ADUser;
  onSuccess?: (ticketNumber: string) => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const MODAL_W = Math.min(SCREEN_W * 0.92, 520);

// Maps the Firestore category label → the addTicket() category union type.
// Falls back to "Other" for any value not explicitly listed.
function mapCategoryValue(
  val: string,
): "Hardware" | "Software" | "Network" | "Email" | "Licenses Accounts" | "Other" {
  const map: Record<string, "Hardware" | "Software" | "Network" | "Email" | "Licenses Accounts" | "Other"> = {
    "Hardware Issues":       "Hardware",
    "Printer & Peripherals": "Hardware",
    "Software Issues":       "Software",
    "Network & Internet":    "Network",
    "Email & Account":       "Email",
    "System Access":         "Licenses Accounts",
  };
  return map[val] ?? "Other";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({
  label, required, children, theme,
}: {
  label: string; required?: boolean; children: React.ReactNode; theme: any;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontFamily: "Outfit-SemiBold", fontSize: 13, color: theme.textActive, marginBottom: 6 }}>
        {label}
        {required && <Text style={{ color: "#EF4444" }}> *</Text>}
      </Text>
      {children}
    </View>
  );
}

// Inline dropdown — trigger row + absolutely-positioned option list (no layout shift)
function CategoryDropdown({
  options, value, onChange, loading, theme, primary,
}: {
  options: DropdownOption[];
  value: DropdownOption | null;
  onChange: (opt: DropdownOption) => void;
  loading: boolean;
  theme: any;
  primary: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <View style={{ zIndex: open ? 999 : 1 }}>
      {/* Trigger */}
      <TouchableOpacity
        onPress={() => !loading && setOpen((o) => !o)}
        activeOpacity={0.8}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: theme.background,
          borderRadius: 8,
          borderWidth: 1.5,
          borderColor: open ? primary : theme.border,
          paddingHorizontal: 13,
          paddingVertical: 11,
        }}
      >
        {loading ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <ActivityIndicator size="small" color={primary} />
            <Text style={{ fontFamily: "Outfit", fontSize: 13, color: theme.subtext }}>
              Loading categories…
            </Text>
          </View>
        ) : (
          <Text
            style={{
              fontFamily: "Outfit",
              fontSize: 13,
              color: value ? theme.textActive : theme.subtext,
              flex: 1,
            }}
          >
            {value ? value.label : "Select a category…"}
          </Text>
        )}
        <ChevronDown
          size={15}
          color={theme.subtext}
          style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}
        />
      </TouchableOpacity>

      {/* Option list — floats over the content below, no layout shift */}
      {open && !loading && (
        <View
          style={{
            position: "absolute",
            top: 46,           // sits just below the trigger
            left: 0,
            right: 0,
            zIndex: 999,
            backgroundColor: theme.surface,
            borderRadius: 8,
            borderWidth: 1.5,
            borderColor: theme.border,
            overflow: "hidden",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 10,
          }}
        >
          <ScrollView
            style={{ maxHeight: 260 }}
            bounces={false}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {options.map((opt, i) => {
              const selected = value?.value === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => { onChange(opt); setOpen(false); }}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    backgroundColor: selected ? (theme.bgActive ?? "#EEF2FF") : "transparent",
                    borderBottomWidth: i < options.length - 1 ? 1 : 0,
                    borderBottomColor: theme.border,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: selected ? "Outfit-SemiBold" : "Outfit",
                      fontSize: 13,
                      color: selected ? primary : theme.textActive,
                    }}
                  >
                    {opt.label}
                  </Text>
                  {selected && (
                    <View
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 4,
                        backgroundColor: primary,
                      }}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function ITConcernModal({ visible, onClose, user, onSuccess }: Props) {
  const { theme } = useTheme();
  const primary = theme.primary ?? "#4169E1";

  const [step, setStep] = useState<ModalStep>("form");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [ticketNumber, setTicketNumber] = useState("");

  // Dynamic categories from Firestore
  const [categories, setCategories] = useState<DropdownOption[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Form fields
  const [category, setCategory] = useState<DropdownOption | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [device, setDevice] = useState("");
  const [priority, setPriority] = useState<PriorityValue>("Normal");

  // ── Fetch ticket_category from Firestore whenever the modal opens ────────────
  useEffect(() => {
    if (!visible) return;
    setLoadingCategories(true);
    getDropdownOptions("ticket_category", FALLBACK_CATEGORIES)
      .then((opts: any[]) => {
        // Strip the virtual "no value" (-) entry — doesn't make sense as a selectable category
        setCategories(opts.filter((o) => o.value !== ""));
      })
      .catch(() => {
        setCategories(FALLBACK_CATEGORIES);
      })
      .finally(() => setLoadingCategories(false));
  }, [visible]);

  // ── Reset form on close ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!visible) {
      setStep("form");
      setCategory(null);
      setTitle("");
      setDescription("");
      setDevice("");
      setPriority("Normal");
      setError("");
      setTicketNumber("");
    }
  }, [visible]);

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
  };

  const handleReview = useCallback(() => {
    setError("");
    if (!category) {
      setError("Please select a category.");
      return;
    }
    if (!title.trim()) {
      setError("Please enter an issue title.");
      return;
    }
    if (!description.trim()) {
      setError("Please describe the issue.");
      return;
    }
    setStep("confirm");
  }, [category, title, description]);

  const handleSubmit = useCallback(async () => {
    setError("");
    setSubmitting(true);
    try {
      const ticketNum = `CT-${Date.now()}`;
      const ticketPriority: "Low" | "Medium" | "High" =
        priority === "Normal" ? "Low" : priority === "Urgent" ? "Medium" : "High";

      await addTicket({
        ticketNumber: ticketNum,
        summary: title.trim(),
        details: description.trim() + (device.trim() ? ` | Device: ${device.trim()}` : ""),
        requesterId: user.username,
        requesterName: user.displayName ?? user.username,
        assigneeId: "",
        assigneeName: "",
        category: category?.value ?? "",
        priority: ticketPriority,
        status: "Pending",
        dueDate: new Date(),
      });

      setTicketNumber(`#${ticketNum}`);
      setStep("done");
      onSuccess?.(`#${ticketNum}`);
    } catch (err: any) {
      setError(err?.message ?? "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [category, title, description, device, priority, user, onSuccess]);

  const MODAL_H = SCREEN_H * 0.88;

  const priorityColors: Record<PriorityValue, string> = {
    Normal: "#10B981",
    Urgent: "#F59E0B",
    Critical: "#EF4444",
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        {/* Backdrop */}
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          {/* Modal card */}
          <View
            style={{
              width: MODAL_W,
              maxHeight: MODAL_H,
              backgroundColor: theme.surface,
              borderRadius: 20,
              overflow: "hidden",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.25,
              shadowRadius: 24,
              elevation: 16,
            }}
          >

            {/* ════════ FORM STEP ════════ */}
            {step === "form" && (
              <View style={{ height: MODAL_H }}>
                {/* Header */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 20,
                    paddingTop: 18,
                    paddingBottom: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border,
                  }}
                >
                  <View>
                    <Text style={{ fontFamily: "Outfit-SemiBold", fontSize: 16, color: theme.textActive }}>
                      💻 IT Concern
                    </Text>
                    <Text style={{ fontFamily: "Outfit", fontSize: 11, color: theme.subtext, marginTop: 2 }}>
                      Describe your issue and we'll get it resolved
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={onClose}
                    activeOpacity={0.7}
                    style={{
                      width: 30, height: 30, borderRadius: 15,
                      backgroundColor: theme.background,
                      alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <X size={15} color={theme.subtext} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{ padding: 20 }}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* ── Category — zIndex wrapper lets the floating list overlay siblings ── */}
                  <View style={{ zIndex: 100, marginBottom: 16 }}>
                    <Text
                      style={{
                        fontFamily: "Outfit-SemiBold",
                        fontSize: 13,
                        color: theme.textActive,
                        marginBottom: 6,
                      }}
                    >
                      IT Category<Text style={{ color: "#EF4444" }}> *</Text>
                    </Text>
                    <CategoryDropdown
                      options={categories}
                      value={category}
                      onChange={setCategory}
                      loading={loadingCategories}
                      theme={theme}
                      primary={primary}
                    />
                  </View>

                  {/* ── Title ── */}
                  <Field label="Issue Title" required theme={theme}>
                    <TextInput
                      style={inputStyle}
                      placeholder="e.g. Cannot connect to Wi-Fi"
                      placeholderTextColor={theme.subtext}
                      value={title}
                      onChangeText={setTitle}
                    />
                  </Field>

                  {/* ── Description ── */}
                  <Field label="Description" required theme={theme}>
                    <TextInput
                      style={[inputStyle, { height: 110, textAlignVertical: "top" }]}
                      placeholder="Describe the problem in detail — what happened, when it started, what you've already tried…"
                      placeholderTextColor={theme.subtext}
                      multiline
                      value={description}
                      onChangeText={setDescription}
                    />
                  </Field>

                  {/* ── Device ── */}
                  <Field label="Affected Device / Asset (optional)" theme={theme}>
                    <TextInput
                      style={inputStyle}
                      placeholder="e.g. Dell Laptop — Asset Tag #0034"
                      placeholderTextColor={theme.subtext}
                      value={device}
                      onChangeText={setDevice}
                    />
                  </Field>

                  {/* ── Priority ── */}
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
                            backgroundColor: priority === opt ? priorityColors[opt] : theme.background,
                            borderWidth: 1.5,
                            borderColor: priority === opt ? priorityColors[opt] : theme.border,
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
                    <Text style={{ fontFamily: "Outfit", fontSize: 11, color: theme.subtext, marginTop: 5 }}>
                      Use Urgent or Critical only if this significantly affects your work.
                    </Text>
                  </Field>

                  {error ? (
                    <View
                      style={{
                        backgroundColor: "#FEF2F2", borderWidth: 1,
                        borderColor: "#FECACA", borderRadius: 8, padding: 11, marginTop: 4,
                      }}
                    >
                      <Text style={{ fontFamily: "Outfit", fontSize: 12, color: "#DC2626" }}>
                        ⚠ {error}
                      </Text>
                    </View>
                  ) : null}
                </ScrollView>

                {/* Footer */}
                <View
                  style={{
                    paddingHorizontal: 16, paddingVertical: 14,
                    borderTopWidth: 1, borderTopColor: theme.border,
                  }}
                >
                  <TouchableOpacity
                    onPress={handleReview}
                    activeOpacity={0.8}
                    style={{
                      backgroundColor: primary, borderRadius: 10,
                      paddingVertical: 13, alignItems: "center",
                      justifyContent: "center", flexDirection: "row", gap: 8,
                    }}
                  >
                    <Text style={{ fontFamily: "Outfit-SemiBold", fontSize: 14, color: "#fff" }}>
                      Review Request
                    </Text>
                    <ChevronRight size={15} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ════════ CONFIRM STEP ════════ */}
            {step === "confirm" && (
              <View style={{ height: MODAL_H }}>
                {/* Header */}
                <View
                  style={{
                    flexDirection: "row", alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14,
                    borderBottomWidth: 1, borderBottomColor: theme.border,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => setStep("form")}
                    activeOpacity={0.7}
                    style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                  >
                    <Text style={{ fontSize: 18, color: theme.subtext, lineHeight: 20 }}>‹</Text>
                    <Text style={{ fontFamily: "Outfit-SemiBold", fontSize: 13, color: theme.subtext }}>
                      Back
                    </Text>
                  </TouchableOpacity>
                  <Text style={{ fontFamily: "Outfit-SemiBold", fontSize: 15, color: theme.textActive }}>
                    Review Request
                  </Text>
                  <TouchableOpacity
                    onPress={onClose}
                    activeOpacity={0.7}
                    style={{
                      width: 30, height: 30, borderRadius: 15,
                      backgroundColor: theme.background,
                      alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <X size={15} color={theme.subtext} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{ padding: 20 }}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Summary card */}
                  <View
                    style={{
                      backgroundColor: theme.background, borderWidth: 1.5,
                      borderColor: theme.border, borderRadius: 12,
                      padding: 15, marginBottom: 18,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Outfit-SemiBold", fontSize: 10, color: theme.subtext,
                        textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 10,
                      }}
                    >
                      Request Summary
                    </Text>
                    {[
                      { label: "Submitted by", value: user.displayName ?? user.username },
                      {
                        label: "Date",
                        value: new Date().toLocaleDateString("en-US", {
                          year: "numeric", month: "long", day: "numeric",
                        }),
                      },
                      { label: "Category", value: category?.label ?? "—" },
                      { label: "Priority", value: priority },
                    ].map((row, i, arr) => (
                      <View
                        key={row.label}
                        style={{
                          flexDirection: "row", justifyContent: "space-between",
                          alignItems: "center", paddingVertical: 7,
                          borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                          borderBottomColor: theme.border,
                        }}
                      >
                        <Text style={{ fontFamily: "Outfit", fontSize: 13, color: theme.subtext }}>
                          {row.label}
                        </Text>
                        {row.label === "Priority" ? (
                          <View
                            style={{
                              backgroundColor: priorityColors[priority] + "20",
                              borderRadius: 100, paddingHorizontal: 10, paddingVertical: 3,
                              borderWidth: 1, borderColor: priorityColors[priority] + "60",
                            }}
                          >
                            <Text
                              style={{
                                fontFamily: "Outfit-SemiBold", fontSize: 12,
                                color: priorityColors[priority],
                              }}
                            >
                              {row.value}
                            </Text>
                          </View>
                        ) : (
                          <Text
                            style={{
                              fontFamily: "Outfit-SemiBold", fontSize: 13,
                              color: theme.textActive, flexShrink: 1,
                              textAlign: "right", maxWidth: "60%",
                            }}
                          >
                            {row.value}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>

                  {/* Issue detail card */}
                  <Text style={{ fontFamily: "Outfit-SemiBold", fontSize: 13, color: theme.textActive, marginBottom: 10 }}>
                    Issue Details
                  </Text>
                  <View
                    style={{
                      backgroundColor: theme.background, borderWidth: 1,
                      borderColor: theme.border, borderRadius: 10,
                      padding: 14, marginBottom: 10,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <View
                        style={{
                          width: 36, height: 36, borderRadius: 9,
                          backgroundColor: "#EEF2FF", borderWidth: 1, borderColor: "#C7D2FE",
                          alignItems: "center", justifyContent: "center",
                        }}
                      >
                        <Monitor size={16} color={primary} />
                      </View>
                      <Text style={{ fontFamily: "Outfit-SemiBold", fontSize: 14, color: theme.textActive, flex: 1 }}>
                        {title}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontFamily: "Outfit", fontSize: 13, color: theme.subtext,
                        lineHeight: 20, marginBottom: device.trim() ? 10 : 0,
                      }}
                    >
                      {description}
                    </Text>
                    {device.trim() ? (
                      <View
                        style={{
                          flexDirection: "row", alignItems: "center", gap: 6,
                          paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.border,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: "Outfit-SemiBold", fontSize: 11, color: theme.subtext,
                            textTransform: "uppercase", letterSpacing: 0.5,
                          }}
                        >
                          Device:
                        </Text>
                        <Text style={{ fontFamily: "Outfit", fontSize: 12, color: theme.textActive }}>
                          {device}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {error ? (
                    <View
                      style={{
                        backgroundColor: "#FEF2F2", borderWidth: 1,
                        borderColor: "#FECACA", borderRadius: 8, padding: 11, marginTop: 8,
                      }}
                    >
                      <Text style={{ fontFamily: "Outfit", fontSize: 12, color: "#DC2626" }}>
                        ⚠ {error}
                      </Text>
                    </View>
                  ) : null}
                </ScrollView>

                {/* Footer */}
                <View
                  style={{
                    padding: 16, borderTopWidth: 1, borderTopColor: theme.border,
                    flexDirection: "row", gap: 10,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => setStep("form")}
                    activeOpacity={0.8}
                    style={{
                      flex: 1, paddingVertical: 12, borderRadius: 10,
                      borderWidth: 1.5, borderColor: theme.border, alignItems: "center",
                    }}
                  >
                    <Text style={{ fontFamily: "Outfit-SemiBold", fontSize: 13, color: theme.subtext }}>
                      Edit
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={submitting}
                    activeOpacity={0.8}
                    style={{
                      flex: 2, paddingVertical: 12, borderRadius: 10,
                      backgroundColor: primary, alignItems: "center",
                      justifyContent: "center", flexDirection: "row", gap: 8,
                      opacity: submitting ? 0.6 : 1,
                    }}
                  >
                    {submitting
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <CheckCircle size={15} color="#fff" />
                    }
                    <Text style={{ fontFamily: "Outfit-SemiBold", fontSize: 13, color: "#fff" }}>
                      {submitting ? "Submitting…" : "Confirm & Submit"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ════════ DONE STEP ════════ */}
            {step === "done" && (
              <View style={{ alignItems: "center", justifyContent: "center", padding: 40 }}>
                <Text style={{ fontSize: 56, marginBottom: 16 }}>🎉</Text>
                <Text
                  style={{
                    fontFamily: "Outfit-SemiBold", fontSize: 20,
                    color: theme.textActive, marginBottom: 8, textAlign: "center",
                  }}
                >
                  Ticket Submitted!
                </Text>
                <Text
                  style={{
                    fontFamily: "Outfit", fontSize: 13, color: theme.subtext,
                    textAlign: "center", lineHeight: 21, marginBottom: 24,
                  }}
                >
                  Your IT concern has been received.{"\n"}The IT team will review and respond shortly.
                </Text>
                <View
                  style={{
                    backgroundColor: theme.background, borderWidth: 1.5,
                    borderColor: primary, borderRadius: 12,
                    paddingHorizontal: 24, paddingVertical: 14, marginBottom: 28,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Outfit", fontSize: 10, color: theme.subtext,
                      textAlign: "center", marginBottom: 4,
                      textTransform: "uppercase", letterSpacing: 0.7,
                    }}
                  >
                    Ticket Number
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Outfit-SemiBold", fontSize: 20,
                      color: primary, letterSpacing: 1.5, textAlign: "center",
                    }}
                  >
                    {ticketNumber}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  activeOpacity={0.8}
                  style={{ backgroundColor: primary, borderRadius: 10, paddingHorizontal: 32, paddingVertical: 12 }}
                >
                  <Text style={{ fontFamily: "Outfit-SemiBold", fontSize: 14, color: "#fff" }}>
                    Done
                  </Text>
                </TouchableOpacity>
              </View>
            )}

          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
