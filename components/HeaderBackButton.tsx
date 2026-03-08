import { TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';

export default function HeaderBackButton() {
  return (
    <TouchableOpacity
      onPress={() => router.navigate('/(tabs)/dashboard' as any)}
      style={styles.button}
      hitSlop={8}
      activeOpacity={0.6}
    >
      <ChevronLeft size={28} color={Colors.text.secondary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    marginRight: 4,
    marginLeft: -4,
  },
});
