import { USER_ROLES, type UserRole } from "../types/domain/user.js";
import { Schema, type Types, model } from "mongoose";

/** The persisted shape. Only this package ever sees it. */
export type UserDocument = {
  _id: Types.ObjectId;
  email: string;
  name: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const userSchema = new Schema<UserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    // `select: false` keeps the hash out of every query that does not ask for it.
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      required: true,
      enum: USER_ROLES,
      default: "requester",
      index: true,
    },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true, versionKey: false },
);

// Supports the `q` filter on the user listing.
userSchema.index({ name: 1 });

export const UserModel = model<UserDocument>("User", userSchema);
