import mongoose, { Schema, Document } from "mongoose";
import crypto from "crypto";

export interface ISession extends Document {
  user: mongoose.Types.ObjectId;
  jti: string;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  replacedBy?: string | null;
  revokedAt?: Date | null;
  ip?: string;
  ua?: string;
}

const SessionSchema = new Schema<ISession>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    jti: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: () => new Date(),
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    replacedBy: {
      type: String,
      default: null,
    },
    revokedAt: {
      type: Date,
      default: null,
      index: true,
    },
    ip: String,
    ua: String,
  },
  {
    timestamps: false, // We manually handle createdAt
  }
);

// Compound indexes for efficient queries
SessionSchema.index({ user: 1, revokedAt: 1 });
SessionSchema.index({ jti: 1, revokedAt: 1 });

// TTL index - MongoDB automatically deletes documents after expiration
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export default mongoose.model<ISession>("Session", SessionSchema);
