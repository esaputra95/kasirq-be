import Model from "#root/services/PrismaService";
import { UnauthorizedError, ValidationError } from "#root/helpers/handleErrors";
import { Prisma } from "@prisma/client";

type PermissionKey = `${string}:${string}`;

type ActorContext = {
    userId: string;
    level: string;
};

type ResolveStoreOptions = {
    userId: string;
    level: string;
    requestedStoreId?: string | null;
};

type GroupedPermissions = Record<
    string,
    Array<{ id: string; action: string; key: PermissionKey }>
>;

const PERMISSION_ACTIONS = ["create", "read", "update", "delete"];

// Extend as needed without touching business logic.
const DEFAULT_PERMISSION_MODULES = [
    "products",
    "units",
    "product_categories",
    "brands",
    "sales",
    "pending",
    "purchase",
    "members",
    "stock_opname",
    "cash",
    "cash_in",
    "expense",
    "expense_categories",
    "cash_out",
    "cash_transfer",
    "purchase_reports",
    "sales_reports",
    "margin_reports",
    "best_seller_reports",
    "stock_opname_reports",
    "cash_in_reports",
    "cash_out_reports",
    "cash_transfer_reports",
    "cash_flow_reports",
    "expense_reports",
    "attendance_reports",
    "sales_people",
    "contacts",
    "attendance_lists",
    "configuration_stores",
    "printers",
    "rbac",
    "member_levels",
    "reset_transactions",
    "users",
    "suppliers",
] as const;

const OWNER_ALLOWED: PermissionKey[] = [
    "products:create",
    "products:read",
    "products:update",
    "products:delete",
    "units:create",
    "units:read",
    "units:update",
    "units:delete",
    "product_categories:create",
    "product_categories:read",
    "product_categories:update",
    "product_categories:delete",
    "brands:create",
    "brands:read",
    "brands:update",
    "brands:delete",
    "members:create",
    "members:read",
    "members:update",
    "members:delete",
    "sales_people:create",
    "sales_people:read",
    "sales_people:update",
    "sales_people:delete",
    "contacts:create",
    "contacts:read",
    "contacts:update",
    "contacts:delete",
    "attendance_lists:create",
    "attendance_lists:read",
    "attendance_lists:update",
    "attendance_lists:delete",
    "sales:create",
    "sales:read",
    "sales:update",
    "sales:delete",
    "pending:create",
    "pending:read",
    "pending:update",
    "pending:delete",
    "purchase:create",
    "purchase:read",
    "purchase:update",
    "purchase:delete",
    "stock_opname:create",
    "stock_opname:read",
    "stock_opname:update",
    "stock_opname:delete",
    "cash:create",
    "cash:read",
    "cash:update",
    "cash:delete",
    "cash_in:create",
    "cash_in:read",
    "cash_in:update",
    "cash_in:delete",
    "expense:create",
    "expense:read",
    "expense:update",
    "expense:delete",
    "expense_categories:create",
    "expense_categories:read",
    "expense_categories:update",
    "expense_categories:delete",
    "cash_out:create",
    "cash_out:read",
    "cash_out:update",
    "cash_out:delete",
    "cash_transfer:create",
    "cash_transfer:read",
    "cash_transfer:update",
    "cash_transfer:delete",
    "purchase_reports:read",
    "sales_reports:read",
    "margin_reports:read",
    "best_seller_reports:read",
    "stock_opname_reports:read",
    "cash_in_reports:read",
    "cash_out_reports:read",
    "cash_transfer_reports:read",
    "cash_flow_reports:read",
    "expense_reports:read",
    "attendance_reports:read",
    "suppliers:create",
    "suppliers:read",
    "suppliers:update",
    "suppliers:delete",
];

const KASIR_ALLOWED: PermissionKey[] = [
    "products:create",
    "products:read",
    "units:create",
    "units:read",
    "product_categories:create",
    "product_categories:read",
    "brands:create",
    "brands:read",
    "sales:create",
    "sales:read",
    "pending:create",
    "pending:read",
    "pending:update",
    "pending:delete",
    "purchase:create",
    "purchase:read",
    "members:create",
    "members:read",
    "stock_opname:create",
    "stock_opname:read",
    "cash:create",
    "cash:read",
    "cash_in:create",
    "cash_in:read",
    "expense:create",
    "expense:read",
    "expense_categories:create",
    "expense_categories:read",
    "cash_out:create",
    "cash_out:read",
    "cash_transfer:create",
    "cash_transfer:read",
];

const normalizeLevel = (level?: string | null) => (level || "").toLowerCase();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableTxnError = (error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2034: Transaction failed due to a write conflict or a deadlock.
        return error.code === "P2034";
    }
    return false;
};

const withTxnRetry = async <T>(
    fn: () => Promise<T>,
    options?: { maxRetries?: number; baseDelayMs?: number },
): Promise<T> => {
    const maxRetries = options?.maxRetries ?? 5;
    const baseDelayMs = options?.baseDelayMs ?? 50;

    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        try {
            return await fn();
        } catch (error) {
            if (!isRetryableTxnError(error) || attempt >= maxRetries) {
                throw error;
            }

            attempt += 1;
            // simple exponential backoff with a small cap
            const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), 800);
            await sleep(delay);
        }
    }
};

const getActorUser = async (userId: string) => {
    if (!userId) {
        throw new UnauthorizedError("Unauthorized", 401);
    }

    const user = await Model.users.findUnique({
        where: { id: userId },
        select: { id: true, level: true, storeId: true },
    });

    if (!user) throw new UnauthorizedError("User tidak ditemukan", 401);
    return user;
};

const ensureStoreBelongsToOwner = async (ownerId: string, storeId: string) => {
    const store = await Model.stores.findFirst({
        where: {
            id: storeId,
            ownerId,
            deletedAt: null,
        },
        select: { id: true },
    });

    if (!store) {
        throw new UnauthorizedError("Store tidak dimiliki oleh owner ini", 403);
    }
};

export const resolveStoreIdByActor = async ({
    userId,
    level,
    requestedStoreId,
}: ResolveStoreOptions) => {
    const actor = await getActorUser(userId);
    const actorLevel = normalizeLevel(level || actor.level || "");

    // Superadmin can target any store when explicit store id is provided.
    if (actorLevel === "superadmin") {
        if (!requestedStoreId) {
            throw new ValidationError(
                "x-store-id wajib untuk superadmin",
                400,
                "x-store-id",
            );
        }
        return requestedStoreId;
    }

    if (actorLevel === "owner") {
        if (!requestedStoreId) {
            throw new ValidationError(
                "x-store-id wajib untuk owner",
                400,
                "x-store-id",
            );
        }
        await ensureStoreBelongsToOwner(actor.id, requestedStoreId);
        return requestedStoreId;
    }

    if (!actor.storeId) {
        throw new UnauthorizedError("Karyawan tidak memiliki storeId", 403);
    }

    if (requestedStoreId && requestedStoreId !== actor.storeId) {
        throw new UnauthorizedError(
            "Karyawan tidak boleh akses store lain",
            403,
        );
    }

    return actor.storeId;
};

const mapRoleNameFromLegacyLevel = (level?: string | null): string => {
    const normalized = normalizeLevel(level);

    if (normalized === "owner") return "owner";
    return "kasir";
};

const upsertPermissions = async () => {
    const createdPermissions: Array<{
        id: string;
        module: string;
        action: string;
    }> = [];

    for (const moduleName of DEFAULT_PERMISSION_MODULES) {
        for (const actionName of PERMISSION_ACTIONS) {
            const permission = await Model.permissions.upsert({
                where: {
                    module_action: {
                        module: moduleName,
                        action: actionName,
                    },
                },
                update: {},
                create: {
                    module: moduleName,
                    action: actionName,
                },
                select: {
                    id: true,
                    module: true,
                    action: true,
                },
            });

            createdPermissions.push(permission);
        }
    }

    return createdPermissions;
};

const upsertSystemRole = async (name: string) => {
    const existing = await Model.roles.findFirst({
        where: {
            name,
            isSystem: true,
            storeId: null,
        },
        select: { id: true },
    });

    if (existing) {
        return existing;
    }

    return Model.roles.create({
        data: {
            name,
            isSystem: true,
            storeId: null,
        },
        select: { id: true },
    });
};

const upsertSystemRoleForStore = async (storeId: string, name: string) => {
    const existing = await Model.roles.findFirst({
        where: {
            name,
            isSystem: true,
            storeId,
        },
        select: { id: true },
    });

    if (existing) return existing;

    return Model.roles.create({
        data: {
            name,
            isSystem: true,
            storeId,
        },
        select: { id: true },
    });
};

const upsertSystemRoleForStoreWithFlag = async (
    storeId: string,
    name: string,
) => {
    const existing = await Model.roles.findFirst({
        where: {
            name,
            isSystem: true,
            storeId,
        },
        select: { id: true },
    });

    if (existing) return { id: existing.id, created: false };

    const created = await Model.roles.create({
        data: {
            name,
            isSystem: true,
            storeId,
        },
        select: { id: true },
    });

    return { id: created.id, created: true };
};

const cleanupGlobalSystemRolesIfUnused = async () => {
    const globalSystemRoles = await Model.roles.findMany({
        where: { isSystem: true, storeId: null },
        select: { id: true },
    });

    if (globalSystemRoles.length === 0) return { deleted: 0 };

    const globalRoleIds = globalSystemRoles.map((r) => r.id);
    const usedCount = await Model.user_roles.count({
        where: { roleId: { in: globalRoleIds } },
    });

    if (usedCount > 0) return { deleted: 0 };

    const deleted = await Model.roles.deleteMany({
        where: { id: { in: globalRoleIds } },
    });

    return { deleted: deleted.count };
};

const replaceRolePermissions = async (
    roleId: string,
    permissionIds: string[],
) => {
    await withTxnRetry(async () => {
        await Model.$transaction(async (tx) => {
            await tx.role_permissions.deleteMany({ where: { roleId } });

            if (permissionIds.length > 0) {
                await tx.role_permissions.createMany({
                    data: permissionIds.map((permissionId) => ({
                        roleId,
                        permissionId,
                    })),
                    skipDuplicates: true,
                });
            }
        });
    });
};

export const checkPermissionAccess = async (
    actor: ActorContext,
    moduleName: string,
    actionName: string,
    requestedStoreId?: string | null,
) => {
    const storeId = await resolveStoreIdByActor({
        userId: actor.userId,
        level: actor.level,
        requestedStoreId,
    });

    if (normalizeLevel(actor.level) === "superadmin") {
        return { storeId, allowed: true };
    }

    const userRole = await Model.user_roles.findUnique({
        where: {
            userId_storeId: {
                userId: actor.userId,
                storeId,
            },
        },
        select: {
            role: {
                select: {
                    rolePermissions: {
                        select: {
                            permission: {
                                select: {
                                    module: true,
                                    action: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    });

    if (!userRole) {
        return { storeId, allowed: false };
    }

    const allowed = userRole.role.rolePermissions.some(
        (item) =>
            item.permission.module === moduleName &&
            item.permission.action === actionName,
    );

    return { storeId, allowed };
};

export const getPermissionsGrouped = async (): Promise<GroupedPermissions> => {
    const permissions = await Model.permissions.findMany({
        where: {},
        orderBy: [{ module: "asc" }, { action: "asc" }],
        select: {
            id: true,
            module: true,
            action: true,
        },
    });

    const grouped: GroupedPermissions = {};

    for (const permission of permissions) {
        if (!grouped[permission.module]) {
            grouped[permission.module] = [];
        }

        grouped[permission.module].push({
            id: permission.id,
            action: permission.action,
            key: `${permission.module}:${permission.action}`,
        });
    }

    return grouped;
};

export const getPermissionsForActor = async (
    actor: ActorContext,
    requestedStoreId?: string | null,
) => {
    const storeId = await resolveStoreIdByActor({
        userId: actor.userId,
        level: actor.level,
        requestedStoreId: requestedStoreId || undefined,
    });

    // Permissions are global, but we still resolve storeId to enforce:
    // - owner only can query store they own
    // - employees cannot switch store
    const data = await getPermissionsGrouped();
    return { storeId, data };
};

export const getRolesWithPermissions = async (
    actor: ActorContext,
    requestedStoreId?: string,
) => {
    const storeId = await resolveStoreIdByActor({
        userId: actor.userId,
        level: actor.level,
        requestedStoreId,
    });

    const roles = await Model.roles.findMany({
        where: {
            OR: [{ isSystem: true, storeId: null }, { storeId }],
        },
        orderBy: [{ isSystem: "desc" }, { name: "asc" }],
        include: {
            rolePermissions: {
                include: {
                    permission: {
                        select: {
                            id: true,
                            module: true,
                            action: true,
                        },
                    },
                },
            },
        },
    });

    // Prefer store-scoped roles. If a store-scoped role exists with the same name,
    // hide the global system role (storeId = null) to avoid cross-store edits confusion.
    const storeRoleNames = new Set(
        roles
            .filter((role) => role.storeId === storeId)
            .map((role) => role.name),
    );
    const visibleRoles = roles.filter((role) => {
        if (role.storeId === storeId) return true;
        if (
            role.isSystem &&
            role.storeId === null &&
            storeRoleNames.has(role.name)
        )
            return false;
        return true;
    });

    return {
        storeId,
        data: visibleRoles.map((role) => ({
            id: role.id,
            name: role.name,
            storeId: role.storeId,
            isSystem: role.isSystem,
            permissions: role.rolePermissions.map((rp) => ({
                id: rp.permission.id,
                module: rp.permission.module,
                action: rp.permission.action,
                key: `${rp.permission.module}:${rp.permission.action}`,
            })),
        })),
    };
};

export const getRoleForLevelWithPermissions = async (
    actor: ActorContext,
    requestedStoreId?: string,
) => {
    const storeId = await resolveStoreIdByActor({
        userId: actor.userId,
        level: actor.level,
        requestedStoreId,
    });

    const level = normalizeLevel(actor.level);
    const roleName = level === "owner" || level === "superadmin" ? "owner" : "kasir";

    const role = await Model.roles.findFirst({
        where: {
            storeId,
            isSystem: true,
            name: roleName,
        },
        include: {
            rolePermissions: {
                include: {
                    permission: {
                        select: {
                            id: true,
                            module: true,
                            action: true,
                        },
                    },
                },
            },
        },
    });

    if (!role) {
        throw new ValidationError(
            `Role ${roleName} untuk store ini belum tersedia, jalankan /rbac/migrate`,
            404,
            "role",
        );
    }

    return {
        storeId,
        data: [
            {
                id: role.id,
                name: role.name,
                storeId: role.storeId,
                isSystem: role.isSystem,
                permissions: role.rolePermissions.map((rp) => ({
                    id: rp.permission.id,
                    module: rp.permission.module,
                    action: rp.permission.action,
                    key: `${rp.permission.module}:${rp.permission.action}`,
                })),
            },
        ],
    };
};

export const createRole = async (
    actor: ActorContext,
    payload: { name: string; permissionIds: string[] },
    requestedStoreId?: string,
) => {
    const roleName = (payload.name || "").trim();
    if (!roleName) {
        throw new ValidationError("Nama role wajib diisi", 400, "name");
    }

    if (!Array.isArray(payload.permissionIds)) {
        throw new ValidationError(
            "permissionIds wajib array",
            400,
            "permissionIds",
        );
    }

    const storeId = await resolveStoreIdByActor({
        userId: actor.userId,
        level: actor.level,
        requestedStoreId,
    });

    const existing = await Model.roles.findFirst({
        where: {
            storeId,
            name: roleName,
        },
        select: { id: true },
    });

    if (existing) {
        throw new ValidationError(
            "Role dengan nama ini sudah ada di store",
            400,
            "name",
        );
    }

    const validPermissionCount = await Model.permissions.count({
        where: { id: { in: payload.permissionIds } },
    });

    if (validPermissionCount !== payload.permissionIds.length) {
        throw new ValidationError(
            "Ada permissionIds yang tidak valid",
            400,
            "permissionIds",
        );
    }

    const role = await Model.roles.create({
        data: {
            name: roleName,
            storeId,
            isSystem: false,
        },
        select: {
            id: true,
            name: true,
            storeId: true,
        },
    });

    await replaceRolePermissions(role.id, payload.permissionIds);

    return role;
};

export const updateRole = async (
    actor: ActorContext,
    roleId: string,
    payload: { name?: string; permissionIds?: string[] },
    requestedStoreId?: string,
) => {
    const storeId = await resolveStoreIdByActor({
        userId: actor.userId,
        level: actor.level,
        requestedStoreId,
    });

    // const role = await Model.roles.findUnique({
    //     where: { id: roleId },
    //     select: {
    //         id: true,
    //         name: true,
    //         storeId: true,
    //         isSystem: true,
    //     },
    // });

    // if (!role) throw new ValidationError("Role tidak ditemukan", 404, "id");

    // // Enforce store scope so changes in store A never affect store B.
    // if (!role.storeId) {
    //     throw new ValidationError(
    //         "Role global tidak bisa diubah lewat endpoint ini",
    //         400,
    //         "id",
    //     );
    // }

    // if (role.storeId !== storeId) {
    //     throw new UnauthorizedError("Role tidak termasuk store ini", 403);
    // }

    // System roles can have their permissions updated per-store, but cannot be renamed.
    // if (role.isSystem) {
    //     if (
    //         payload.name &&
    //         payload.name.trim().length > 0 &&
    //         payload.name.trim() !== role.name
    //     ) {
    //         throw new ValidationError(
    //             "Role bawaan sistem tidak bisa diubah namanya",
    //             400,
    //             "name",
    //         );
    //     }
    // }

    // if (payload.name && payload.name.trim().length > 0) {
    //     // For non-system roles, allow rename within the same store.
    //     if (!role.isSystem) {
    //         await Model.roles.update({
    //             where: { id: roleId },
    //             data: {
    //                 name: payload.name.trim(),
    //             },
    //         });
    //     }
    // }

    if (payload.permissionIds) {
        if (!Array.isArray(payload.permissionIds)) {
            throw new ValidationError(
                "permissionIds wajib array",
                400,
                "permissionIds",
            );
        }

        const validPermissionCount = await Model.permissions.count({
            where: { id: { in: payload.permissionIds } },
        });

        if (validPermissionCount !== payload.permissionIds.length) {
            throw new ValidationError(
                "Ada permissionIds yang tidak valid",
                400,
                "permissionIds",
            );
        }

        await replaceRolePermissions(roleId, payload.permissionIds);
    }

    return Model.roles.findUnique({
        where: { id: roleId },
        include: {
            rolePermissions: {
                include: {
                    permission: {
                        select: {
                            id: true,
                            module: true,
                            action: true,
                        },
                    },
                },
            },
        },
    });
};

export const assignRole = async (
    actor: ActorContext,
    payload: { userId: string; storeId?: string; roleId: string },
    requestedStoreId?: string,
) => {
    const userId = (payload.userId || "").trim();
    const roleId = (payload.roleId || "").trim();

    if (!userId) throw new ValidationError("userId wajib diisi", 400, "userId");
    if (!roleId) throw new ValidationError("roleId wajib diisi", 400, "roleId");

    const storeId = await resolveStoreIdByActor({
        userId: actor.userId,
        level: actor.level,
        requestedStoreId: payload.storeId || requestedStoreId,
    });

    const [targetUser, role, store] = await Promise.all([
        Model.users.findUnique({
            where: { id: userId },
            select: { id: true, level: true, storeId: true },
        }),
        Model.roles.findUnique({
            where: { id: roleId },
            select: { id: true, isSystem: true, storeId: true },
        }),
        Model.stores.findUnique({
            where: { id: storeId },
            select: { id: true, ownerId: true },
        }),
    ]);

    if (!targetUser)
        throw new ValidationError("User tidak ditemukan", 404, "userId");
    if (!role) throw new ValidationError("Role tidak ditemukan", 404, "roleId");
    if (!store)
        throw new ValidationError("Store tidak ditemukan", 404, "storeId");

    const targetLevel = normalizeLevel(targetUser.level || "");

    if (targetLevel === "owner" && store.ownerId !== targetUser.id) {
        throw new ValidationError(
            "Owner hanya boleh memiliki role di store miliknya",
            400,
            "userId",
        );
    }

    if (
        targetLevel !== "owner" &&
        targetUser.storeId &&
        targetUser.storeId !== storeId
    ) {
        throw new ValidationError(
            "Karyawan hanya boleh role sesuai storeId user",
            400,
            "storeId",
        );
    }

    if (!role.isSystem && role.storeId !== storeId) {
        throw new ValidationError(
            "Role custom hanya berlaku untuk store yang sama",
            400,
            "roleId",
        );
    }

    const result = await Model.user_roles.upsert({
        where: {
            userId_storeId: {
                userId,
                storeId,
            },
        },
        update: {
            roleId,
        },
        create: {
            userId,
            storeId,
            roleId,
        },
        include: {
            role: {
                select: {
                    id: true,
                    name: true,
                    isSystem: true,
                },
            },
        },
    });

    return result;
};

export const runRbacMigration = async (
    actor: ActorContext,
    requestedStoreId?: string | null,
) => {
    const actorLevel = normalizeLevel(actor.level);
    if (!["superadmin", "owner"].includes(actorLevel)) {
        throw new UnauthorizedError(
            "Hanya owner/superadmin yang bisa menjalankan migrasi RBAC",
            403,
        );
    }

    const permissions = await upsertPermissions();

    const permissionMap = new Map<string, string>();
    for (const permission of permissions) {
        permissionMap.set(
            `${permission.module}:${permission.action}`,
            permission.id,
        );
    }

    const missingOwnerKeys = OWNER_ALLOWED.filter(
        (key) => !permissionMap.get(key),
    );
    if (missingOwnerKeys.length > 0) {
        throw new ValidationError(
            `OWNER_ALLOWED mengandung permission yang belum ada: ${missingOwnerKeys.slice(0, 10).join(", ")}${missingOwnerKeys.length > 10 ? " ..." : ""}`,
            400,
            "OWNER_ALLOWED",
        );
    }

    const ownerPermissionIds = OWNER_ALLOWED.map(
        (key) => permissionMap.get(key) as string,
    );
    const kasirPermissionIds = KASIR_ALLOWED.map((key) =>
        permissionMap.get(key),
    ).filter((value): value is string => !!value);

    const whereOwnerScope =
        actorLevel === "owner"
            ? {
                  ownerId: actor.userId,
                  deletedAt: null,
              }
            : {
                  deletedAt: null,
              };

    let stores: Array<{ id: string; ownerId: string }> = [];
    if (requestedStoreId) {
        const resolvedStoreId = await resolveStoreIdByActor({
            userId: actor.userId,
            level: actor.level,
            requestedStoreId,
        });

        const store = await Model.stores.findFirst({
            where: { id: resolvedStoreId, deletedAt: null },
            select: { id: true, ownerId: true },
        });

        if (!store) {
            throw new ValidationError("Store tidak ditemukan", 404, "storeId");
        }

        stores = [store];
    } else {
        stores = await Model.stores.findMany({
            where: whereOwnerScope,
            select: {
                id: true,
                ownerId: true,
            },
        });
    }

    let ownerAssignments = 0;
    let employeeAssignments = 0;

    for (const store of stores) {
        const [ownerRole, kasirRole] = await Promise.all([
            upsertSystemRoleForStore(store.id, "owner"),
            upsertSystemRoleForStore(store.id, "kasir"),
        ]);

        await Promise.all([
            replaceRolePermissions(ownerRole.id, ownerPermissionIds),
            replaceRolePermissions(kasirRole.id, kasirPermissionIds),
        ]);

        await Model.user_roles.upsert({
            where: {
                userId_storeId: {
                    userId: store.ownerId,
                    storeId: store.id,
                },
            },
            update: {
                roleId: ownerRole.id,
            },
            create: {
                userId: store.ownerId,
                storeId: store.id,
                roleId: ownerRole.id,
            },
        });
        ownerAssignments += 1;

        const employees = await Model.users.findMany({
            where: {
                storeId: store.id,
                deletedAt: null,
                NOT: {
                    id: store.ownerId,
                },
            },
            select: {
                id: true,
                level: true,
            },
        });

        for (const employee of employees) {
            const mappedRoleName = mapRoleNameFromLegacyLevel(
                employee.level || "",
            );
            const roleId =
                mappedRoleName === "owner" ? ownerRole.id : kasirRole.id;

            await Model.user_roles.upsert({
                where: {
                    userId_storeId: {
                        userId: employee.id,
                        storeId: store.id,
                    },
                },
                update: {
                    roleId,
                },
                create: {
                    userId: employee.id,
                    storeId: store.id,
                    roleId,
                },
            });
            employeeAssignments += 1;
        }
    }

    return {
        permissions: permissions.length,
        storesProcessed: stores.length,
        ownerAssignments,
        employeeAssignments,
        globalSystemRolesDeleted: (await cleanupGlobalSystemRolesIfUnused())
            .deleted,
    };
};

export const resetRbacRoles = async (
    actor: ActorContext,
    storeId?: string | null,
) => {
    const actorLevel = normalizeLevel(actor.level);
    if (!["superadmin", "owner"].includes(actorLevel)) {
        throw new UnauthorizedError(
            "Hanya owner/superadmin yang bisa mereset RBAC",
            403,
        );
    }

    let targetStoreIds: string[] = [];

    if (storeId) {
        const resolvedStoreId = await resolveStoreIdByActor({
            userId: actor.userId,
            level: actor.level,
            requestedStoreId: storeId,
        });
        targetStoreIds = [resolvedStoreId];
    } else {
        const whereOwnerScope =
            actorLevel === "owner"
                ? {
                      ownerId: actor.userId,
                      deletedAt: null,
                  }
                : {
                      deletedAt: null,
                  };

        const stores = await Model.stores.findMany({
            where: whereOwnerScope,
            select: { id: true },
        });
        targetStoreIds = stores.map((s) => s.id);
    }

    for (const targetStoreId of targetStoreIds) {
        await withTxnRetry(async () => {
            await Model.$transaction(async (tx) => {
                // Remove all assignments for the store first (roleId has RESTRICT).
                await tx.user_roles.deleteMany({
                    where: { storeId: targetStoreId },
                });
                // Remove all roles for the store (system + custom); role_permissions cascades.
                await tx.roles.deleteMany({
                    where: { storeId: targetStoreId },
                });
            });
        });
    }

    const migrateResults: Array<{
        storeId: string;
        permissions: number;
        ownerAssignments: number;
        employeeAssignments: number;
        globalSystemRolesDeleted?: number;
    }> = [];

    for (const targetStoreId of targetStoreIds) {
        const result = await runRbacMigration(actor, targetStoreId);
        migrateResults.push({
            storeId: targetStoreId,
            permissions: result.permissions,
            ownerAssignments: result.ownerAssignments,
            employeeAssignments: result.employeeAssignments,
            globalSystemRolesDeleted: (result as any).globalSystemRolesDeleted,
        });
    }

    const totalOwnerAssignments = migrateResults.reduce(
        (sum, item) => sum + item.ownerAssignments,
        0,
    );
    const totalEmployeeAssignments = migrateResults.reduce(
        (sum, item) => sum + item.employeeAssignments,
        0,
    );
    const permissionsCount = migrateResults[0]?.permissions || 0;

    return {
        storesReset: targetStoreIds.length,
        storeIds: targetStoreIds,
        migration: {
            storesProcessed: targetStoreIds.length,
            permissions: permissionsCount,
            ownerAssignments: totalOwnerAssignments,
            employeeAssignments: totalEmployeeAssignments,
        },
        perStore: migrateResults,
    };
};

export const registerDefaultRolesForStores = async (
    actor: ActorContext,
    requestedStoreId?: string | null,
) => {
    const actorLevel = normalizeLevel(actor.level);
    if (!["superadmin", "owner"].includes(actorLevel)) {
        throw new UnauthorizedError(
            "Hanya owner/superadmin yang bisa mendaftarkan role",
            403,
        );
    }

    const permissions = await upsertPermissions();
    const permissionMap = new Map<string, string>();
    for (const permission of permissions) {
        permissionMap.set(
            `${permission.module}:${permission.action}`,
            permission.id,
        );
    }

    const missingOwnerKeys = OWNER_ALLOWED.filter(
        (key) => !permissionMap.get(key),
    );
    if (missingOwnerKeys.length > 0) {
        throw new ValidationError(
            `OWNER_ALLOWED mengandung permission yang belum ada: ${missingOwnerKeys.slice(0, 10).join(", ")}${missingOwnerKeys.length > 10 ? " ..." : ""}`,
            400,
            "OWNER_ALLOWED",
        );
    }

    const ownerPermissionIds = OWNER_ALLOWED.map(
        (key) => permissionMap.get(key) as string,
    );
    const kasirPermissionIds = KASIR_ALLOWED.map((key) =>
        permissionMap.get(key),
    ).filter((value): value is string => !!value);

    const whereOwnerScope =
        actorLevel === "owner"
            ? {
                  ownerId: actor.userId,
                  deletedAt: null,
              }
            : {
                  deletedAt: null,
              };

    let stores: Array<{ id: string; ownerId: string }> = [];
    if (requestedStoreId) {
        const resolvedStoreId = await resolveStoreIdByActor({
            userId: actor.userId,
            level: actor.level,
            requestedStoreId,
        });
        const store = await Model.stores.findFirst({
            where: { id: resolvedStoreId, deletedAt: null },
            select: { id: true, ownerId: true },
        });
        if (!store) {
            throw new ValidationError("Store tidak ditemukan", 404, "storeId");
        }
        stores = [store];
    } else {
        stores = await Model.stores.findMany({
            where: whereOwnerScope,
            select: { id: true, ownerId: true },
        });
    }

    const perStore: Array<{
        storeId: string;
        ownerRoleCreated: boolean;
        kasirRoleCreated: boolean;
        ownerRoleInitialized: boolean;
        kasirRoleInitialized: boolean;
        ownerAssignmentCreated: boolean;
    }> = [];

    for (const store of stores) {
        const ownerRole = await upsertSystemRoleForStoreWithFlag(
            store.id,
            "owner",
        );
        const kasirRole = await upsertSystemRoleForStoreWithFlag(
            store.id,
            "kasir",
        );

        // Only initialize permissions when the role is newly created OR has no permissions yet.
        const ownerRolePermCount = await Model.role_permissions.count({
            where: { roleId: ownerRole.id },
        });
        const kasirRolePermCount = await Model.role_permissions.count({
            where: { roleId: kasirRole.id },
        });

        let ownerRoleInitialized = false;
        let kasirRoleInitialized = false;

        if (ownerRole.created || ownerRolePermCount === 0) {
            await replaceRolePermissions(ownerRole.id, ownerPermissionIds);
            ownerRoleInitialized = true;
        }

        if (kasirRole.created || kasirRolePermCount === 0) {
            await replaceRolePermissions(kasirRole.id, kasirPermissionIds);
            kasirRoleInitialized = true;
        }

        // Ensure store owner has a role in their store (do not overwrite if already set).
        const existingOwnerAssignment = await Model.user_roles.findUnique({
            where: {
                userId_storeId: {
                    userId: store.ownerId,
                    storeId: store.id,
                },
            },
            select: { userId: true },
        });

        let ownerAssignmentCreated = false;
        if (!existingOwnerAssignment) {
            await Model.user_roles.create({
                data: {
                    userId: store.ownerId,
                    storeId: store.id,
                    roleId: ownerRole.id,
                },
            });
            ownerAssignmentCreated = true;
        }

        perStore.push({
            storeId: store.id,
            ownerRoleCreated: ownerRole.created,
            kasirRoleCreated: kasirRole.created,
            ownerRoleInitialized,
            kasirRoleInitialized,
            ownerAssignmentCreated,
        });
    }

    const globalDeleted = (await cleanupGlobalSystemRolesIfUnused()).deleted;

    return {
        permissions: permissions.length,
        storesProcessed: stores.length,
        globalSystemRolesDeleted: globalDeleted,
        perStore,
    };
};

export const purgeAllRbacData = async (actor: ActorContext) => {
    const actorLevel = normalizeLevel(actor.level);
    if (!["superadmin", "owner"].includes(actorLevel)) {
        throw new UnauthorizedError(
            "Hanya owner/superadmin yang bisa menghapus semua RBAC",
            403,
        );
    }

    // Danger zone: this removes all RBAC data globally.
    const result = await withTxnRetry(async () => {
        return await Model.$transaction(async (tx) => {
            const deletedUserRoles = await tx.user_roles.deleteMany({});
            const deletedRolePermissions = await tx.role_permissions.deleteMany(
                {},
            );
            const deletedRoles = await tx.roles.deleteMany({});
            const deletedPermissions = await tx.permissions.deleteMany({});

            return {
                user_roles: deletedUserRoles.count,
                role_permissions: deletedRolePermissions.count,
                roles: deletedRoles.count,
                permissions: deletedPermissions.count,
            };
        });
    });

    return result;
};
