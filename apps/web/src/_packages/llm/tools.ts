export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required: string[];
  };
}

export const CHAT_TOOLS: ToolDefinition[] = [
  {
    name: 'moveNode',
    description:
      'Move a booking node to a different time. Always runs the impact simulator first ' +
      '(dry-run) and shows the user what changes before anything commits.',
    parameters: {
      type: 'object',
      properties: {
        nodeId:    { type: 'string', description: 'The ID of the node to move.' },
        newTime:   { type: 'string', description: 'ISO 8601 datetime for the new time.' },
        reason:    { type: 'string', description: 'Brief user-stated reason for the move.' },
      },
      required: ['nodeId', 'newTime'],
    },
  },
  {
    name: 'addPhantomNode',
    description:
      'Add an unbooked transit leg (auto-cab, walk, local train, etc.) between two points.',
    parameters: {
      type: 'object',
      properties: {
        tripId:          { type: 'string', description: 'Trip the leg belongs to.' },
        mode:            { type: 'string', description: 'Transit mode.', enum: ['auto_cab', 'walk', 'local_train', 'bus', 'other'] },
        fromLabel:       { type: 'string', description: 'Origin description.' },
        toLabel:         { type: 'string', description: 'Destination description.' },
        departsByNodeId: { type: 'string', description: 'Node ID this leg departs after.' },
        paddingMin:      { type: 'string', description: 'Extra buffer in minutes (0 if unspecified).' },
      },
      required: ['tripId', 'mode', 'fromLabel', 'toLabel', 'departsByNodeId'],
    },
  },
  {
    name: 'removeNode',
    description: 'Remove a booking or phantom node from the trip.',
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'The ID of the node to remove.' },
        reason: { type: 'string', description: 'Brief user-stated reason.' },
      },
      required: ['nodeId'],
    },
  },
  {
    name: 'requestAlternatives',
    description: 'Fetch recovery options (alternative bookings) for a disrupted node.',
    parameters: {
      type: 'object',
      properties: {
        tripId:          { type: 'string', description: 'Trip ID.' },
        disruptedNodeId: { type: 'string', description: 'Node ID that is disrupted.' },
        preferenceHint:  { type: 'string', description: 'Optional user preference.', enum: ['cheapest', 'fastest', 'balanced'] },
      },
      required: ['tripId', 'disruptedNodeId'],
    },
  },
  {
    name: 'simulateChange',
    description: 'Run the impact simulator in dry-run mode for a hypothetical change.',
    parameters: {
      type: 'object',
      properties: {
        tripId:       { type: 'string', description: 'Trip ID.' },
        nodeId:       { type: 'string', description: 'Node to simulate the change on.' },
        changeType:   { type: 'string', description: 'Kind of change to simulate.', enum: ['delay', 'cancelled', 'remove'] },
        delayMinutes: { type: 'string', description: 'Delay duration in minutes.' },
      },
      required: ['tripId', 'nodeId', 'changeType'],
    },
  },
];

export function toGeminiFunctionDeclarations(tools: ToolDefinition[]): object[] {
  return tools.map(t => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));
}
