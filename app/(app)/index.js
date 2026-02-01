import { View, StyleSheet } from "react-native"
import { Text, Button } from "react-native-paper"
import { useAuth } from "../../src/contexts/AuthContext"
import { router } from "expo-router"

export default function HomeScreen() {
  const { session, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    router.replace("/(auth)/welcome")
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        Welcome to Flare
      </Text>
      <Text variant="bodyLarge" style={styles.subtitle}>
        {session?.user?.email}
      </Text>

      <Button
        mode="contained"
        onPress={() => router.push("/(app)/settings/security")}
        style={styles.button}
      >
        Settings
      </Button>
      <Button mode="outlined" onPress={handleSignOut} style={styles.button}>
        Sign Out
      </Button>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    marginBottom: 10,
  },
  subtitle: {
    marginBottom: 30,
    opacity: 0.7,
  },
  button: {
    marginTop: 20,
  },
})
