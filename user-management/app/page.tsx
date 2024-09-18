import styles from "./page.module.css";
import { UserManagementProvider, UserManagement } from '@app/modules/UserManagement';

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <UserManagementProvider>
          <UserManagement />
        </UserManagementProvider>
      </main>
    </div>
  );
}
