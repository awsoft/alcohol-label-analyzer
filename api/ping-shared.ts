import { calculateComplianceScore } from '../shared/analysisTypes';

export default function handler(_req: any, res: any) {
  const score = calculateComplianceScore({ overallStatus: 'Compliant', keyIssues: [], summary: '', mandatoryItems: [], observations: [] });
  res.status(200).json({ probe: 'ts-shared-import', score });
}
