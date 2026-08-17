import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/theme/tokens';

type Props = {
  text?: string;
  started?: boolean;
  onDone?: () => void;
  msPerChar?: number;
};

export function TypewriterTitle({
  text = 'PETS&GO',
  started = true,
  onDone,
  msPerChar = 118,
}: Props) {
  const [count, setCount] = useState(0);
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    if (!started || count >= text.length) return;
    const t = setTimeout(() => setCount((c) => c + 1), msPerChar);
    return () => clearTimeout(t);
  }, [started, count, text, msPerChar]);

  useEffect(() => {
    if (count === text.length && count > 0) onDone?.();
  }, [count, text.length, onDone]);

  useEffect(() => {
    const t = setInterval(() => setBlink((b) => !b), 480);
    return () => clearInterval(t);
  }, []);

  const shown = text.slice(0, count);

  return (
    <View style={styles.row}>
      {shown.split('').map((char, i) => (
        <Text
          key={`${char}-${i}`}
          style={[styles.letter, char === '&' && styles.amp]}
        >
          {char}
        </Text>
      ))}
      <Text style={[styles.cursor, { opacity: blink ? 1 : 0.15 }]}>|</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    minHeight: 72,
  },
  letter: {
    fontFamily: fonts.display,
    fontSize: 54,
    lineHeight: 64,
    color: colors.cream,
    letterSpacing: 1.2,
  },
  amp: {
    color: colors.gold,
    fontFamily: fonts.displayItalic,
    marginHorizontal: 2,
  },
  cursor: {
    fontFamily: fonts.display,
    fontSize: 50,
    lineHeight: 62,
    color: colors.gold,
    marginLeft: 2,
  },
});
