import type { ImgHTMLAttributes } from 'react';

type Props = ImgHTMLAttributes<HTMLImageElement> & {
  photo?: boolean;
  logo?: boolean;
};

export function CrispImg({ className = '', photo, logo, alt = '', ...props }: Props) {
  const kind = logo ? 'media-logo' : photo ? 'media-photo' : 'media-sharp';
  return (
    <img
      {...props}
      alt={alt}
      className={[kind, className].filter(Boolean).join(' ')}
      decoding="async"
      draggable={false}
    />
  );
}
