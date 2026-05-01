import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import styles from './RateChart.module.css';

interface Point {
  ts: number;
  total: number;
}

interface Props {
  points: Point[];
}

export default function RateChart({ points }: Props) {
  return (
    <div className={styles.card}>
      <h3>Traffic Timeline</h3>
      <div className={styles.chart}>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={points}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="ts"
              tickFormatter={(value: number) => new Date(value).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false })}
              stroke="#6b7280"
            />
            <YAxis stroke="#6b7280" />
            <Tooltip labelFormatter={(value: number) => new Date(value).toLocaleString('en-AU')} />
            <Area type="monotone" dataKey="total" stroke="#2563eb" fill="#dbeafe" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
