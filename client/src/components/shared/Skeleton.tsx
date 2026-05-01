interface Props {
  height?: number;
}

export default function Skeleton({ height = 14 }: Props) {
  return (
    <div
      style={{
        width: '100%',
        height,
        borderRadius: 4,
        background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 37%, #f3f4f6 63%)',
        backgroundSize: '400% 100%',
        animation: 'pulse 1.4s ease infinite'
      }}
    />
  );
}
