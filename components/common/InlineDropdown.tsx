import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  Pressable,
} from "react-native";

interface Option {
  label: string;
  value: string;
  color?: string; // optional badge color e.g. "bg-pink-500"
}

interface Props {
  value: string;
  options: readonly Option[];
  onSelect: (value: string) => Promise<void>;
  renderBadge?: (value: string) => React.ReactNode;
  showSearch?: boolean;
  searchPlaceholder?: string;
}

const InlineDropdown: React.FC<Props> = ({
  value,
  options,
  onSelect,
  renderBadge,
  showSearch = false,
  searchPlaceholder = "Search...",
}) => {
  const [open, setOpen]     = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const triggerRef          = useRef<View>(null);
  const [dropPos, setDropPos] = useState({ x: 0, y: 0, width: 0 });

  const openDropdown = () => {
    triggerRef.current?.measure((_fx, _fy, width, height, px, py) => {
      setDropPos({ x: px, y: py + height + 4, width });
      setOpen(true);
    });
  };

  const handleSelect = async (val: string) => {
    if (val === value) {
      setOpen(false);
      return;
    }
    setSaving(true);
    setOpen(false);
    try {
      await onSelect(val);
    } catch (err) {
      console.error("Failed to update:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View>
      {/* Trigger button */}
      <TouchableOpacity
        ref={triggerRef}
        onPress={openDropdown}
        disabled={saving}
        activeOpacity={0.8}
      >
        {saving ? (
          <View className="flex-row items-center gap-1 px-2 py-1 bg-gray-100 rounded-lg">
            <ActivityIndicator size="small" color="#3b82f6" />
          </View>
        ) : renderBadge ? (
          renderBadge(value)
        ) : (
          <View className="flex-row items-center gap-1 px-2 py-1 bg-gray-100 rounded-lg border border-gray-200">
            <Text className="text-xs text-gray-700 flex-1">{value || "—"}</Text>
            <Text className="text-xs text-gray-400">▾</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Dropdown — positioned absolutely below trigger */}
      <Modal
        visible={open}
        transparent
        animationType="none"
        onRequestClose={() => setOpen(false)}
      >
        {/* Full screen pressable to close on outside tap */}
        <Pressable
          style={{ flex: 1 }}
          onPress={() => setOpen(false)}
        >
          {/* Dropdown box — positioned at trigger location */}
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              top: dropPos.y,
              left: dropPos.x,
              minWidth: Math.max(dropPos.width, 130),
              backgroundColor: "#1e1e2e",  // dark background like screenshot
              borderRadius: 10,
              paddingVertical: 6,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 10,
              zIndex: 9999,
            }}
          >
            {showSearch && (
              <View className="px-2 pb-2 pt-1">
                <View className="flex-row items-center bg-gray-800 rounded-lg px-2 py-1.5">
                  <Text className="text-gray-400 text-xs mr-1">🔍</Text>
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder={searchPlaceholder}
                    placeholderTextColor="#9ca3af"
                    className="text-xs text-gray-200 flex-1"
                    style={{ minWidth: 100 }}
                  />
                </View>
              </View>
            )}

            <FlatList
              data={showSearch && searchQuery.trim().length > 0 ? options.filter((item) =>
                item.label.toLowerCase().includes(searchQuery.trim().toLowerCase())
              ) : options}
              keyExtractor={(item) => item.value}
              scrollEnabled={options.length > 6}
              style={{ maxHeight: 220 }}
              ListEmptyComponent={
                showSearch ? (
                  <View className="px-3 py-2">
                    <Text className="text-gray-400 text-xs">No results found.</Text>
                  </View>
                ) : null
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleSelect(item.value)}
                  className="px-3 py-1.5 mx-1 my-0.5"
                >
                  {item.color ? (
                    <View
                      className={`self-start px-3 py-1 rounded-md ${item.color} ${
                        item.value === value ? "ring-2 ring-white opacity-100" : "opacity-90"
                      }`}
                    >
                      <Text className="text-white text-xs font-semibold">
                        {item.label}
                      </Text>
                    </View>
                  ) : (
                    <Text
                      className={`text-sm ${
                        item.value === value
                          ? "text-blue-400 font-semibold"
                          : "text-gray-200"
                      }`}
                    >
                      {item.value === value ? "— " : ""}{item.label}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

export default InlineDropdown;