import fs from 'fs';
import path from 'path';

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  level: 'INFO' | 'WARN' | 'ERROR';
  category: 'AUTH' | 'ENGINE' | 'SECURITY' | 'BACKUP' | 'CONNECTION' | 'FAIL_SAFE';
  message: string;
  userId?: string;
  ip?: string;
  details?: any;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const AUDIT_FILE = path.join(DATA_DIR, 'audit_log.json');

export class SystemLogger {
  private static buffer: AuditLogEntry[] = [];
  private static maxInMemory: number = 300;

  private static ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      } catch {}
    }
  }

  public static init() {
    this.ensureDataDir();
    if (fs.existsSync(AUDIT_FILE)) {
      try {
        const raw = fs.readFileSync(AUDIT_FILE, 'utf-8');
        this.buffer = JSON.parse(raw);
      } catch {
        this.buffer = [];
      }
    }
  }

  public static log(
    level: AuditLogEntry['level'],
    category: AuditLogEntry['category'],
    message: string,
    meta?: { userId?: string; ip?: string; details?: any }
  ): AuditLogEntry {
    const entry: AuditLogEntry = {
      id: 'aud-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      timestamp: Date.now(),
      level,
      category,
      message,
      userId: meta?.userId,
      ip: meta?.ip,
      details: meta?.details,
    };

    this.buffer.unshift(entry);
    if (this.buffer.length > this.maxInMemory) {
      this.buffer = this.buffer.slice(0, this.maxInMemory);
    }

    // Async file flush
    this.flushToFile();

    return entry;
  }

  public static info(category: AuditLogEntry['category'], message: string, meta?: any) {
    return this.log('INFO', category, message, meta);
  }

  public static warn(category: AuditLogEntry['category'], message: string, meta?: any) {
    return this.log('WARN', category, message, meta);
  }

  public static error(category: AuditLogEntry['category'], message: string, meta?: any) {
    return this.log('ERROR', category, message, meta);
  }

  public static getLogs(limit: number = 100): AuditLogEntry[] {
    return this.buffer.slice(0, limit);
  }

  public static clearLogs(): void {
    this.buffer = [];
    this.flushToFile();
  }

  private static flushToFile() {
    this.ensureDataDir();
    try {
      fs.writeFileSync(AUDIT_FILE, JSON.stringify(this.buffer, null, 2), 'utf-8');
    } catch {}
  }
}

SystemLogger.init();
