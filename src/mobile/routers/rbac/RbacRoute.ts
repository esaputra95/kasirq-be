import express from "express";
import {
    getPermissions,
    getRoles,
    getMyRole,
    postAssignRole,
    postPurgeAllRbac,
    postRegisterRolesAllStores,
    postMigrateRbac,
    postResetRbac,
    postRole,
    putRole,
} from "#root/mobile/controllers/rbac/RbacController";
import requireOwnerAccess from "#root/mobile/controllers/auth/requireOwnerAccess";

const router = express.Router();

// Allow GET for backward compatibility, but keep it guarded.
router.get("/migrate", requireOwnerAccess, postMigrateRbac);
router.post("/migrate", requireOwnerAccess, postMigrateRbac);
router.get("/reset", requireOwnerAccess, postResetRbac);
router.post("/reset", requireOwnerAccess, postResetRbac);
router.post("/register-roles", requireOwnerAccess, postRegisterRolesAllStores);
router.post("/purge", requireOwnerAccess, postPurgeAllRbac);

router.get("/permissions", requireOwnerAccess, getPermissions);
router.get("/roles", getRoles);
router.get("/roles/me", getMyRole);
router.post("/roles", requireOwnerAccess, postRole);
router.put("/roles/:id", requireOwnerAccess, putRole);
router.post("/assign-role", requireOwnerAccess, postAssignRole);

export default router;
