const db = require("../models");

async function logAudit(req, { action, entityType, entityId = null, metadata = null }, options = {}) {
  try {
    if (!db.AuditLog || !action || !entityType) return;

    await db.AuditLog.create({
      actor_user_account_id: req?.user?.id || null,
      action,
      entity_type: entityType,
      entity_id: entityId === null || entityId === undefined ? null : String(entityId),
      metadata: metadata ? JSON.stringify(metadata) : null,
      ip_address: req?.ip || req?.headers?.["x-forwarded-for"] || null,
      user_agent: req?.headers?.["user-agent"] || null
    }, options);
  } catch (error) {
    console.error("Audit log gagal:", error.message);
  }
}

module.exports = { logAudit };
