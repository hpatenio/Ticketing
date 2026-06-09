import React, { useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  useWindowDimensions,
  InteractionManager,
} from "react-native";
import { useTheme } from "../../theme/ThemeContext";

// ─── types ───────────────────────────────────────────────────────────────────

export interface AssigneeOption {
  /** Unique ID stored in the asset (e.g. Firebase UID) */
  value: string;
  /** Full display name, e.g. "Mario Natan Jr." */
  label: string;
  /** Optional: whether this person is the currently logged-in user */
  isMe?: boolean;
}

interface Props {
  /** Current assignee ID */
  value: string | null | undefined;
  /** List of people to show */
  options: AssigneeOption[];
  /** Called with the selected value when the user picks someone */
  onSelect: (value: string) => void;
  /** Placeholder shown when no assignee is set */
  placeholder?: string;
  /** Name to show in chip when value does not match any option (e.g. legacy name-only records) */
  fallbackName?: string;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Returns up to 2 initials from a full name */
const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/** Deterministic pastel-ish avatar background from name */
const AVATAR_COLORS = [
  "#5b8dee", // blue
  "#e85d6b", // red
  "#3ab08f", // teal
  "#f5a623", // orange
  "#9b59b6", // purple
  "#1abc9c", // emerald
  "#e67e22", // amber
  "#2980b9", // sky
];
const avatarColor = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

// ─── Avatar chip shown inside the table cell ─────────────────────────────────

const AssigneeChip: React.FC<{
  name: string | null;
  placeholder: string;
  theme: any;
}> = ({ name, placeholder, theme }) => {
  if (!name) {
    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          paddingHorizontal: 8,
          paddingVertical: 4,
          backgroundColor: theme.surface,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: theme.border,
        }}
      >
        <Text style={{ fontSize: 11, color: theme.subtext }}>{placeholder}</Text>
        <Text style={{ fontSize: 10, color: theme.subtext, opacity: 0.6 }}>▾</Text>
      </View>
    );
  }

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 6,
        paddingVertical: 3,
        backgroundColor: theme.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.border,
      }}
    >
      {/* Mini avatar */}
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: avatarColor(name),
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 9, fontWeight: "500", color: "#fff" }}>
          {getInitials(name)}
        </Text>
      </View>
      <Text
        style={{ fontSize: 11, color: theme.text, maxWidth: 70 }}
        numberOfLines={1}
      >
        {name.split(" ").slice(-1)[0]}
      </Text>
      <Text style={{ fontSize: 10, color: theme.subtext, opacity: 0.6 }}>▾</Text>
    </View>
  );
};

// ─── Row inside the dropdown list ────────────────────────────────────────────

const PersonRow: React.FC<{
  option: AssigneeOption;
  isSelected: boolean;
  onPress: () => void;
  theme: any;
}> = ({ option, isSelected, onPress, theme }) => {
  const bg = avatarColor(option.label);
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: isSelected
          ? theme.mode === "dark"
            ? "rgba(255,255,255,0.08)"
            : "rgba(0,0,0,0.05)"
          : "transparent",
        borderRadius: 8,
        marginHorizontal: 4,
        marginVertical: 1,
        gap: 10,
      }}
    >
      {/* Avatar circle */}
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: "500", color: "#fff" }}>
          {getInitials(option.label)}
        </Text>
      </View>

      {/* Name */}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 13,
            color: theme.text,
            fontWeight: isSelected ? "500" : "300",
          }}
        >
          {option.label}
          {option.isMe ? (
            <Text style={{ fontSize: 12, color: theme.subtext }}> (Me)</Text>
          ) : null}
        </Text>
      </View>

      {/* Selected checkmark */}
      {isSelected && (
        <Text style={{ fontSize: 14, color: "#3b82f6" }}>✓</Text>
      )}
    </TouchableOpacity>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const AssigneeDropdown: React.FC<Props> = ({
  value,
  options,
  onSelect,
  placeholder = "Unassigned",
  fallbackName,
}) => {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const triggerRef = useRef<View>(null);
  const searchInputRef = useRef<TextInput>(null);
  const [anchorY, setAnchorY] = useState(0);
  const [anchorX, setAnchorX] = useState(0);
  const { width: screenW, height: screenH } = useWindowDimensions();

  const DROPDOWN_WIDTH = 260;
  const DROPDOWN_MAX_HEIGHT = 320;

  const selectedOption = options.find((o) => o.value === value);

  const filtered = search.trim()
    ? options.filter((o) =>
        o.label.toLowerCase().includes(search.trim().toLowerCase())
      )
    : options;

  // Sort: "Me" first, then alphabetical
  const sorted = [...filtered].sort((a, b) => {
    if (a.isMe) return -1;
    if (b.isMe) return 1;
    return a.label.localeCompare(b.label);
  });

  const meOptions = sorted.filter((o) => o.isMe);
  const peopleOptions = sorted.filter((o) => !o.isMe);

  const openDropdown = () => {
    triggerRef.current?.measureInWindow((x, y, w, h) => {
      // Position below the trigger; flip left if it would overflow right edge
      let left = x;
      if (left + DROPDOWN_WIDTH > screenW - 8) {
        left = screenW - DROPDOWN_WIDTH - 8;
      }
      setAnchorX(left);
      // Place below trigger; flip up if not enough space below
      const spaceBelow = screenH - (y + h);
      if (spaceBelow < DROPDOWN_MAX_HEIGHT + 16) {
        setAnchorY(y - DROPDOWN_MAX_HEIGHT - 4);
      } else {
        setAnchorY(y + h + 4);
      }
      setSearch("");
      setOpen(true);
      // Focus the search input after the modal animation completes
      InteractionManager.runAfterInteractions(() => {
        searchInputRef.current?.focus();
      });
    });
  };

  const handleSelect = (val: string) => {
    onSelect(val);
    setOpen(false);
    setSearch("");
  };

  return (
    <>
      {/* Trigger */}
      <View ref={triggerRef} collapsable={false}>
        <TouchableOpacity onPress={openDropdown} activeOpacity={0.7}>
          <AssigneeChip
            name={selectedOption?.label ?? fallbackName ?? null}
            placeholder={placeholder}
            theme={theme}
          />
        </TouchableOpacity>
      </View>

      {/* Dropdown modal */}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        {/* Backdrop */}
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        />

        {/* Floating panel */}
        <View
          style={{
            position: "absolute",
            top: anchorY,
            left: anchorX,
            width: DROPDOWN_WIDTH,
            maxHeight: DROPDOWN_MAX_HEIGHT,
            backgroundColor: theme.mode === "dark" ? "#1e1e2e" : "#ffffff",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: theme.mode === "dark" ? 0.5 : 0.15,
            shadowRadius: 20,
            elevation: 12,
            overflow: "hidden",
          }}
        >
          {/* Search bar */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderBottomWidth: 1,
              borderBottomColor:
                theme.mode === "dark"
                  ? "rgba(255,255,255,0.07)"
                  : "rgba(0,0,0,0.06)",
              gap: 8,
            }}
          >
            <Text style={{ fontSize: 14, color: theme.subtext }}>🔍</Text>
            <TextInput
              ref={searchInputRef}
              value={search}
              onChangeText={setSearch}
              placeholder="Search or enter email..."
              placeholderTextColor={theme.subtext}
              style={{
                flex: 1,
                fontSize: 13,
                color: theme.text,
                paddingVertical: 2,
              }}
            />
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={{ paddingVertical: 6 }}
          >
            {/* "Me" section */}
            {meOptions.length > 0 && (
              <>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "500",
                    color: theme.subtext,
                    textTransform: "uppercase",
                    letterSpacing: 0.6,
                    paddingHorizontal: 16,
                    paddingTop: 6,
                    paddingBottom: 4,
                  }}
                >
                  Me
                </Text>
                {meOptions.map((o) => (
                  <PersonRow
                    key={o.value}
                    option={o}
                    isSelected={o.value === value}
                    onPress={() => handleSelect(o.value)}
                    theme={theme}
                  />
                ))}
              </>
            )}

            {/* "People" section */}
            {peopleOptions.length > 0 && (
              <>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "500",
                    color: theme.subtext,
                    textTransform: "uppercase",
                    letterSpacing: 0.6,
                    paddingHorizontal: 16,
                    paddingTop: meOptions.length > 0 ? 10 : 6,
                    paddingBottom: 4,
                  }}
                >
                  People
                </Text>
                {peopleOptions.map((o) => (
                  <PersonRow
                    key={o.value}
                    option={o}
                    isSelected={o.value === value}
                    onPress={() => handleSelect(o.value)}
                    theme={theme}
                  />
                ))}
              </>
            )}

            {sorted.length === 0 && (
              <Text
                style={{
                  fontSize: 12,
                  color: theme.subtext,
                  textAlign: "center",
                  paddingVertical: 20,
                }}
              >
                No results
              </Text>
            )}

            {/* Unassign option */}
            <View
              style={{
                marginTop: 4,
                marginHorizontal: 4,
                borderTopWidth: 1,
                borderTopColor:
                  theme.mode === "dark"
                    ? "rgba(255,255,255,0.07)"
                    : "rgba(0,0,0,0.06)",
                paddingTop: 4,
                paddingBottom: 4,
              }}
            >
              <TouchableOpacity
                onPress={() => handleSelect("")}
                activeOpacity={0.7}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  gap: 10,
                  borderRadius: 8,
                  marginHorizontal: 0,
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor:
                      theme.mode === "dark"
                        ? "rgba(255,255,255,0.08)"
                        : "#f3f4f6",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 14, color: theme.subtext }}>✕</Text>
                </View>
                <Text style={{ fontSize: 13, color: theme.subtext }}>
                  Unassign
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

export default AssigneeDropdown;
