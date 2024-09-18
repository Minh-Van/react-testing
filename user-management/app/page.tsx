import styles from "./page.module.css";
import UserManagement from '@app/modules/user-management/UserManagement';

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <UserManagement />
      </main>
    </div>
  );
}
