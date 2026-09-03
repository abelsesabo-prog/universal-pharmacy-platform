import test from "node:test";
import assert from "node:assert/strict";
import { toMinorUnits, fromMinorUnits, assertBalancedLines, buildJournal } from "./ledgerService.js";
import { validateTenant, validateRole } from "./tenantService.js";
import { validateNotification } from "./notificationService.js";
import { classifyIntegrationFailure } from "./integrationService.js";
import { buildDryRunReport, assertExportSafe } from "./migrationService.js";
import { recoveryPlan } from "./recoveryService.js";
import { buildKpiPack, recommendation } from "./analyticsService.js";

test("exact money conversion never uses floating point accounting truth",()=>{assert.equal(toMinorUnits("3000.25"),300025n);assert.equal(fromMinorUnits(300025n),"3000.25");assert.throws(()=>toMinorUnits("1.234"));});
test("journal must balance debits and credits",()=>{assert.deepEqual(assertBalancedLines([{account:"CASH",side:"DEBIT",amount:"30"},{account:"SALES",side:"CREDIT",amount:"30"}]),{debits:3000n,credits:3000n});assert.throws(()=>assertBalancedLines([{account:"CASH",side:"DEBIT",amount:"30"}]));});
test("journal is tenant-scoped and immutable",()=>{const j=buildJournal({tenantId:"demo",lines:[{account:"CASH",side:"DEBIT",amount:"10"},{account:"SALES",side:"CREDIT",amount:"10"}]});assert.equal(j.tenantId,"demo");assert.equal(j.immutable,true);});
test("tenant lifecycle and role contracts are explicit",()=>{assert.equal(validateTenant({tenantId:"demo",name:"Demo Pharmacy"}).status,"PROVISIONED");assert.equal(validateRole("manager"),"manager");assert.throws(()=>validateRole("root"));});
test("notification contract validates channel, recipient and priority",()=>{assert.equal(validateNotification({tenantId:"demo",channel:"sms",recipient:"255700000000",message:"Low stock",priority:"high"}).status,"PENDING");assert.throws(()=>validateNotification({tenantId:"demo",channel:"sms",recipient:"",message:"x"}));});
test("integration failure policy separates transient from permanent",()=>{assert.equal(classifyIntegrationFailure(503),"TRANSIENT");assert.equal(classifyIntegrationFailure(422),"PERMANENT");});
test("migration dry-run separates automatic, review and rejected rows",()=>{const r=buildDryRunReport([{sourceId:"1",sourceType:"product",confidence:0.95},{sourceId:"2",sourceType:"product",confidence:0.7},{sourceId:"3",sourceType:"product",confidence:0.2}]);assert.deepEqual([r.autoMappable,r.reviewRequired,r.rejected],[1,1,1]);assert.throws(()=>assertExportSafe({tenantId:"demo",passwordHash:"secret"}));});
test("recovery plan has explicit RPO/RTO and restore checks",()=>{const p=recoveryPlan({scenario:"lost_device",rpoMinutes:30,rtoMinutes:60});assert.equal(p.rpoMinutes,30);assert.equal(p.drillRequired,true);});
test("analytics keeps facts separate from recommendations",()=>{const k=buildKpiPack({sales:[{total:100}]});assert.equal(k.facts.salesTotal,100);assert.deepEqual(k.predictions,[]);assert.equal(recommendation({title:"Reorder",evidence:["7-day demand"],confidence:"Medium"}).confidence,"Medium");});
