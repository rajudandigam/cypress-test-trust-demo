import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import type { Db } from "../db/pool.js";
import type { SafeUser } from "../../domain/types.js";
import type { Clock } from "../../domain/clock.js";

const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

export type SessionActor = SafeUser & { sessionId: string };

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export class SessionService {
  constructor(
    private readonly db: Db,
    private readonly clock: Clock,
  ) {}

  async login(email: string, password: string): Promise<{ token: string; user: SafeUser } | null> {
    const result = await this.db.query(
      `SELECT id, email, password_hash, display_name, tenant_id, traveler_id
       FROM users WHERE email = $1`,
      [email.toLowerCase()],
    );
    const row = result.rows[0];
    if (!row) return null;
    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) return null;

    const token = crypto.randomBytes(32).toString("hex");
    const sessionId = crypto.randomUUID();
    const expires = new Date(this.clock.now().getTime() + SESSION_TTL_MS);
    await this.db.query(
      `INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)`,
      [sessionId, row.id, hashToken(token), expires.toISOString()],
    );

    return {
      token,
      user: {
        id: row.id,
        email: row.email,
        displayName: row.display_name,
        tenantId: row.tenant_id,
        travelerId: row.traveler_id,
      },
    };
  }

  async resolve(token: string | undefined): Promise<SessionActor | null> {
    if (!token) return null;
    const result = await this.db.query(
      `SELECT s.id AS session_id, s.expires_at, u.id, u.email, u.display_name, u.tenant_id, u.traveler_id
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1`,
      [hashToken(token)],
    );
    const row = result.rows[0];
    if (!row) return null;
    if (new Date(row.expires_at).getTime() <= this.clock.now().getTime()) {
      await this.db.query(`DELETE FROM sessions WHERE id = $1`, [row.session_id]);
      return null;
    }
    return {
      sessionId: row.session_id,
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      tenantId: row.tenant_id,
      travelerId: row.traveler_id,
    };
  }

  async logout(token: string | undefined): Promise<void> {
    if (!token) return;
    await this.db.query(`DELETE FROM sessions WHERE token_hash = $1`, [hashToken(token)]);
  }
}
