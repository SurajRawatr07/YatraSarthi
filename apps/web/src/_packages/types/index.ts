// ===== Enums =====
export type NodeType        = "flight" | "train" | "bus" | "cab" | "hotel" | "phantom";
export type PhantomMode      = "auto_cab" | "walk" | "local_train" | "bus" | "other";
export type ConstraintType   = "hard" | "soft";
export type NodeStatus       = "pending_review" | "on_track" | "at_risk" | "broken" | "confirmed" | "cancelled";
export type TriggerSource    = "vendor_cancellation" | "weather" | "delay";
export type TripStatus       = "healthy" | "needs_attention" | "unhealthy" | "resolving" | "cancelled";
export type ActionState      = "proposed" | "awaiting_payment" | "expired" | "executing"
                       | "pending_vendor" | "confirmed" | "failed";
export type ConfirmType      = "self_reported" | "vendor_verified";
export type PaymentStatus    = "pending" | "paid" | "refunded" | "failed";
export type MemberResponse   = "pending" | "agreed" | "declined";
export type DisruptionSource = "user_reported" | "flight_provider" | "train_unofficial" | "road_eta";
export type CauseFlag        = "airline_controlled" | "extraordinary" | "unknown";
export type RankingMode      = "cheapest" | "fastest" | "preserve_itinerary";
export type TrustLevel       = "high" | "medium" | "low";

// ===== Core entities =====
export interface User {
  id: string;
  phone: string;                 // E.164
  name: string;
  whatsappOptIn: boolean;
  notificationPrefs: {
    disruptionAlerts: "on" | "quiet";   // never fully off
    phantomWarnings: boolean;
    paymentRequests: boolean;
    groupActivity: boolean;
  };
  emergencyContacts: EmergencyContact[];
  subscription: { tier: "free" | "pro"; expiresAt?: string };
  createdAt: string;
}
export interface EmergencyContact {
  id: string; name: string; phone: string; deliveryMethod: "sms" | "whatsapp";
}

export type TripType = 'solo' | 'group';

export interface Trip {
  id: string; name: string; destination: string;
  startDate: string; endDate: string;
  tripType?: TripType;
  ownerId: string; memberIds: string[]; joinCode: string;
  status: TripStatus;                    // derived
  healthScore: number;                   // 0-100
  weakestEdge?: { edgeId: string; label: string; missChance: number };
  activeDisruptionId?: string;
  createdAt: string; updatedAt: string; version: number;
}

export interface Node {
  id: string; tripId: string; ownerId: string;   
  type: NodeType; phantomMode?: PhantomMode;
  vendor?: string; label: string;                
  time: string;
  constraintType: ConstraintType;
  status: NodeStatus;
  triggerSource?: TriggerSource;                 // set when a disruption signal (cancellation/delay) was detected during extraction
  rawExtract: Record<string, unknown>;
  confidence?: Record<string, number>;           
  refundPolicy?: {
    source: "extracted" | "policy_library" | "user_provided" | "unmatched";
    summary: string; ruleId?: string;
  };
  routing?: { fromLabel: string; toLabel: string; estimatedMin: number; paddingMin: number; provider: string };
  createdAt: string; updatedAt: string;
}

export interface Edge {
  id: string; tripId: string;
  fromNodeId: string; toNodeId: string;
  bufferMin: number; paddingMin: number; constraint: ConstraintType;
  shared: boolean; sharedByMemberIds?: string[];  
}

export interface Action {
  id: string; tripId: string; disruptionId: string; optionId: string;
  state: ActionState;
  confirmType?: ConfirmType; proofRef?: string;
  triggerSource?: "vendor_cancellation" | "weather" | string;
  agreements: { memberId: string; response: MemberResponse; respondedAt?: string }[];
  vendorDraft?: { subject: string; body: string; ruleCited?: string; sentAt?: string; nudgedAt?: string[] };
  costTotal: number; possibleCompensation?: number;
  createdAt: string; updatedAt: string; version: number;
}

export interface Payment {
  id: string; tripId: string; actionId: string; memberId: string;
  amount: number;                        
  status: PaymentStatus;
  aggregatorRef?: string; paymentLinkUrl?: string;
  deadlineAt: string; paidAt?: string;
}

export interface EventLogEntry {
  id: string; tripId: string; seq: number;
  actor: string;                         
  type: string;                          
  payload: Record<string, unknown>;
  ts: string;
}

export interface RecoveryOption {
  optionId: string; name: string;
  netCost: number;                       
  possibleCompensation?: number;         
  arrivalTime: string;
  nodesDropped: string[];                
  recommended: boolean;
  scoreBreakdown: { costNorm: number; timeNorm: number; nodesNorm: number };  
  changes: { nodeId: string; field: string; from: unknown; to: unknown }[];
  perMemberShare: { memberId: string; amount: number }[];
  quoteExpiresAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolCalls?: any[];
  ts: string;
}

export interface ChatSession {
  id: string;
  tripId: string;
  userId: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}
