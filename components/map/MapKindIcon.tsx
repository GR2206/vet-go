import { View } from 'react-native';

import type { PlaceKind } from '@/data/types';

type Kind = 'walk' | PlaceKind;

export function MapKindIcon({ kind, selected }: { kind: Kind; selected?: boolean }) {
  const s = selected ? 1.12 : 1;
  return (
    <View collapsable={false} style={{ alignItems: 'center', transform: [{ scale: s }] }}>
      {kind === 'walk' ? (
        <WalkMark />
      ) : kind === 'petshop' ? (
        <ShopMark />
      ) : kind === 'vet' || kind === 'vet24' ? (
        <CrossMark color={kind === 'vet24' ? '#C85A5A' : '#2F9E6B'} />
      ) : (
        <CutMark />
      )}
    </View>
  );
}

function WalkMark() {
  const c = '#2F8F74';
  return (
    <View style={{ width: 16, height: 22, alignItems: 'center' }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c }} />
      <View style={{ width: 2, height: 7, borderRadius: 1, backgroundColor: c, marginTop: 1 }} />
      <View style={{ flexDirection: 'row', marginTop: 0 }}>
        <View style={{ width: 2, height: 7, borderRadius: 1, backgroundColor: c, transform: [{ rotate: '26deg' }] }} />
        <View
          style={{
            width: 2,
            height: 7,
            borderRadius: 1,
            backgroundColor: c,
            marginLeft: 3,
            transform: [{ rotate: '-20deg' }],
          }}
        />
      </View>
    </View>
  );
}

function ShopMark() {
  return (
    <View style={{ width: 18, height: 18, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', height: 5, width: 18 }}>
        <View style={{ flex: 1, backgroundColor: '#C45C5A' }} />
        <View style={{ flex: 1, backgroundColor: '#FBFAF8' }} />
        <View style={{ flex: 1, backgroundColor: '#C45C5A' }} />
        <View style={{ flex: 1, backgroundColor: '#FBFAF8' }} />
      </View>
      <View style={{ width: 14, height: 10, backgroundColor: '#D8C4A4', alignItems: 'center', justifyContent: 'flex-end' }}>
        <View style={{ width: 4, height: 6, backgroundColor: '#3B74B0' }} />
      </View>
    </View>
  );
}

function CrossMark({ color }: { color: string }) {
  return (
    <View style={{ width: 16, height: 16, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: 5, height: 16, borderRadius: 1, backgroundColor: color }} />
      <View style={{ position: 'absolute', width: 16, height: 5, borderRadius: 1, backgroundColor: color }} />
    </View>
  );
}

function CutMark() {
  const c = '#7A72C4';
  return (
    <View style={{ width: 16, height: 16, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, borderWidth: 1.5, borderColor: c }} />
      <View style={{ width: 1.5, height: 8, backgroundColor: c, marginTop: -1, transform: [{ rotate: '-28deg' }] }} />
    </View>
  );
}
