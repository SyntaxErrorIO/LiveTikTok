import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { SystemLogger } from './systemLogger';

export interface UserAccount {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'streamer';
  passwordHash: string;
  passwordSalt: string;
  overlayToken: string;
  createdAt: number;
  lastLoginAt: number;
}

export interface UserSessionPayload {
  userId: string;
  username: string;
  email: string;
  role: 'admin' | 'streamer';
  overlayToken: string;
  exp: number;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'livetrigger_sec_prod_key_must_override_in_env_61829';

export class AuthManager {
  private static users: UserAccount[] = [];

  private static ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      } catch {}
    }
  }

  public static init() {
    this.ensureDataDir();
    if (fs.existsSync(USERS_FILE)) {
      try {
        const raw = fs.readFileSync(USERS_FILE, 'utf-8');
        this.users = JSON.parse(raw);
      } catch {
        this.users = [];
      }
    }

    // Seed default admin if no users exist
    if (this.users.length === 0) {
      const defaultEmail = process.env.ADMIN_EMAIL || 'admin@livetrigger.local';
      const defaultPassword = process.env.ADMIN_PASSWORD || 'LiveTrigger2026!';
      const defaultUsername = process.env.ADMIN_USERNAME || 'admin';

      const salt = crypto.randomBytes(16).toString('hex');
      const hash = this.hashPassword(defaultPassword, salt);
      const defaultUser: UserAccount = {
        id: 'usr-admin-primary',
        username: defaultUsername,
        email: defaultEmail.toLowerCase(),
        role: 'admin',
        passwordHash: hash,
        passwordSalt: salt,
        overlayToken: crypto.randomBytes(24).toString('hex'),
        createdAt: Date.now(),
        lastLoginAt: Date.now(),
      };

      this.users.push(defaultUser);
      this.saveUsers();

      SystemLogger.info('AUTH', 'Cuenta administrativa inicial creada', {
        userId: defaultUser.id,
        details: { email: defaultUser.email, note: 'Credenciales iniciales creadas desde variables de entorno.' },
      });
    }
  }

  private static hashPassword(password: string, salt: string): string {
    return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  }

  private static saveUsers() {
    this.ensureDataDir();
    try {
      fs.writeFileSync(USERS_FILE, JSON.stringify(this.users, null, 2), 'utf-8');
    } catch {}
  }

  public static createToken(user: UserAccount, expiresInHours: number = 72): string {
    const payload: UserSessionPayload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      overlayToken: user.overlayToken,
      exp: Date.now() + expiresInHours * 3600 * 1000,
    };

    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');

    return `${header}.${body}.${signature}`;
  }

  public static verifyToken(token: string): UserSessionPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const [header, body, signature] = parts;

      const expectedSig = crypto
        .createHmac('sha256', JWT_SECRET)
        .update(`${header}.${body}`)
        .digest('base64url');

      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
        return null;
      }

      const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8')) as UserSessionPayload;
      if (payload.exp < Date.now()) {
        return null; // Expired
      }

      return payload;
    } catch {
      return null;
    }
  }

  public static register(data: {
    username: string;
    email: string;
    password: string;
    role?: 'admin' | 'streamer';
  }): { success: boolean; user?: Omit<UserAccount, 'passwordHash' | 'passwordSalt'>; token?: string; error?: string } {
    const emailNorm = (data.email || '').trim().toLowerCase();
    const userNorm = (data.username || '').trim();

    if (!emailNorm || !emailNorm.includes('@')) {
      return { success: false, error: 'Email con formato inválido.' };
    }
    if (!userNorm || userNorm.length < 3) {
      return { success: false, error: 'El nombre de usuario debe tener al menos 3 caracteres.' };
    }
    if (!data.password || data.password.length < 8) {
      return { success: false, error: 'La contraseña debe contener al menos 8 caracteres.' };
    }

    if (this.users.some((u) => u.email === emailNorm)) {
      return { success: false, error: 'Ya existe una cuenta registrada con este correo electrónico.' };
    }
    if (this.users.some((u) => u.username.toLowerCase() === userNorm.toLowerCase())) {
      return { success: false, error: 'Ese nombre de usuario ya está en uso.' };
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = this.hashPassword(data.password, salt);
    const newUser: UserAccount = {
      id: 'usr-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      username: userNorm,
      email: emailNorm,
      role: data.role || 'streamer',
      passwordHash: hash,
      passwordSalt: salt,
      overlayToken: crypto.randomBytes(24).toString('hex'),
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    };

    this.users.push(newUser);
    this.saveUsers();

    const token = this.createToken(newUser);
    SystemLogger.info('AUTH', 'Nuevo usuario registrado exitosamente', {
      userId: newUser.id,
      details: { username: newUser.username, email: newUser.email },
    });

    const { passwordHash, passwordSalt, ...safeUser } = newUser;
    return { success: true, user: safeUser, token };
  }

  public static login(
    identifier: string,
    password: string
  ): { success: boolean; user?: Omit<UserAccount, 'passwordHash' | 'passwordSalt'>; token?: string; error?: string } {
    const norm = (identifier || '').trim().toLowerCase();
    const user = this.users.find(
      (u) => u.email === norm || u.username.toLowerCase() === norm
    );

    if (!user) {
      SystemLogger.warn('AUTH', 'Intento de inicio de sesión fallido: usuario no encontrado', {
        details: { identifier: norm },
      });
      return { success: false, error: 'Credenciales inválidas.' };
    }

    const testHash = this.hashPassword(password, user.passwordSalt);
    if (!crypto.timingSafeEqual(Buffer.from(testHash), Buffer.from(user.passwordHash))) {
      SystemLogger.warn('AUTH', 'Intento de inicio de sesión fallido: contraseña incorrecta', {
        userId: user.id,
        details: { identifier: norm },
      });
      return { success: false, error: 'Credenciales inválidas.' };
    }

    user.lastLoginAt = Date.now();
    this.saveUsers();

    const token = this.createToken(user);
    SystemLogger.info('AUTH', 'Inicio de sesión exitoso', {
      userId: user.id,
      details: { username: user.username },
    });

    const { passwordHash, passwordSalt, ...safeUser } = user;
    return { success: true, user: safeUser, token };
  }

  public static getUserById(userId: string): Omit<UserAccount, 'passwordHash' | 'passwordSalt'> | null {
    const user = this.users.find((u) => u.id === userId);
    if (!user) return null;
    const { passwordHash, passwordSalt, ...safeUser } = user;
    return safeUser;
  }

  public static getUserByOverlayToken(overlayToken: string): Omit<UserAccount, 'passwordHash' | 'passwordSalt'> | null {
    if (!overlayToken) return null;
    const user = this.users.find((u) => u.overlayToken === overlayToken);
    if (!user) return null;
    const { passwordHash, passwordSalt, ...safeUser } = user;
    return safeUser;
  }

  public static regenerateOverlayToken(userId: string): string | null {
    const user = this.users.find((u) => u.id === userId);
    if (!user) return null;
    user.overlayToken = crypto.randomBytes(24).toString('hex');
    this.saveUsers();
    SystemLogger.info('SECURITY', 'Token de OBS Overlay regenerado', { userId: user.id });
    return user.overlayToken;
  }
}

AuthManager.init();
