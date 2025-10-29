import mongoose, { Document, Types, Schema, Model } from "mongoose";
import validator from "validator";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export interface IUser extends Document {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: "admin" | "manager" | "therapist" | "receptionist";
  password: string;
  passwordConfirm?: string;
  passwordChangedAt?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  active: boolean;
  profileImage?: string;
  specializations?: string[];
  bio?: string;
  hireDate?: Date;
  createdAt: Date;
  lastLogin?: Date;
  fullName: string;
  correctPassword(
    candidatePassword: string,
    userPassword: string
  ): Promise<boolean>;
  changedPasswordAfter(JWTTimestamp: number): boolean;
  createPasswordResetToken(): string;
}

const userSchema = new Schema<IUser>(
  {
    firstName: {
      type: String,
      required: [true, "Please provide your first name"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Please provide your last name"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Please provide your email"],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, "Please provide a valid email"],
    },
    phone: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ["admin", "manager", "therapist", "receptionist"],
      default: "therapist",
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: 8,
      select: false,
    },
    passwordConfirm: {
      type: String,
      required: [true, "Please confirm your password"],
      validate: {
        validator: function (this: IUser, el: string): boolean {
          return el === this.password;
        },
        message: "Passwords do not match",
      },
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
      type: Boolean,
      default: true,
      select: false,
    },
    profileImage: String,
    specializations: [String],
    bio: String,
    hireDate: Date,
    createdAt: {
      type: Date,
      default: Date.now,
    },
    lastLogin: Date,
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for full name
userSchema.virtual("fullName").get(function (this: IUser) {
  return `${this.firstName} ${this.lastName}`;
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(
    this.password,
    parseInt(process.env.BCRYPT_ROUNDS || "12")
  );
  this.passwordConfirm = undefined;
  next();
});

// Update passwordChangedAt
userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();

  this.passwordChangedAt = new Date(Date.now() - 1000);
  next();
});

// Query middleware - don't return inactive users
userSchema.pre(/^find/, function (next) {
  (this as any).find({ active: { $ne: false } });
  next();
});

// Instance method - check if password is correct
userSchema.methods.correctPassword = async function (
  candidatePassword: string,
  userPassword: string
): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Instance method - check if password was changed after JWT was issued
userSchema.methods.changedPasswordAfter = function (
  JWTTimestamp: number
): boolean {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      (this.passwordChangedAt.getTime() / 1000).toString(),
      10
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Instance method - create password reset token
userSchema.methods.createPasswordResetToken = function (): string {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  return resetToken;
};

const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);

export default User;
