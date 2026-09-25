/**
 * MySQL Auto-Sync Manager
 * Provides debounced, automatic background persistence to MySQL (WAMP / Express)
 * on every single state change, replacing Firestore as the primary database.
 */

import {
  Teacher,
  Group,
  Student,
  AttendanceRecord,
  Activity,
  GradeRecord,
  SchoolSettings,
  SubjectConfig,
  RemedialRecord,
  ClassDailyLog,
  ScheduleTimeSlot,
  WorkGroupSet,
  GroupSeatingPlan,
  NotificationLog,
} from '../types';
import { pushAllDataToMySQL, pullAllDataFromMySQL, deleteRecordFromMySQL } from './mysqlService';

export interface AppDatabasePayload {
  teachers: Teacher[];
  groups: Group[];
  students: Student[];
  attendance: AttendanceRecord[];
  activities: Activity[];
  grades: GradeRecord[];
  settings: SchoolSettings;
  subjectConfigs: SubjectConfig[];
  remedials: RemedialRecord[];
  dailyLogs: ClassDailyLog[];
  schedules: ScheduleTimeSlot[];
  workGroups: WorkGroupSet[];
  seatingPlans: GroupSeatingPlan[];
  notifications: NotificationLog[];
}

export type MySQLSyncStatus = 'synced' | 'syncing' | 'offline';

type SyncListener = (status: MySQLSyncStatus, lastSyncTime: Date | null, errorMessage?: string | null) => void;

class MySQLAutoSyncEngine {
  private status: MySQLSyncStatus = 'synced';
  private lastSyncTime: Date | null = null;
  private errorMessage: string | null = null;
  private debounceTimer: any = null;
  private pendingPayload: AppDatabasePayload | null = null;
  private isPushing = false;
  private listeners: Set<SyncListener> = new Set();
  private retryTimer: any = null;

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    // Notify immediate state
    listener(this.status, this.lastSyncTime, this.errorMessage);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => {
      try {
        fn(this.status, this.lastSyncTime, this.errorMessage);
      } catch (e) {
        console.error('Error in sync listener:', e);
      }
    });
  }

  public getStatus(): { status: MySQLSyncStatus; lastSyncTime: Date | null; errorMessage: string | null } {
    return {
      status: this.status,
      lastSyncTime: this.lastSyncTime,
      errorMessage: this.errorMessage,
    };
  }

  /**
   * Queues an automatic debounced synchronization to MySQL
   * @param payload Current complete state of the application
   * @param immediate Whether to bypass debounce and push immediately
   */
  public triggerAutoSync(payload: AppDatabasePayload, immediate: boolean = false): Promise<boolean> {
    this.pendingPayload = {
      ...(this.pendingPayload || ({} as AppDatabasePayload)),
      ...payload,
    };

    // Update status to syncing right away
    if (this.status !== 'syncing') {
      this.status = 'syncing';
      this.notify();
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (immediate) {
      return this.executePush();
    }

    return new Promise((resolve) => {
      this.debounceTimer = setTimeout(async () => {
        const success = await this.executePush();
        resolve(success);
      }, 500); // 500ms debounce: groups fast typing & bulk actions smoothly
    });
  }

  private async executePush(): Promise<boolean> {
    if (!this.pendingPayload) return true;
    if (this.isPushing) {
      // If already pushing, reschedule immediately after
      this.debounceTimer = setTimeout(() => this.executePush(), 300);
      return false;
    }

    this.isPushing = true;
    const payloadToPush = this.pendingPayload;

    try {
      const result = await pushAllDataToMySQL(payloadToPush);
      if (result.success) {
        this.status = 'synced';
        this.lastSyncTime = new Date();
        this.errorMessage = null;
        this.notify();

        if (this.retryTimer) {
          clearTimeout(this.retryTimer);
          this.retryTimer = null;
        }

        // Check if new changes came in while pushing
        if (this.pendingPayload !== payloadToPush) {
          setTimeout(() => this.executePush(), 200);
        }
        return true;
      } else {
        console.warn('MySQL AutoSync warning:', result.message);
        this.status = 'offline';
        this.errorMessage = result.message;
        this.notify();
        this.scheduleAutoRetry();
        return false;
      }
    } catch (err: any) {
      console.error('MySQL AutoSync network error:', err);
      this.status = 'offline';
      this.errorMessage = err.message || 'Error conectando a MySQL';
      this.notify();
      this.scheduleAutoRetry();
      return false;
    } finally {
      this.isPushing = false;
    }
  }

  private scheduleAutoRetry() {
    if (this.retryTimer) return;
    // Auto retry after 8 seconds if connection was interrupted
    this.retryTimer = setTimeout(async () => {
      this.retryTimer = null;
      if (this.pendingPayload && this.status === 'offline') {
        console.info('Reintentando sincronización automática con MySQL...');
        await this.executePush();
      }
    }, 8000);
  }

  /**
   * Directly delete a record from a specific MySQL table
   */
  public async deleteRecord(table: string, id: string): Promise<boolean> {
    try {
      const res = await deleteRecordFromMySQL(table, id);
      return res.success;
    } catch (e) {
      console.error(`Error deleting ${id} from MySQL table ${table}:`, e);
      return false;
    }
  }

  /**
   * Pull all fresh data from MySQL
   */
  public async pullAllData(): Promise<any> {
    this.status = 'syncing';
    this.notify();
    try {
      const result = await pullAllDataFromMySQL();
      if (result.success && result.data) {
        this.status = 'synced';
        this.lastSyncTime = new Date();
        this.errorMessage = null;
        this.notify();
        return result.data;
      } else {
        this.status = 'offline';
        this.errorMessage = result.message || 'No se pudieron recuperar datos';
        this.notify();
        return null;
      }
    } catch (e: any) {
      this.status = 'offline';
      this.errorMessage = e.message;
      this.notify();
      return null;
    }
  }
}

export const mysqlAutoSync = new MySQLAutoSyncEngine();
