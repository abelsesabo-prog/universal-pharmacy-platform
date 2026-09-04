import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { provisionTenant, transitionTenant, listTenantUsers, exportTenantSnapshot, validateRole } from "../services/tenantService.js";
import { upsertCustomer, upsertSupplier, listCustomers, listSuppliers } from "../services/customerSupplierService.js";
import { postJournal, listJournals } from "../services/ledgerPostingService.js";
import { queueNotification, listNotifications } from "../services/notificationService.js";
import { assertExportSafe } from "../services/migrationService.js";
import { recoveryPlan } from "../services/recoveryService.js";

const router = express.Router();

// Authentication is scoped to declared core endpoints rather than the router itself.
// This preserves the API's terminal 404 contract for unknown /api routes while keeping
// every real core endpoint protected.
router.get("/core/users", requireAuth, async (req,res,next)=>{ try { return res.json({success:true, users:await listTenantUsers({tenantId:req.user.tenantId, role:req.query.role ? validateRole(req.query.role) : undefined})}); } catch(e){next(e);} });
router.post("/core/tenants", requireAuth, requireRole("admin"), async (req,res,next)=>{ try { return res.status(201).json({success:true, tenant:await provisionTenant({...req.body, tenantId:req.body.tenantId || req.user.tenantId})}); } catch(e){next(e);} });
router.post("/core/tenants/:status", requireAuth, requireRole("admin"), async (req,res,next)=>{ try { return res.json({success:true, tenant:await transitionTenant({tenantId:req.user.tenantId,status:req.params.status,actorId:req.user.sub,reason:req.body.reason})}); } catch(e){next(e);} });
router.get("/core/export", requireAuth, requireRole("admin"), async (req,res,next)=>{ try { return res.json({success:true, export:assertExportSafe(await exportTenantSnapshot({tenantId:req.user.tenantId}))}); } catch(e){next(e);} });
router.get("/core/customers", requireAuth, async (req,res,next)=>{ try{return res.json({success:true,customers:await listCustomers({tenantId:req.user.tenantId})});}catch(e){next(e);}});
router.post("/core/customers", requireAuth, requireRole("admin","manager","staff"), async(req,res,next)=>{try{return res.status(201).json({success:true,customer:await upsertCustomer({...req.body,tenantId:req.user.tenantId})});}catch(e){next(e);}});
router.get("/core/suppliers", requireAuth, async (req,res,next)=>{ try{return res.json({success:true,suppliers:await listSuppliers({tenantId:req.user.tenantId})});}catch(e){next(e);}});
router.post("/core/suppliers", requireAuth, requireRole("admin","manager","staff"), async(req,res,next)=>{try{return res.status(201).json({success:true,supplier:await upsertSupplier({...req.body,tenantId:req.user.tenantId})});}catch(e){next(e);}});
router.get("/core/ledger", requireAuth, requireRole("admin","manager"), async(req,res,next)=>{try{return res.json({success:true,journals:await listJournals({tenantId:req.user.tenantId,account:req.query.account})});}catch(e){next(e);}});
router.post("/core/ledger", requireAuth, requireRole("admin","manager"), async(req,res,next)=>{try{return res.status(201).json({success:true,journal:await postJournal({...req.body,tenantId:req.user.tenantId})});}catch(e){next(e);}});
router.get("/core/notifications", requireAuth, async(req,res,next)=>{try{return res.json({success:true,notifications:await listNotifications({tenantId:req.user.tenantId,status:req.query.status})});}catch(e){next(e);}});
router.post("/core/notifications", requireAuth, requireRole("admin","manager"), async(req,res,next)=>{try{return res.status(201).json({success:true,notification:await queueNotification({...req.body,tenantId:req.user.tenantId})});}catch(e){next(e);}});
router.post("/core/recovery/plan", requireAuth, requireRole("admin"), (req,res,next)=>{try{return res.json({success:true,plan:recoveryPlan(req.body)});}catch(e){next(e);}});

export default router;
