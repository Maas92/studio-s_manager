import mongoose, { Document, Types, Schema, Model } from "mongoose";
import validator from "validator";

export interface IUser extends Document {
  _id: Types.ObjectId;
  firstName?: string;
  lastName?: string;
  name?: string;
  email: string;
  phone?: string;
  role: "owner" | "admin" | "manager" | "therapist" | "receptionist";
  password: string;
  passwordChangedAt?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  active: boolean;
  profileImage?: string;
  specializations?: string[];
  bio?: string;
  hireDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
}

const userSchema = new Schema<IUser>(
  {
    firstName: {
      type: String,
      trim: true,
      maxlength: [50, "First name cannot exceed 50 characters"],
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: [50, "Last name cannot exceed 50 characters"],
    },
    name: {
      type: String,
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      validate: [validator.isEmail, "Please provide a valid email"],
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: function (v: string) {
          return !v || /^\+?[1-9]\d{1,14}$/.test(v);
        },
        message: "Please provide a valid phone number",
      },
    },
    role: {
      type: String,
      enum: {
        values: ["owner", "admin", "manager", "therapist", "receptionist"],
        message: "Role must be admin, manager, therapist, or receptionist",
      },
      default: "therapist",
      index: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // Don't return password by default
    },
    passwordChangedAt: {
      type: Date,
      select: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    active: {
      type: Boolean,
      default: true,
      select: false,
    },
    profileImage: {
      type: String,
      validate: {
        validator: function (v: string) {
          return !v || validator.isURL(v);
        },
        message: "Please provide a valid URL for profile image",
      },
    },
    specializations: {
      type: [String],
      default: [],
    },
    bio: {
      type: String,
      maxlength: [500, "Bio cannot exceed 500 characters"],
    },
    hireDate: {
      type: Date,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    toJSON: {
      virtuals: true,
      transform: function (doc, ret: { password?: string; __v?: any }) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: function (doc, ret: { password?: string; __v?: any }) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Virtual for full name
userSchema.virtual("fullName").get(function (this: IUser) {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.name || this.email;
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ active: 1 });
userSchema.index({ createdAt: -1 });

// Query middleware - don't return inactive users by default
userSchema.pre(/^find/, function (next) {
  // Only filter if not explicitly querying for inactive users
  if (!(this as any).getOptions().includeInactive) {
    (this as any).find({ active: { $ne: false } });
  }
  next();
});

const User: Model<IUser> = mongoose.model<IUser>("User", userSchema);

export default User;
