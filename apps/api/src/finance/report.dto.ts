import { ApiProperty } from '@nestjs/swagger';

export class CashReportDto { @ApiProperty() view!: string; @ApiProperty({ type: Object }) payments!: unknown; @ApiProperty({ type: Object }) expenses!: unknown; }
export class ProfitabilityReportDto { @ApiProperty() view!: string; @ApiProperty({ type: Object }) crops!: unknown; @ApiProperty({ type: Object }) harvests!: unknown; @ApiProperty({ type: Object }) expenses!: unknown; @ApiProperty({ type: Object }) idle!: unknown; }
export class CropSummaryReportDto { @ApiProperty({ type: Object }) rows!: unknown; }
export class CostSheetReportDto { @ApiProperty({ type: Object }) direct!: unknown; @ApiProperty({ type: Object }) apportioned!: unknown; }
export class EstimateVsActualReportDto { @ApiProperty({ type: Object }) rows!: unknown; }
export class PondHistoryReportDto { @ApiProperty({ type: Object }) rows!: unknown; }
export class LifetimeProfitabilityReportDto { @ApiProperty() harvestRevenuePaise!: string; @ApiProperty() idleCostPaise!: string; }
export class BusinessPnlReportDto { @ApiProperty() revenuePaise!: string; @ApiProperty() costPaise!: string; @ApiProperty() netProfitPaise!: string; }
export class CostHeadAnalysisReportDto { @ApiProperty({ type: Object }) rows!: unknown; }
export class AssetRegisterReportDto { @ApiProperty({ type: Object }) rows!: unknown; }
export class LeaseRegisterReportDto { @ApiProperty({ type: Object }) rows!: unknown; }
