type Constraint = "hard" | "soft";
interface GraphEdge { from: string; to: string; bufferMin: number; paddingMin: number; constraint: Constraint; }

export class TripGraph {
  nodes = new Set<string>();
  edges: GraphEdge[] = [];
  /** Track which nodes are cancelled — their downstream edges become hard-broken regardless of buffer */
  cancelledNodes = new Set<string>();

  addNode(id: string) { this.nodes.add(id); }
  addEdge(e: GraphEdge) { this.edges.push(e); }

  /** Mark a node as cancelled — propagation treats all outgoing edges as hard-broken (buffer = 0) */
  markCancelled(id: string) { this.cancelledNodes.add(id); }

  private preds(id: string) { return this.edges.filter(e => e.to === id); }
  private succs(id: string) { return this.edges.filter(e => e.from === id); }

  topoOrder(): string[] {           // Kahn's algorithm — plain, no library needed
    const indeg = new Map([...this.nodes].map(n => [n, 0]));
    this.edges.forEach(e => indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1));
    const queue = [...this.nodes].filter(n => indeg.get(n) === 0);
    const order: string[] = [];
    while (queue.length) {
      const n = queue.shift()!;
      order.push(n);
      this.edges.filter(e => e.from === n).forEach(e => {
        indeg.set(e.to, indeg.get(e.to)! - 1);
        if (indeg.get(e.to) === 0) queue.push(e.to);
      });
    }
    return order;
  }

  propagateDelay(brokenNode: string, delayMin: number) {
    const delay = new Map<string, number>([[brokenNode, delayMin]]);
    const broken: string[] = [], atRisk: string[] = [];

    for (const n of this.topoOrder()) {
      const incoming = this.preds(n).map(e => {
        const upstream = delay.get(e.from) ?? 0;

        // Cancelled-node handling: if the upstream node is cancelled,
        // force every downstream edge to hard-broken regardless of buffer.
        if (this.cancelledNodes.has(e.from)) {
          return { remaining: upstream || delayMin, constraint: 'hard' as Constraint };
        }

        const slack = e.bufferMin + e.paddingMin;
        return { remaining: Math.max(0, upstream - slack), constraint: e.constraint };
      });

      const worst = incoming.reduce(
        (a, b) => (b.remaining > a.remaining ? b : a),
        { remaining: 0, constraint: 'soft' as Constraint }
      );

      if (worst.remaining > 0) {
        delay.set(n, worst.remaining);
        (worst.constraint === 'hard' ? broken : atRisk).push(n);
      }
    }

    return { broken, atRisk, delay };
  }

  /**
   * propagateCancellation — special case for cancelled nodes.
   * Forces every node reachable downstream of `cancelledNodeId` to broken (hard),
   * regardless of their buffer or constraint type.
   * Returns { broken: string[] } — the full set of hard-broken downstream nodes.
   */
  propagateCancellation(cancelledNodeId: string): { broken: string[] } {
    this.markCancelled(cancelledNodeId);

    // BFS/DFS over successors — all reachable descendants are hard-broken
    const visited = new Set<string>();
    const queue = [cancelledNodeId];
    while (queue.length) {
      const cur = queue.shift()!;
      for (const e of this.succs(cur)) {
        if (!visited.has(e.to)) {
          visited.add(e.to);
          queue.push(e.to);
        }
      }
    }

    // The cancelled node itself is NOT in broken (it's cancelled), only its descendants
    const broken = [...visited].filter(id => id !== cancelledNodeId);
    return { broken };
  }

  /**
   * Dry-run impact simulation — same as propagateDelay but returns
   * a rich per-hop breakdown without mutating any state.
   * Used by POST /api/trips/:id/impact-simulate
   */
  simulateImpact(
    brokenNodeId: string,
    delayMin: number,
    cancelled = false
  ): {
    broken: string[];
    atRisk: string[];
    delay: Map<string, number>;
    hopChain: { nodeId: string; delayMin: number; constraint: string; reason: string }[];
  } {
    if (cancelled) this.markCancelled(brokenNodeId);

    const delay = new Map<string, number>([[brokenNodeId, delayMin]]);
    const broken: string[] = [];
    const atRisk: string[] = [];
    const hopChain: { nodeId: string; delayMin: number; constraint: string; reason: string }[] = [];

    for (const n of this.topoOrder()) {
      if (n === brokenNodeId) continue;

      const incoming = this.preds(n).map(e => {
        const upstream = delay.get(e.from) ?? 0;

        if (this.cancelledNodes.has(e.from)) {
          return {
            remaining: upstream || delayMin,
            constraint: 'hard' as Constraint,
            reason: `upstream ${e.from} cancelled`,
          };
        }

        const slack = e.bufferMin + e.paddingMin;
        return {
          remaining: Math.max(0, upstream - slack),
          constraint: e.constraint,
          reason: slack > 0 ? `buffer absorbed ${slack}m` : 'no buffer',
        };
      });

      if (incoming.length === 0) continue;

      const worst = incoming.reduce(
        (a, b) => (b.remaining > a.remaining ? b : a),
        { remaining: 0, constraint: 'soft' as Constraint, reason: 'none' }
      );

      if (worst.remaining > 0) {
        delay.set(n, worst.remaining);
        if (worst.constraint === 'hard') {
          broken.push(n);
        } else {
          atRisk.push(n);
        }
        hopChain.push({
          nodeId: n,
          delayMin: worst.remaining,
          constraint: worst.constraint,
          reason: worst.reason,
        });
      }
    }

    return { broken, atRisk, delay, hopChain };
  }
}
