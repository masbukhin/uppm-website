import type { MonthlyResearchUpdate, Notification, Prodi } from '../types';

const SUBMISSION_DEADLINE_DAY = 25; // Day of month when submission is due
const REMINDER_DAYS_BEFORE = 5; // Days before deadline to send reminder

/**
 * Get current month in YYYY-MM format
 */
export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get month label in Indonesian format
 */
export function getMonthLabel(month: string): string {
  const [year, mon] = month.split('-');
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  return `${months[parseInt(mon, 10) - 1]} ${year}`;
}

/**
 * Check if current date is past the submission deadline
 */
export function isPastDeadline(month?: string): boolean {
  const now = new Date();
  const targetMonth = month || getCurrentMonth();
  const [year, mon] = targetMonth.split('-').map(Number);

  // If checking a different month than current, it's past deadline if month < current
  if (year < now.getFullYear()) return true;
  if (year === now.getFullYear() && mon < now.getMonth() + 1) return true;

  // If same month, check day
  if (year === now.getFullYear() && mon === now.getMonth() + 1) {
    return now.getDate() > SUBMISSION_DEADLINE_DAY;
  }

  return false;
}

/**
 * Check if we should send reminder (within REMINDER_DAYS_BEFORE deadline)
 */
export function shouldSendReminder(month?: string): boolean {
  const now = new Date();
  const targetMonth = month || getCurrentMonth();
  const [year, mon] = targetMonth.split('-').map(Number);

  // Only for current month
  if (year !== now.getFullYear() || mon !== now.getMonth() + 1) {
    return false;
  }

  const dayOfMonth = now.getDate();
  return dayOfMonth >= SUBMISSION_DEADLINE_DAY - REMINDER_DAYS_BEFORE && dayOfMonth <= SUBMISSION_DEADLINE_DAY;
}

/**
 * Generate notification for dosen who haven't submitted
 */
export function generateNotifications(
  dosenList: Array<{ id: string; nama: string; prodi: Prodi }>,
  existingUpdates: MonthlyResearchUpdate[],
  currentMonth: string
): Array<Omit<Notification, 'id' | 'createdAt'>> {
  const notifications: Array<Omit<Notification, 'id' | 'createdAt'>> = [];
  const today = new Date();

  for (const dosen of dosenList) {
    // Check if dosen has submitted for this month
    const hasSubmitted = existingUpdates.some(
      update => update.dosenId === dosen.id && update.bulan === currentMonth
    );

    if (hasSubmitted) continue;

    // Determine notification type based on date
    const deadline = new Date(today.getFullYear(), today.getMonth(), SUBMISSION_DEADLINE_DAY);
    const reminderStart = new Date(deadline);
    reminderStart.setDate(reminderStart.getDate() - REMINDER_DAYS_BEFORE);

    let type: Notification['type'];
    let message: string;

    if (today > deadline) {
      type = 'overdue';
      const daysPastDeadline = Math.floor((today.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24));
      message = `Laporan bulanan ${getMonthLabel(currentMonth)} sudah terlambat ${daysPastDeadline} hari. Segera kirimkan laporan Anda.`;
    } else if (today >= reminderStart) {
      type = 'reminder';
      const daysUntilDeadline = Math.floor((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      message = `Pengingat: Laporan bulanan ${getMonthLabel(currentMonth)} jatuh tempo dalam ${daysUntilDeadline} hari.`;
    } else {
      type = 'submission_required';
      message = `Silakan kirimkan laporan bulanan ${getMonthLabel(currentMonth)}.`;
    }

    notifications.push({
      dosenId: dosen.id,
      bulan: currentMonth,
      type,
      message,
      isRead: false,
    });
  }

  return notifications;
}

/**
 * Calculate submission summary for a given month
 */
export function calculateSubmissionSummary(
  dosenList: Array<{ id: string; nama: string; prodi: Prodi }>,
  updates: MonthlyResearchUpdate[],
  month: string
): {
  bulan: string;
  totalDosen: number;
  sudahSubmit: number;
  belumSubmit: number;
  perProdi: Record<Prodi, { sudah: number; belum: number }>;
} {
  const submittedDosenIds = new Set(
    updates.filter(update => update.bulan === month).map(update => update.dosenId)
  );

  const perProdi: Record<Prodi, { sudah: number; belum: number }> = {
    TRL: { sudah: 0, belum: 0 },
    SVM: { sudah: 0, belum: 0 },
    PM: { sudah: 0, belum: 0 },
  };

  for (const dosen of dosenList) {
    if (!dosen.prodi) continue;
    const submitted = submittedDosenIds.has(dosen.id);
    if (submitted) {
      perProdi[dosen.prodi].sudah++;
    } else {
      perProdi[dosen.prodi].belum++;
    }
  }

  return {
    bulan: month,
    totalDosen: dosenList.length,
    sudahSubmit: submittedDosenIds.size,
    belumSubmit: dosenList.length - submittedDosenIds.size,
    perProdi,
  };
}

/**
 * Get list of months that should have notifications
 */
export function getMonthsNeedingNotifications(): string[] {
  const months: string[] = [];
  const now = new Date();
  const currentMonth = getCurrentMonth();

  // Current month always needs checking
  months.push(currentMonth);

  // Past months in current year that might need overdue notifications
  for (let m = 1; m < now.getMonth() + 1; m++) {
    const month = `${now.getFullYear()}-${String(m).padStart(2, '0')}`;
    if (month !== currentMonth) {
      months.push(month);
    }
  }

  return months;
}

/**
 * Check if notification already exists for a dosen in a month
 */
export function notificationExists(
  notifications: Notification[],
  dosenId: string,
  month: string,
  type: Notification['type']
): boolean {
  return notifications.some(
    n => n.dosenId === dosenId && n.bulan === month && n.type === type && !n.isRead
  );
}
