export const ROLES = {
  CLIENT: "CLIENT",
  MASTER: "MASTER",
  ADMIN: "ADMIN",
} as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ORDER_STATUSES = {
  WAITING: "WAITING",
  MATCHING: "MATCHING",
  IN_PROGRESS: "IN_PROGRESS",
  WAIT_CONFIRMATION: "WAIT_CONFIRMATION",
  COMPLETED: "COMPLETED",
  WARRANTY_ACTIVE: "WARRANTY_ACTIVE",
  CANCELLED: "CANCELLED",
} as const;
export type OrderStatus = (typeof ORDER_STATUSES)[keyof typeof ORDER_STATUSES];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  WAITING: "Ожидает откликов",
  MATCHING: "Поиск мастера",
  IN_PROGRESS: "В работе",
  WAIT_CONFIRMATION: "Ждёт подтверждения",
  COMPLETED: "Завершён",
  WARRANTY_ACTIVE: "Гарантия активна",
  CANCELLED: "Отменён",
};

export const IMAGE_TYPES = { BEFORE: "BEFORE", AFTER: "AFTER" } as const;
export type ImageType = (typeof IMAGE_TYPES)[keyof typeof IMAGE_TYPES];

/* ---- Проверка документов мастера администратором ---- */

export const DOCUMENT_STATUSES = {
  NONE: "NONE",
  PENDING: "PENDING",
  VERIFIED: "VERIFIED",
  REJECTED: "REJECTED",
} as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[keyof typeof DOCUMENT_STATUSES];

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  NONE: "Документы не загружены",
  PENDING: "На проверке",
  VERIFIED: "Подтверждено",
  REJECTED: "Отклонено",
};

/* ---- Escrow Module ---- */

export const ESCROW_STATUSES = {
  RESERVED: "RESERVED",
  RELEASED: "RELEASED",
  REFUNDED: "REFUNDED",
} as const;
export type EscrowStatus = (typeof ESCROW_STATUSES)[keyof typeof ESCROW_STATUSES];

/** Комиссия платформы (TVEP): F = O × 0.07, мастеру M = O − F */
export const PLATFORM_COMMISSION_RATE = 0.07;

/* ---- SMS OTP ---- */

export const OTP_TTL_MINUTES = 5;
export const OTP_MAX_ATTEMPTS = 3;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;

export const SESSION_COOKIE = "rl_session";
export const SESSION_TTL_DAYS = 30;

// Default warranty period in months when a master hasn't specified one
export const DEFAULT_WARRANTY_MONTHS = 6;

// How long the client's "searching" screen waits before offering to cancel (seconds)
export const MATCHING_TIMEOUT_SECONDS = 120;

// Realtime channel topics
export const channels = {
  /** All online masters of a specialization listen here for urgent orders */
  urgent: (specializationId: string) => `urgent:${specializationId}`,
  /** Per-order events: accepted, taken, status changes */
  order: (orderId: string) => `order:${orderId}`,
  /** Per-order chat messages */
  chat: (orderId: string) => `chat:${orderId}`,
} as const;

export const REALTIME_EVENTS = {
  URGENT_NEW: "urgent_new",
  URGENT_TAKEN: "urgent_taken",
  ORDER_ACCEPTED: "order_accepted",
  CHAT_MESSAGE: "chat_message",
} as const;

export const STORAGE_BUCKETS = {
  AVATARS: "avatars",
  ORDER_IMAGES: "order-images",
  DOCUMENTS: "documents",
} as const;
