interface Props {
  colour: string;
}

export default function StatusDot({ colour }: Props) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: colour
      }}
    />
  );
}
