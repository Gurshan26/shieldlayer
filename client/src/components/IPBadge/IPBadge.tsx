import styles from './IPBadge.module.css';

interface Props {
  ip: string;
}

export default function IPBadge({ ip }: Props) {
  return <span className={`${styles.badge} mono`}>{ip}</span>;
}
