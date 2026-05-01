import { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: 'primary' | 'warning' | 'danger' | 'ghost';
}

export default function Button({ tone = 'primary', className = '', ...props }: Props) {
  return <button className={`${styles.btn} ${styles[tone]} ${className}`} {...props} />;
}
