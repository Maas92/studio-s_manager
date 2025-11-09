import User, { IUser } from "../models/userModel.js";
import AppError from "../utils/appError.js";
import { logger } from "../utils/logger.js";
import { UpdateUserInput } from "../utils/validators.js";

export class UserService {
  async getUser(userId: string): Promise<IUser> {
    const user = await User.findById(userId);

    if (!user) {
      throw AppError.notFound("User not found");
    }

    return user;
  }

  async getAllUsers(filters?: {
    role?: string;
    active?: boolean;
    search?: string;
  }): Promise<IUser[]> {
    const query: any = {};

    if (filters?.role) {
      query.role = filters.role;
    }

    if (filters?.active !== undefined) {
      query.active = filters.active;
    }

    if (filters?.search) {
      query.$or = [
        { email: { $regex: filters.search, $options: "i" } },
        { firstName: { $regex: filters.search, $options: "i" } },
        { lastName: { $regex: filters.search, $options: "i" } },
      ];
    }

    const users = await User.find(query).sort({ createdAt: -1 });
    return users;
  }

  async updateUser(userId: string, data: UpdateUserInput): Promise<IUser> {
    // Don't allow password updates through this method
    const updateData = { ...data };
    delete (updateData as any).password;
    delete (updateData as any).passwordConfirm;
    delete (updateData as any).role; // Only admins should change roles

    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      throw AppError.notFound("User not found");
    }

    logger.info(`User updated: ${user.email}`);
    return user;
  }

  async deactivateUser(userId: string): Promise<void> {
    const user = await User.findByIdAndUpdate(
      userId,
      { active: false },
      { new: true }
    );

    if (!user) {
      throw AppError.notFound("User not found");
    }

    logger.info(`User deactivated: ${user.email}`);
  }

  async deleteUser(userId: string): Promise<void> {
    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      throw AppError.notFound("User not found");
    }

    logger.info(`User permanently deleted: ${user.email}`);
  }

  async getUserStats(): Promise<{
    total: number;
    byRole: Record<string, number>;
    active: number;
    inactive: number;
  }> {
    const [total, byRole, active, inactive] = await Promise.all([
      User.countDocuments(),
      User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
      User.countDocuments({ active: true }),
      User.countDocuments({ active: false }),
    ]);

    const roleStats: Record<string, number> = {};
    byRole.forEach((item) => {
      roleStats[item._id] = item.count;
    });

    return {
      total,
      byRole: roleStats,
      active,
      inactive,
    };
  }
}

export const userService = new UserService();
