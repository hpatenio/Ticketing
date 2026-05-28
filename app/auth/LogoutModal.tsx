import { Modal, View, Text, TouchableOpacity, Platform } from "react-native";

type Props = {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function LogoutModal({ visible, onConfirm, onCancel }: Props) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.25)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 16,
            padding: 28,
            width: 320,
            shadowColor: "#000",
            shadowOpacity: 0.12,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 4 },
            elevation: 8,
          }}
        >
          <Text
            style={{
              fontFamily: "DMSans_600SemiBold",
              fontSize: 16,
              color: "#1D4B5C",
              marginBottom: 8,
            }}
          >
            Log out
          </Text>
          <Text
            style={{
              fontFamily: "DMSans_400Regular",
              fontSize: 13.5,
              color: "#669BAE",
              marginBottom: 24,
            }}
          >
            Are you sure you want to log out?
          </Text>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              onPress={onCancel}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "#E8F4F8",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: "DMSans_600SemiBold",
                  fontSize: 13.5,
                  color: "#669BAE",
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onConfirm}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: "#35A2CA",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: "DMSans_600SemiBold",
                  fontSize: 13.5,
                  color: "#fff",
                }}
              >
                Log out
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}