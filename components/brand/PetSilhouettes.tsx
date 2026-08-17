import Svg, { Ellipse, Path } from 'react-native-svg';

type MarkProps = {
  color?: string;
  size?: number;
};

export function DogSilhouette({ color = '#F6F0E6', size = 148 }: MarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Path
        d="M58 86 L42 14 C40 6 52 2 64 22 L78 78"
        fill={color}
      />
      <Path
        d="M142 86 L158 14 C160 6 148 2 136 22 L122 78"
        fill={color}
      />
      <Ellipse cx="100" cy="118" rx="64" ry="60" fill={color} />
      <Ellipse cx="100" cy="150" rx="34" ry="24" fill={color} />
    </Svg>
  );
}

export function CatSilhouette({ color = '#E4B84A', size = 92 }: MarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Path d="M62 86 L38 8 L92 78 Z" fill={color} />
      <Path d="M138 86 L162 8 L108 78 Z" fill={color} />
      <Ellipse cx="100" cy="120" rx="60" ry="56" fill={color} />
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
