import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

type MarkProps = {
  color?: string;
  size?: number;
};

export function DogSilhouette({ color = '#2A3544', size = 148 }: MarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80">
      <Path
        d="M22 34c-7.5-16 6-24 14-8.5-3.2 3.4-6.6 7.2-10.8 8.6-.9.3-2.2.4-3.2-.1Z"
        fill={color}
        opacity={0.2}
      />
      <Path
        d="M58 34c7.5-16-6-24-14-8.5 3.2 3.4 6.6 7.2 10.8 8.6.9.3 2.2.4 3.2-.1Z"
        fill={color}
        opacity={0.2}
      />
      <Ellipse cx="40" cy="44" rx="20" ry="19" fill={color} opacity={0.16} />
      <Ellipse cx="40" cy="51.5" rx="10.5" ry="7.4" fill={color} opacity={0.12} />
      <Circle cx="33.2" cy="41.2" r="2.05" fill={color} opacity={0.72} />
      <Circle cx="46.8" cy="41.2" r="2.05" fill={color} opacity={0.72} />
      <Ellipse cx="40" cy="48.6" rx="2.6" ry="2" fill={color} opacity={0.78} />
      <Path
        d="M40 50.6c3.4 3.2 7.8 3.1 10.2 1.4"
        stroke={color}
        strokeWidth={1.35}
        strokeLinecap="round"
        fill="none"
        opacity={0.45}
      />
    </Svg>
  );
}

export function CatSilhouette({ color = '#2A3544', size = 92 }: MarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80">
      <Path d="M24 36 16 12c6 2 16 14 20 24Z" fill={color} opacity={0.2} />
      <Path d="M56 36 64 12c-6 2-16 14-20 24Z" fill={color} opacity={0.2} />
      <Ellipse cx="40" cy="46" rx="19" ry="18" fill={color} opacity={0.16} />
      <Path
        d="M32.6 43.2c1.5-2.4 4-2.6 5.2-.4"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        fill="none"
        opacity={0.7}
      />
      <Path
        d="M42.2 42.8c1.5-2.4 4-2.5 5.2-.3"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        fill="none"
        opacity={0.7}
      />
      <Path d="M40 48.2 37.4 51.4h5.2Z" fill={color} opacity={0.72} />
      <Path
        d="M22 47.5h10M22 51h9M58 47.5H48M58 51h-9"
        stroke={color}
        strokeWidth={1.15}
        strokeLinecap="round"
        opacity={0.28}
      />
    </Svg>
  );
}

export function PawMark({ color = 'rgba(255,255,255,0.46)', size = 18 }: MarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Ellipse cx="12" cy="16.4" rx="5.1" ry="5.6" fill={color} />
      <Ellipse cx="5.1" cy="9.5" rx="2.3" ry="3" fill={color} />
      <Ellipse cx="9.2" cy="6.2" rx="2.15" ry="2.85" fill={color} />
      <Ellipse cx="14.8" cy="6.2" rx="2.15" ry="2.85" fill={color} />
      <Ellipse cx="18.9" cy="9.5" rx="2.3" ry="3" fill={color} />
    </Svg>
  );
}
