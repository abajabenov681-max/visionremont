import "server-only";
import { ApiError } from "@/lib/api";
import { ORDER_STATUSES } from "@/lib/constants";
import { getAdminClient } from "@/lib/supabase/admin";
import * as adminLogs from "@/repositories/adminLogRepository";
import * as usersRepo from "@/repositories/userRepository";
import * as ordersRepo from "@/repositories/orderRepository";
import * as reviewsRepo from "@/repositories/reviewRepository";
import * as profiles from "@/repositories/profileRepository";
import type { SessionUser } from "@/types/api";
import type { AdminLogRow, MasterPublic, OrderWithRelations, ReviewWithRelations, UserRow } from "@/types/db";

export interface DashboardStats {
  users_total: number;
  clients_total: number;
  masters_total: number;
  masters_online: number;
  orders_total: number;
  orders_active: number;
  orders_urgent_matching: number;
  orders_completed: number;
  warranties_active: number;
  reviews_total: number;
}

export async function getDashboard(): Promise<DashboardStats> {
  const db = getAdminClient();

  const [{ count: usersTotal }, { count: clientsTotal }, { count: mastersTotal }, { count: mastersOnline }] =
    await Promise.all([
      db.from("users").select("*", { count: "exact", head: true }).is("deleted_at", null),
      db.from("users").select("*", { count: "exact", head: true }).eq("role", "CLIENT").is("deleted_at", null),
      db.from("users").select("*", { count: "exact", head: true }).eq("role", "MASTER").is("deleted_at", null),
      db.from("master_profiles").select("*", { count: "exact", head: true }).eq("is_online", true),
    ]);

  const [ordersTotal, ordersInProgress, ordersWaitConfirm, urgentMatching, ordersCompleted, warrantyActive] =
    await Promise.all([
      ordersRepo.countOrders(),
      ordersRepo.countOrders({ status: ORDER_STATUSES.IN_PROGRESS }),
      ordersRepo.countOrders({ status: ORDER_STATUSES.WAIT_CONFIRMATION }),
      ordersRepo.countOrders({ status: ORDER_STATUSES.MATCHING, isUrgent: true }),
      ordersRepo.countOrders({ status: ORDER_STATUSES.COMPLETED }),
      ordersRepo.countOrders({ status: ORDER_STATUSES.WARRANTY_ACTIVE }),
    ]);

  const { count: reviewsTotal } = await db.from("reviews").select("*", { count: "exact", head: true });

  return {
    users_total: usersTotal ?? 0,
    clients_total: clientsTotal ?? 0,
    masters_total: mastersTotal ?? 0,
    masters_online: mastersOnline ?? 0,
    orders_total: ordersTotal,
    orders_active: ordersInProgress + ordersWaitConfirm,
    orders_urgent_matching: urgentMatching,
    orders_completed: ordersCompleted + warrantyActive,
    warranties_active: warrantyActive,
    reviews_total: reviewsTotal ?? 0,
  };
}

export async function listUsers(params: { role?: string; search?: string }): Promise<UserRow[]> {
  const db = getAdminClient();
  let query = db.from("users").select("*").order("created_at", { ascending: false }).limit(200);
  if (params.role) query = query.eq("role", params.role);
  if (params.search) query = query.ilike("phone", `%${params.search}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function setUserBlocked(admin: SessionUser, userId: string, blocked: boolean): Promise<void> {
  if (userId === admin.id) throw new ApiError("Нельзя заблокировать самого себя");
  if (blocked) await usersRepo.softDelete(userId);
  else await usersRepo.restore(userId);
  await adminLogs.log(admin.id, blocked ? "BLOCK_USER" : "UNBLOCK_USER", "users", userId);
}

export async function listAllOrders(params: { status?: string; search?: string }): Promise<OrderWithRelations[]> {
  return ordersRepo.listOrders({
    status: params.status as OrderWithRelations["status"] | undefined,
    search: params.search,
    includeDeleted: true,
    limit: 200,
  });
}

export async function listAllReviews(): Promise<ReviewWithRelations[]> {
  return reviewsRepo.listAll();
}

export async function deleteReview(admin: SessionUser, reviewId: string): Promise<void> {
  const removed = await reviewsRepo.deleteReview(reviewId);
  if (!removed) throw new ApiError("Отзыв не найден", 404);
  await reviewsRepo.recalcMasterStats(removed.master_id);
  await adminLogs.log(admin.id, "DELETE_REVIEW", "reviews", reviewId);
}

export async function listMastersForVerification(): Promise<MasterPublic[]> {
  return profiles.listMasters({});
}

export async function verifyMaster(admin: SessionUser, masterProfileId: string, verified: boolean): Promise<void> {
  const master = await profiles.getMasterProfileById(masterProfileId);
  if (!master) throw new ApiError("Мастер не найден", 404);
  const db = getAdminClient();
  const { error } = await db.from("master_profiles").update({ id_verified: verified }).eq("id", masterProfileId);
  if (error) throw error;
  await reviewsRepo.recalcMasterStats(masterProfileId);
  await adminLogs.log(admin.id, verified ? "VERIFY_MASTER" : "UNVERIFY_MASTER", "master_profiles", masterProfileId);
}

export async function listLogs(): Promise<AdminLogRow[]> {
  return adminLogs.listLogs();
}
