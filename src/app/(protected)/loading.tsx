import styles from './loading.module.css';

export default function ProtectedLoading() {
  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <div className={styles.shimmer} />
        <p>Sayfa yukleniyor...</p>
      </div>
    </main>
  );
}
