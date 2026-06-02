export const REQUIRED_AGENT_COUNT = 5;

/**
 * Returns an agent id for every uploaded row. Assignment is round-robin so
 * remainder rows go to the first agents in creation order.
 */
export function allocateAgentIds(agentIds: string[], itemCount: number) {
  if (agentIds.length !== REQUIRED_AGENT_COUNT) {
    throw new Error(`Exactly ${REQUIRED_AGENT_COUNT} agents are required for distribution.`);
  }
  if (!Number.isInteger(itemCount) || itemCount < 1) {
    throw new Error("At least one list item is required for distribution.");
  }
  return Array.from({ length: itemCount }, (_, index) => agentIds[index % REQUIRED_AGENT_COUNT]);
}
