import { createBranch, listBranches } from "../services/branchService.js";

export async function createBranchController(req, res, next) {
    try { const branch = await createBranch({ tenantId: req.user.tenantId, ...req.body }); return res.status(201).json({ success: true, branch }); }
    catch (error) { return next(error); }
}

export async function listBranchesController(req, res, next) {
    try { const branches = await listBranches(req.user.tenantId); return res.json({ success: true, count: branches.length, branches }); }
    catch (error) { return next(error); }
}
