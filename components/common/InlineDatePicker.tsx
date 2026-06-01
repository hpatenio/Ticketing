import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
} from "react-native";

type Props = {
  value: string;
  initialDate?: Date;
  onConfirm: (date: Date) => Promise<void> | void;
};

const daysOfWeek = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const InlineDatePicker: React.FC<Props> = ({ value, initialDate, onConfirm }) => {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate ?? new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date(initialDate ?? new Date()));
  const [dropPos, setDropPos] = useState({ x: 0, y: 0, width: 0 });
  const triggerRef = useRef<any>(null);

  useEffect(() => {
    if (initialDate) {
      setSelectedDate(initialDate);
      setCurrentMonth(new Date(initialDate));
    }
  }, [initialDate]);

  const openPicker = () => {
    triggerRef.current?.measure((_fx: number, _fy: number, width: number, height: number, px: number, py: number) => {
      setDropPos({ x: px, y: py + height + 6, width });
      setOpen(true);
    });
  };

  const handleConfirm = async () => {
    setOpen(false);
    try {
      await onConfirm(selectedDate);
    } catch (err) {
      console.error("InlineDatePicker confirm failed:", err);
    }
  };

  const handleDaySelect = (day: number) => {
    setSelectedDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const monthLabel = currentMonth.toLocaleString("default", { month: "long", year: "numeric" });
  const firstDayIndex = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();

  const dayCells = [];
  for (let i = 0; i < firstDayIndex; i += 1) {
    dayCells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    dayCells.push(day);
  }

  const isSelectedDay = (day: number) => {
    return (
      selectedDate.getFullYear() === currentMonth.getFullYear() &&
      selectedDate.getMonth() === currentMonth.getMonth() &&
      selectedDate.getDate() === day
    );
  };

  return (
    <View>
      <TouchableOpacity
        ref={triggerRef}
        onPress={openPicker}
        activeOpacity={0.8}
        className="bg-slate-100 border border-slate-300 rounded-lg px-2 py-1"
      >
        <Text className="text-xs text-slate-900">{value}</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="none" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              top: dropPos.y,
              left: dropPos.x,
              minWidth: Math.max(dropPos.width, 220),
              backgroundColor: "#ffffff",
              borderRadius: 14,
              padding: 12,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.15,
              shadowRadius: 18,
              elevation: 20,
              zIndex: 9999,
            }}
          >
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-sm font-semibold text-slate-900">Select due date</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Text className="text-blue-600 text-sm">Close</Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row items-center justify-between mb-3">
              <TouchableOpacity onPress={handlePrevMonth} className="px-2 py-1 rounded-lg bg-slate-100">
                <Text className="text-slate-700">‹</Text>
              </TouchableOpacity>
              <Text className="text-sm font-semibold text-slate-900">{monthLabel}</Text>
              <TouchableOpacity onPress={handleNextMonth} className="px-2 py-1 rounded-lg bg-slate-100">
                <Text className="text-slate-700">›</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 8 }}>
              {daysOfWeek.map((day) => (
                <View key={day} style={{ width: `${100 / 7}%` }}>
                  <Text className="text-[10px] text-slate-500 text-center font-semibold">{day}</Text>
                </View>
              ))}
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {dayCells.map((day, index) => (
                <TouchableOpacity
                  key={`${day ?? "empty"}-${index}`}
                  onPress={() => day && handleDaySelect(day)}
                  disabled={!day}
                  style={{
                    width: `${100 / 7}%`,
                    height: 36,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 999,
                    backgroundColor: day
                      ? isSelectedDay(day)
                        ? "#2563eb"
                        : "#f8fafc"
                      : "transparent",
                    marginBottom: 6,
                  }}
                >
                  <Text style={{
                    fontSize: 14,
                    fontWeight: day ? "600" : "400",
                    color: isSelectedDay(day as number)
                      ? "#ffffff"
                      : day
                      ? "#0f172a"
                      : "transparent",
                  }}>
                    {day || ""}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleConfirm}
              className="bg-blue-600 rounded-xl px-4 py-2 items-center mt-4"
            >
              <Text className="text-white text-sm font-semibold">Confirm</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

export default InlineDatePicker;
