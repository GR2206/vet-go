import FontAwesome from '@expo/vector-icons/FontAwesome';
import { View } from 'react-native';

export function Stars({ value, size = 13 }: { value: number; size?: number }) {
  const full = Math.round(value);
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <FontAwesome key={i} name="star" size={size} color={i < full ? '#F5A524' : '#D8D5CF'} />
      ))}
    </View>
  );
}
