import { useLocalSearchParams } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { places, plans } from '@/data/mock';
import { formatARS } from '@/lib/format';
import { useApp } from '@/store/app-store';
import { colors, fonts, surface } from '@/theme/tokens';

export default function PlanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const plan = plans.find((p) => p.id === id);
  const place = places.find((p) => p.id === plan?.placeId);
  const { subscribePlan } = useApp();

  if (!plan) {
    return (
      <View style={styles.center}>
        <Text>Plan no encontrado</Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <Text style={styles.kicker}>{place?.name}</Text>
      <Text style={styles.title}>{plan.name}</Text>
      <Text style={styles.price}>{formatARS(plan.price)} / mes</Text>
      <View style={styles.card}>
        {plan.perks.map((perk) => (
          <Text key={perk} style={styles.perk}>
            · {perk}
          </Text>
        ))}
      </View>
      <Text style={styles.note}>
        El local arma este paquete. PETS&GO cobra la mensualidad, emite el bono QR y retiene el canon.
      </Text>
      <Button
        label="Suscribirme"
        onPress={() => {
          subscribePlan(plan.id);
          Alert.alert('Plan activo', `Ya tenés los bonos de ${plan.name} en tu perfil.`);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.cream, padding: 18 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  kicker: { fontFamily: fonts.sansSemi, color: colors.muted },
  title: { fontFamily: fonts.display, fontSize: 32, color: colors.ink, marginTop: 4 },
  price: { fontFamily: fonts.sansExtra, color: colors.teal, fontSize: 20, marginVertical: 12 },
  card: {
    ...surface,
    padding: 16,
    marginBottom: 16,
  },
  perk: { fontFamily: fonts.sans, color: colors.ink, lineHeight: 26, fontSize: 16 },
  note: { fontFamily: fonts.sans, color: colors.muted, marginBottom: 18, lineHeight: 20 },
});
