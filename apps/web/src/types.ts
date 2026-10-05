import { Trip, Node, Edge, Action, Payment, EventLogEntry, RecoveryOption, User } from '@yatrasarthi/types';

export * from '@yatrasarthi/types';

export interface Traveller extends User {
  paymentStatus?: 'paid' | 'pending' | 'failed';
  tripStatus?: 'confirmed' | 'pending';
  amount?: number;
  avatar: string; // UI specific
}

export interface DisruptionEvent {
  id: string;
  type: string;
  affectedNodeId: string;
  description: string;
  delay?: number;
  timestamp: string;
  simulated: boolean;
}

export interface TripData extends Trip {
  travellers: Traveller[];
  nodes: Node[];
  edges: Edge[];
  health: number; // mapped from healthScore
  disruption?: DisruptionEvent;
  recoveryPlans?: RecoveryOption[];
  actions: Action[];
  eventLog: EventLogEntry[];
}

export interface UserPreferences {
  cost: number;
  time: number;
  bookings: number;
}
