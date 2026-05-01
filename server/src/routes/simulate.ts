import { Router } from 'express';
import { getScenarios, runSimulation, SimulationScenario } from '../services/spamSimulator';

const router = Router();
const VALID_SCENARIOS: SimulationScenario[] = ['burst', 'distributed', 'scanning', 'credential_stuffing'];

router.get('/scenarios', (_req, res) => {
  const scenarios = getScenarios();
  res.json({ scenarios, total: scenarios.length });
});

router.post('/run', async (req, res) => {
  const scenario = req.body?.scenario as SimulationScenario | undefined;
  if (!scenario || !VALID_SCENARIOS.includes(scenario)) {
    return res.status(400).json({
      error: 'Invalid scenario.',
      validScenarios: VALID_SCENARIOS
    });
  }

  const result = await runSimulation(scenario);
  return res.json(result);
});

export default router;
