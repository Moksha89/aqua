const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('node:crypto');

const prisma = new PrismaClient();
const ranges = {
  salinityPpt: { min: 5, max: 25, unit: 'ppt' },
  ph: { min: 7, max: 8.5, unit: 'pH' },
  alkalinity: { min: 80, max: 200, unit: 'mg/L' },
  hardness: { min: 100, max: 300, unit: 'mg/L' },
  doMgl: { min: 4, max: 12, unit: 'mg/L' },
  temperatureC: { min: 26, max: 32, unit: 'C' },
  ammonia: { min: 0, max: 0.5, unit: 'mg/L' },
  nitrite: { min: 0, max: 1, unit: 'mg/L' },
  transparencyCm: { min: 20, max: 40, unit: 'cm' },
};
const heads = [
  ['SEED', 'Seed', 'DIRECT'], ['FEED', 'Feed', 'DIRECT'], ['MEDICINE', 'Medicine', 'DIRECT'],
  ['LABOUR', 'Labour', 'DIRECT'], ['ELECTRICITY', 'Electricity', 'DIRECT'], ['DIESEL', 'Diesel', 'DIRECT'],
  ['GENSET_RENT', 'Genset rent', 'DIRECT'], ['HARVEST', 'Harvest costs', 'DIRECT'],
  ['TRANSPORT', 'Transport', 'DIRECT'], ['COMMISSION', 'Commission', 'DIRECT'],
  ['REPAIRS', 'Repairs and maintenance', 'DIRECT'], ['OTHER_DIRECT', 'Other direct costs', 'DIRECT'],
];
async function main() {
  const actor = randomUUID();
  for (const name of ['Vannamei', 'Tiger', 'Rohu', 'Katla', 'Pangasius']) {
    const existing = await prisma.species.findFirst({ where: { businessId: null, name } });
    if (existing) await prisma.species.update({ where: { id: existing.id }, data: { waterParamRanges: ranges, updatedBy: actor } });
    else await prisma.species.create({ data: { id: randomUUID(), businessId: null, category: name === 'Rohu' || name === 'Katla' ? 'FISH' : 'SHRIMP', name, waterParamRanges: ranges, createdBy: actor, updatedBy: actor, deviceId: actor } });
  }
  for (const [code, name, classification] of heads) {
    const existing = await prisma.costHead.findFirst({ where: { businessId: null, code } });
    if (!existing) await prisma.costHead.create({ data: { id: randomUUID(), businessId: null, code, name, classification, createdBy: actor, updatedBy: actor, deviceId: actor } });
  }
  const businessId = process.env.SEED_BUSINESS_ID;
  if (businessId) {
    for (const speciesCategory of ['SHRIMP', 'FISH']) {
      await prisma.preparationTemplate.create({
        data: { businessId, speciesCategory, name: `${speciesCategory} default preparation`, items: [], createdBy: actor, updatedBy: actor, deviceId: actor },
      });
    }
  }
}
main().finally(() => prisma.$disconnect());
