import mongoose, { Schema, Document } from "mongoose";
import crypto from "crypto";

export interface ISession extends Document {
  user: mongoose.Types.ObjectId;
  jti: string; // unique ID inside refresh JWT
  tokenHash: string; // hash(refreshToken)
  createdAt: Date;
  expiresAt: Date;
  replacedBy?: string | null; // jti of new token
  revokedAt?: Date | null;
  ip?: string;
  ua?: string;
}

const SessionSchema = new Schema<ISession>({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  jti: { type: String, required: true, unique: true },
  tokenHash: { type: String, required: true },
  createdAt: { type: Date, default: () => new Date(), index: true },
  expiresAt: { type: Date, required: true, index: true },
  replacedBy: { type: String, default: null },
  revokedAt: { type: Date, default: null },
  ip: String,
  ua: String,
});

// TTL index auto-purges expired sessions
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export default mongoose.model<ISession>("Session", SessionSchema);
