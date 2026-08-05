/* STAGING ONLY: idempotent demo data for AE Farm screenshots and acceptance checks. */
const path = require('path');
process.env.NODE_PATH = [path.join(__dirname, '../apps/api/node_modules'), process.env.NODE_PATH].filter(Boolean).join(path.delimiter);
require('module').Module._initPaths();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const SYS = '00000000-0000-0000-0000-000000000000';
const meta = { createdBy: SYS, updatedBy: SYS, deviceId: SYS };
const day = (offset) => new Date(Date.now() - offset * 86400000);

async function main() {
  let biz = await prisma.aeBusiness.findFirst({ where: { name: 'Demo Aqua Farm' } });
  if (!biz) biz = await prisma.aeBusiness.create({ data: { name: 'Demo Aqua Farm', language: 'en', currency: 'INR', district: 'Nellore', village: 'Kovur', ...meta } });
  const owner = await prisma.userAccount.upsert({ where: { mobile: '9000000001' }, update: {}, create: { mobile: '9000000001', name: 'Demo Owner', defaultLanguage: 'en', status: 'ACTIVE', ...meta } });
  const operator = await prisma.userAccount.upsert({ where: { mobile: '9000000002' }, update: {}, create: { mobile: '9000000002', name: 'Demo Operator', defaultLanguage: 'en', status: 'ACTIVE', ...meta } });
  let farm = await prisma.farm.findFirst({ where: { businessId: biz.id } });
  if (!farm) farm = await prisma.farm.create({ data: { businessId: biz.id, name: 'Kovur Farm', ...meta } });
  const ponds = [];
  for (const [code, name, extent, status] of [['P-1', 'Pond One', '1.5', 'STOCKED'], ['P-2', 'Pond Two', '2.0', 'STOCKED'], ['P-3', 'Pond Three', '1.0', 'IDLE']]) {
    let pond = await prisma.pond.findFirst({ where: { businessId: biz.id, code } });
    if (!pond) pond = await prisma.pond.create({ data: { businessId: biz.id, farmId: farm.id, code, name, extentAcres: extent, ownershipType: 'OWN', waterDepthM: '1.5', status, ...meta } });
    ponds.push(pond);
  }
  const ownerRole = await prisma.userBusinessRole.findFirst({ where: { userId: owner.id, businessId: biz.id, voidedAt: null } });
  if (ownerRole) await prisma.userBusinessRole.update({ where: { id: ownerRole.id }, data: { financialAccess: true, pondScope: ['*'], updatedBy: SYS } });
  else await prisma.userBusinessRole.create({ data: { businessId: biz.id, userId: owner.id, role: 'AE_OWNER', financialAccess: true, pondScope: ['*'], ...meta } });
  const operatorRole = await prisma.userBusinessRole.findFirst({ where: { userId: operator.id, businessId: biz.id, voidedAt: null } });
  if (operatorRole) await prisma.userBusinessRole.update({ where: { id: operatorRole.id }, data: { pondScope: [ponds[0].id], updatedBy: SYS } });
  else await prisma.userBusinessRole.create({ data: { businessId: biz.id, userId: operator.id, role: 'AE_OPERATOR', financialAccess: false, pondScope: [ponds[0].id], ...meta } });
  const crops = [];
  for (const [pond, code, prep, stock] of [[ponds[0], 'CROP-1', 108, 96], [ponds[1], 'CROP-2', 60, 48]]) {
    let crop = await prisma.crop.findFirst({ where: { businessId: biz.id, code } });
    if (!crop) crop = await prisma.crop.create({ data: { businessId: biz.id, pondId: pond.id, code, speciesCategory: 'SHRIMP', status: 'ACTIVE', preparationStartDate: day(prep), stockingDate: day(stock), survivalAssumptionPct: '80', feedLoggingEnabled: true, ...meta } });
    crops.push(crop);
  }
  let closedCrop = await prisma.crop.findFirst({ where: { businessId: biz.id, code: 'CROP-CLOSED' } });
  if (!closedCrop) {
    closedCrop = await prisma.crop.create({ data: { businessId: biz.id, pondId: ponds[2].id, code: 'CROP-CLOSED', speciesCategory: 'SHRIMP', status: 'CLOSED', preparationStartDate: day(240), stockingDate: day(210), expectedHarvestDate: day(90), finalHarvestDate: day(105), closedAt: day(100), closedBy: owner.id, standingBiomassG: '0', estimatedSurvivors: 0n, targetSizeG: '22', survivalAssumptionPct: '82', feedLoggingEnabled: true, ...meta } });
  }
  const frozen = await prisma.cropPnl.findFirst({ where: { businessId: biz.id, cropId: closedCrop.id, version: 1 } });
  if (!frozen) await prisma.cropPnl.create({ data: { businessId: biz.id, cropId: closedCrop.id, version: 1, generatedAt: day(100), generatedBy: owner.id, payload: { status: 'FROZEN', revenuePaise: '840000', costPaise: '560000', netProfitPaise: '280000', source: 'staging-seed' }, isCurrent: true, ...meta } });
  let species = await prisma.species.findFirst({ where: { businessId: biz.id, name: 'Vannamei shrimp' } });
  if (!species) species = await prisma.species.create({ data: { businessId: biz.id, category: 'SHRIMP', name: 'Vannamei shrimp', defaultDocDays: 120, ...meta } });
  const heads = [];
  for (const [code, name, classification] of [['FEED', 'Feed', 'DIRECT'], ['POWER', 'Power', 'DIRECT'], ['LABOUR', 'Labour', 'DIRECT']]) {
    let head = await prisma.costHead.findFirst({ where: { businessId: biz.id, code } });
    if (!head) head = await prisma.costHead.create({ data: { businessId: biz.id, code, name, classification, ...meta } });
    heads.push(head);
  }
  const parties = [];
  for (const [name, type, mobile] of [['Coastal Feeds', ['SUPPLIER'], '9000000101'], ['Nellore Traders', ['BUYER'], '9000000102']]) {
    let party = await prisma.party.findFirst({ where: { businessId: biz.id, name } });
    if (!party) party = await prisma.party.create({ data: { businessId: biz.id, name, type, mobile, ...meta } });
    parties.push(party);
  }
  let commonPool = await prisma.commonExpensePool.findFirst({ where: { businessId: biz.id, costHeadId: heads[2].id, basis: 'POND_EXTENT', voidedAt: null } });
  if (!commonPool) commonPool = await prisma.commonExpensePool.create({ data: { businessId: biz.id, periodMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1), costHeadId: heads[2].id, basis: 'POND_EXTENT', amountPaise: 75000n, status: 'OPEN', ...meta } });
  const expenseData = [
    { expenseDate: day(12), costHeadId: heads[0].id, allocationTarget: 'POND_CROP', pondId: ponds[0].id, cropId: crops[0].id, amountPaise: 500000n, paymentStatus: 'UNPAID', partyId: parties[0].id },
    { expenseDate: day(8), costHeadId: heads[1].id, allocationTarget: 'POND_CROP', pondId: ponds[1].id, cropId: crops[1].id, amountPaise: 185000n, paymentStatus: 'PAID', paidAmountPaise: 185000n, partyId: parties[0].id },
    { expenseDate: day(4), costHeadId: heads[2].id, allocationTarget: 'COMMON', commonPoolId: commonPool.id, amountPaise: 75000n, paymentStatus: 'UNPAID' },
  ];
  for (const item of expenseData) {
    const naturalKey = {
      businessId: biz.id,
      costHeadId: item.costHeadId,
      allocationTarget: item.allocationTarget,
      pondId: item.pondId ?? null,
      cropId: item.cropId ?? null,
      commonPoolId: item.commonPoolId ?? null,
      amountPaise: item.amountPaise,
      partyId: item.partyId ?? null,
    };
    const matches = await prisma.expense.findMany({ where: naturalKey, orderBy: { createdAt: 'asc' }, select: { id: true } });
    if (matches.length > 1) await prisma.expense.deleteMany({ where: { id: { in: matches.slice(1).map((row) => row.id) } } });
    if (matches.length === 0) await prisma.expense.create({ data: { businessId: biz.id, ...item, paymentMode: item.paymentStatus === 'PAID' ? 'CASH' : undefined, ...meta } });
  }
  const paymentKey = { businessId: biz.id, partyId: parties[0].id, direction: 'PAYABLE', amountPaise: 185000n, mode: 'CASH' };
  const payments = await prisma.payment.findMany({ where: paymentKey, orderBy: { createdAt: 'asc' }, select: { id: true } });
  if (payments.length > 1) await prisma.payment.deleteMany({ where: { id: { in: payments.slice(1).map((row) => row.id) } } });
  if (payments.length === 0) await prisma.payment.create({ data: { ...paymentKey, paidOn: day(3), ...meta } });
  const limit = await prisma.supplierCreditLimit.findFirst({ where: { businessId: biz.id, partyId: parties[0].id } });
  if (!limit) await prisma.supplierCreditLimit.create({ data: { businessId: biz.id, partyId: parties[0].id, limitPaise: 1500000n, creditPeriodDays: 30, effectiveFrom: day(30), ...meta } });
  const asset = await prisma.asset.findFirst({ where: { businessId: biz.id, name: 'Pond aerator A1' } });
  if (!asset) await prisma.asset.create({ data: { businessId: biz.id, name: 'Pond aerator A1', category: 'AERATOR', pondId: ponds[0].id, purchaseDate: day(90), costPaise: 1200000n, salvagePct: '10', usefulLifeYears: '5', ...meta } });
  const lease = await prisma.leaseAgreement.findFirst({ where: { businessId: biz.id, landlordName: 'Kovur Landowner' } });
  const leaseAgreement = lease ?? await prisma.leaseAgreement.create({ data: { businessId: biz.id, landlordName: 'Kovur Landowner', landlordContact: '9000000200', extentAcres: '4.5', ratePerAcrePerAnnumPaise: 900000n, startDate: day(180), endDate: new Date(Date.now() + 185 * 86400000), paymentFrequency: 'QUARTERLY', advancePaise: 300000n, advanceRefundable: true, ...meta } });
  await prisma.pond.update({ where: { id: ponds[1].id }, data: { ownershipType: 'LEASED', leaseAgreementId: leaseAgreement.id, updatedBy: SYS } });
  let rate = await prisma.marketRateReference.findFirst({ where: { businessId: biz.id, speciesId: species.id, key: '30' } });
  if (!rate) rate = await prisma.marketRateReference.create({ data: { businessId: biz.id, rateDate: day(2), region: 'Nellore', speciesId: species.id, basis: 'COUNT', key: '30', ratePerKgPaise: 52000n, ...meta } });
  const harvest = await prisma.harvestEvent.findFirst({ where: { businessId: biz.id, cropId: crops[0].id } });
  if (!harvest) {
    const event = await prisma.harvestEvent.create({ data: { businessId: biz.id, cropId: crops[0].id, harvestDate: day(2), doc: 96, type: 'PARTIAL', reason: 'MARKET_RATE', sampleTaken: true, sampleCount: 40, sampleWeightG: '880', abwG: '22', rateCardId: rate.id, grossValuePaise: 1040000n, deductionsPaise: 20000n, netRealisationPaise: 1020000n, receivablePaise: 1020000n, receivableDueDate: new Date(Date.now() + 14 * 86400000), ...meta } });
    await prisma.harvestLine.create({ data: { businessId: biz.id, harvestEventId: event.id, speciesId: species.id, basis: 'COUNT', key: '30', quantityKg: '20', ratePerKgPaise: 52000n, lineValuePaise: 1040000n, ...meta } });
  }
  const scrap = await prisma.scrapSale.findFirst({ where: { businessId: biz.id, item: 'Used netting' } });
  if (!scrap) await prisma.scrapSale.create({ data: { businessId: biz.id, cropId: crops[0].id, pondId: ponds[0].id, saleDate: day(6), item: 'Used netting', quantity: '12.500', ratePaise: 8000n, buyerPartyId: parties[1].id, amountPaise: 100000n, ...meta } });
  const periodStart = new Date('2026-07-01T00:00:00.000Z');
  const periodEnd = new Date('2026-08-01T00:00:00.000Z');
  const allocationRun = await prisma.allocationRun.findFirst({ where: { businessId: biz.id, periodStart, periodEnd, trigger: 'MONTH_END' } });
  const seedCropIds = crops.concat(closedCrop).map((crop) => crop.id);
  if (allocationRun) {
    await prisma.apportionedCost.deleteMany({ where: { businessId: biz.id, cropId: { in: seedCropIds }, allocationRunId: { not: allocationRun.id }, kind: { in: ['LEASE', 'DEPRECIATION', 'COMMON'] } } });
  } else {
    await prisma.apportionedCost.deleteMany({ where: { businessId: biz.id, cropId: { in: seedCropIds }, kind: { in: ['LEASE', 'DEPRECIATION', 'COMMON'] } } });
  }
  if (!allocationRun) {
    const { AllocationService } = require(path.join(__dirname, '../apps/api/dist/allocation/allocation.service'));
    await new AllocationService(prisma).run(
      { periodStart: periodStart.toISOString(), periodEnd: periodEnd.toISOString(), trigger: 'MONTH_END' },
      { businessId: biz.id, userId: owner.id, deviceId: SYS },
    );
  }
  console.log(`STAGING seed ready for ${biz.name} (${biz.id})`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
