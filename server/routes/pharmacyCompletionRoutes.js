import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { recordEligibility, createPreauthorization, createClaimBatch, expiryWatch, createRelocationPlan, executeRelocation, submitEfd, createDelegation, revokeDelegation } from "../services/pharmacyCompletionService.js";

const router = express.Router();

const staffRoles = ["admin", "manager", "staff"];
const managerRoles = ["admin", "manager"];
const requirePharmacyAuth = requireAuth;

router.post("/pharmacy/insurance/eligibility", requirePharmacyAuth, requireRole(...staffRoles), async (req, res, next) => { try { return res.status(201).json({ success: true, eligibility: await recordEligibility({ ...req.body, tenantId: req.user.tenantId }) }); } catch (e) { next(e); } });
router.post("/pharmacy/insurance/preauthorization", requirePharmacyAuth, requireRole(...staffRoles), async (req, res, next) => { try { return res.status(201).json({ success: true, preauthorization: await createPreauthorization({ ...req.body, tenantId: req.user.tenantId }) }); } catch (e) { next(e); } });
router.post("/pharmacy/insurance/claim-batches", requirePharmacyAuth, requireRole(...managerRoles), async (req, res, next) => { try { return res.status(201).json({ success: true, batch: await createClaimBatch({ ...req.body, tenantId: req.user.tenantId }) }); } catch (e) { next(e); } });

router.get("/pharmacy/expiry/watch", requirePharmacyAuth, requireRole(...staffRoles), async (req, res, next) => { try { return res.json({ success: true, batches: await expiryWatch({ tenantId: req.user.tenantId, days: req.query.days, branchId: req.query.branchId }) }); } catch (e) { next(e); } });
router.post("/pharmacy/expiry/relocations", requirePharmacyAuth, requireRole(...managerRoles), async (req, res, next) => { try { return res.status(201).json({ success: true, plan: await createRelocationPlan({ ...req.body, tenantId: req.user.tenantId }) }); } catch (e) { next(e); } });
router.post("/pharmacy/expiry/relocations/:id/execute", requirePharmacyAuth, requireRole(...managerRoles), async (req, res, next) => { try { return res.json(await executeRelocation({ tenantId: req.user.tenantId, planId: req.params.id, actorId: req.user.sub })); } catch (e) { next(e); } });

router.post("/pharmacy/efd/documents", requirePharmacyAuth, requireRole(...managerRoles), async (req, res, next) => { try { return res.status(201).json({ success: true, document: await submitEfd({ ...req.body, tenantId: req.user.tenantId }) }); } catch (e) { next(e); } });
router.post("/pharmacy/delegations", requirePharmacyAuth, requireRole(...managerRoles), async (req, res, next) => { try { return res.status(201).json({ success: true, delegation: await createDelegation({ ...req.body, tenantId: req.user.tenantId, delegatorId: req.user.sub }) }); } catch (e) { next(e); } });
router.post("/pharmacy/delegations/:id/revoke", requirePharmacyAuth, requireRole(...managerRoles), async (req, res, next) => { try { return res.json(await revokeDelegation({ tenantId: req.user.tenantId, delegationId: req.params.id })); } catch (e) { next(e); } });

export default router;
