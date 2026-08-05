/* STAGING ONLY: idempotent demo data for AE Farm screenshots and acceptance checks. */
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
  await prisma.userBusinessRole.upsert({ where: { userId_businessId: { userId: owner.id, businessId: biz.id } }, update: { financialAccess: true, pondScope: ['*'] }, create: { businessId: biz.id, userId: owner.id, role: 'AE_OWNER', financialAccess: true, pondScope: ['*'], ...meta } });
  await prisma.userBusinessRole.upsert({ where: { userId_businessId: { userId: operator.id, businessId: biz.id } }, update: { pondScope: [ponds[0].id] }, create: { businessId: biz.id, userId: operator.id, role: 'AE_OPERATOR', financialAccess: false, pondScope: [ponds[0].id], ...meta } });
  const crops = [];
  for (const [pond, code, prep, stock] of [[ponds[0], 'CROP-1', 108, 96], [ponds[1], 'CROP-2', 60, 48]]) {
    let crop = await prisma.crop.findFirst({ where: { businessId: biz.id, code } });
    if (!crop) crop = await prisma.crop.create({ data: { businessId: biz.id, pondId: pond.id, code, speciesCategory: 'SHRIMP', status: 'ACTIVE', preparationStartDate: day(prep), stockingDate: day(stock), survivalAssumptionPct: '80', feedLoggingEnabled: true, ...meta } });
    crops.push(crop);
  }
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
  const expenseData = [
    { expenseDate: day(12), costHeadId: heads[0].id, allocationTarget: 'POND_CROP', pondId: ponds[0].id, cropId: crops[0].id, amountPaise: 500000n, paymentStatus: 'UNPAID', partyId: parties[0].id },
    { expenseDate: day(8), costHeadId: heads[1].id, allocationTarget: 'POND_CROP', pondId: ponds[1].id, cropId: crops[1].id, amountPaise: 185000n, paymentStatus: 'PAID', paidAmountPaise: 185000n, partyId: parties[0].id },
    { expenseDate: day(4), costHeadId: heads[2].id, allocationTarget: 'COMMON', commonPoolId: undefined, amountPaise: 75000n, paymentStatus: 'UNPAID' },
  ];
  for (const item of expenseData) {
    const exists = await prisma.expense.findFirst({ where: { businessId: biz.id, expenseDate: item.expenseDate, amountPaise: item.amountPaise } });
    if (!exists) await prisma.expense.create({ data: { businessId: biz.id, ...item, paymentMode: item.paymentStatus === 'PAID' ? 'CASH' : undefined, ...meta } });
  }
  const payment = await prisma.payment.findFirst({ where: { businessId: biz.id, partyId: parties[0].id, amountPaise: 185000n } });
  if (!payment) await prisma.payment.create({ data: { businessId: biz.id, partyId: parties[0].id, paidOn: day(3), direction: 'PAYABLE', amountPaise: 185000n, mode: 'CASH', ...meta } });
  const limit = await prisma.supplierCreditLimit.findFirst({ where: { businessId: biz.id, partyId: parties[0].id } });
  if (!limit) await prisma.supplierCreditLimit.create({ data: { businessId: biz.id, partyId: parties[0].id, limitPaise: 1500000n, creditPeriodDays: 30, effectiveFrom: day(30), ...meta } });
  const asset = await prisma.asset.findFirst({ where: { businessId: biz.id, name: 'Pond aerator A1' } });
  if (!asset) await prisma.asset.create({ data: { businessId: biz.id, name: 'Pond aerator A1', category: 'AERATOR', pondId: ponds[0].id, purchaseDate: day(90), costPaise: 1200000n, salvagePct: '10', usefulLifeYears: '5', ...meta } });
  const lease = await prisma.leaseAgreement.findFirst({ where: { businessId: biz.id, landlordName: 'Kovur Landowner' } });
  if (!lease) await prisma.leaseAgreement.create({ data: { businessId: biz.id, landlordName: 'Kovur Landowner', landlordContact: '9000000200', extentAcres: '4.5', ratePerAcrePerAnnumPaise: 900000n, startDate: day(180), endDate: new Date(Date.now() + 185 * 86400000), paymentFrequency: 'QUARTERLY', advancePaise: 300000n, advanceRefundable: true, ...meta } });
  let rate = await prisma.marketRateReference.findFirst({ where: { businessId: biz.id, speciesId: species.id, key: '30' } });
  if (!rate) rate = await prisma.marketRateReference.create({ data: { businessId: biz.id, rateDate: day(2), region: 'Nellore', speciesId: species.id, basis: 'COUNT', key: '30', ratePerKgPaise: 52000n, ...meta } });
  const harvest = await prisma.harvestEvent.findFirst({ where: { businessId: biz.id, cropId: crops[0].id } });
  if (!harvest) {
    const event = await prisma.harvestEvent.create({ data: { businessId: biz.id, cropId: crops[0].id, harvestDate: day(2), doc: 96, type: 'PARTIAL', reason: 'MARKET_RATE', sampleTaken: true, sampleCount: 40, sampleWeightG: '880', abwG: '22', rateCardId: rate.id, grossValuePaise: 1040000n, deductionsPaise: 20000n, netRealisationPaise: 1020000n, receivablePaise: 1020000n, receivableDueDate: new Date(Date.now() + 14 * 86400000), ...meta } });
    await prisma.harvestLine.create({ data: { businessId: biz.id, harvestEventId: event.id, speciesId: species.id, basis: 'COUNT', key: '30', quantityKg: '20', ratePerKgPaise: 52000n, lineValuePaise: 1040000n, ...meta } });
  }
  console.log(`STAGING seed ready for ${biz.name} (${biz.id})`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
