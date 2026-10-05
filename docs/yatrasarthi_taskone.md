<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Weather Digital Twin: The Living Graph</title>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@500;700&family=Source+Serif+4:wght@400;600&display=swap" rel="stylesheet">
<style>
:root{box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);
--bg:#f5f7f6;--fg:#14232b;--mut:#51636b;--line:#cbd6d3;--card:#fff;--acc:#0b5f6b;--code:#eaf0ee;--g:#1d7a46;--a:#b26a00;--r:#b3261e}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#0e1a1f;--fg:#e3ecea;--mut:#95a8ae;--line:#26393f;--card:#142329;--acc:#5cc3cf;--code:#1a2d34;--g:#5fd08a;--a:#f0b04a;--r:#ff8a80}}
:root[data-theme="dark"]{--bg:#0e1a1f;--fg:#e3ecea;--mut:#95a8ae;--line:#26393f;--card:#142329;--acc:#5cc3cf;--code:#1a2d34;--g:#5fd08a;--a:#f0b04a;--r:#ff8a80}
html{scroll-padding-top:env(safe-area-inset-top,0px)}
*,*:before,*:after{box-sizing:inherit}
body{margin:0;background:var(--bg);color:var(--fg);font:16.5px/1.6 "Source Serif 4",Georgia,serif}
main{max-width:880px;margin:0 auto;padding:28px 18px 70px}
h1,h2,h3{font-family:"Bricolage Grotesque",system-ui,sans-serif;line-height:1.15;margin:0}
h1{font-size:clamp(1.7rem,5vw,2.3rem);margin-bottom:8px}
.lead{color:var(--mut);margin:0 0 20px;font-size:1.03rem}
h2{font-size:1.28rem;margin:38px 0 6px;padding-top:12px;border-top:2px solid var(--acc)}
h3{font-size:1.0rem;margin:18px 0 3px}
p{margin:6px 0}
.w{overflow-x:auto;margin:8px 0}
table{border-collapse:collapse;width:100%;min-width:560px;font-size:.9rem;line-height:1.4}
th,td{border:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top}
th{background:var(--code);font-family:"Bricolage Grotesque",system-ui,sans-serif}
code,pre.code{font:.82rem ui-monospace,Menlo,monospace;background:var(--code);border-radius:4px}
code{padding:1px 4px}pre.code{padding:12px;overflow-x:auto;line-height:1.5;white-space:pre}
ul{padding-left:20px;margin:4px 0}li{margin:3px 0}
.note{border-left:4px solid var(--acc);padding:4px 12px;background:var(--code);margin:8px 0;font-size:.93rem}
.pitch{border-left:4px solid var(--r);padding:8px 14px;background:var(--code);margin:10px 0;font-style:italic}
.tag{display:inline-block;font:600 .72rem "Bricolage Grotesque",system-ui,sans-serif;padding:1px 8px;border-radius:99px;border:1.5px solid;margin-left:6px}
.core{color:var(--r);border-color:var(--r)}
.easy{color:var(--g);border-color:var(--g)}
</style></head><body><main>

<h1>The Living Graph: a weather digital twin worth watching</h1>
<p class="lead">A detailed build plan for Task 1, built around one idea: don't show weather on a map, show weather attacking your dependency graph — the exact structure that already makes YatraSarthi different from every other travel app.</p>

<h2>Why this needs to not be a map with a slider</h2>
<p>Every team in the room tonight has the same four mandatory boxes to tick. Most will tick them the obvious way: a map, some weather icons, a slider that changes a number somewhere on screen. That's compliant. It's also completely forgettable by the third team a judge sees do it.</p>
<div class="pitch">"Most digital twins in this room will be a twin of the weather. Ours is a twin of the trip." Your actual innovation isn't weather data — it's the dependency graph, the thing that already knows a delayed train breaks a shared cab three hops downstream. So don't bolt weather onto a map. Wire it straight into the graph, and let the graph itself be the visual.</div>
<p>The map still exists — requirement 2 is explicit about geospatial visualization, and you shouldn't lose points chasing style over compliance. But it's the supporting view. The graph is the headline.</p>

<h2>Screen structure</h2>
<p>One "Digital Twin" screen, two views, a tab switch between them:</p>
<ul>
<li><b>Map view</b> — satisfies requirement 2 literally: nodes plotted at real coordinates, weather badges, social-signal pins. Straightforward, already covered in the earlier build plan.</li>
<li><b>Graph view</b> <span class="tag core">the centerpiece</span> — the same trip, same live weather value, rendered as a force-directed node-link diagram that visibly strains and snaps under simulated weather. This is where the demo actually happens.</li>
</ul>
<p>Both views read from the exact same simulation state, driven by one storm control — switching tabs mid-demo proves it's one system, not two separate gimmicks.</p>

<h2>The Living Graph — visual grammar</h2>
<div class="w"><table>
<tr><th>What you see</th><th>What it actually means</th></tr>
<tr><td>Node icon</td><td>Transport mode — plane, train, car, hotel — pulled straight from your existing node type</td></tr>
<tr><td>Node ring color</td><td>Status: green on-track, amber at-risk, red broken — your existing status field, nothing invented</td></tr>
<tr><td>Edge thickness</td><td>Remaining slack — thick means plenty of buffer, thin means it's close</td></tr>
<tr><td>Edge color</td><td>A green-to-red gradient as slack shrinks toward zero</td></tr>
<tr><td>Edge "snapping"</td><td>Slack has hit zero on a hard constraint — the connection breaks, animated, not just recolored</td></tr>
<tr><td>A small ring on a node</td><td>Confidence — how sure the estimate is, shown as a percentage arc</td></tr>
</table></div>
<p>Every one of these maps to a number your cascade engine already produces. The visual isn't decoration layered on top of the math — it <i>is</i> the math, skinned. That's what makes it explainable instead of just pretty: a judge can watch an edge thin out and correctly guess it's about to break, before you say a word.</p>

<h3>Build it: D3 force layout</h3>
<pre class="code">// CDN: https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js
const sim = d3.forceSimulation(nodes)
  .force("link", d3.forceLink(edges).id(d => d.id).distance(110))
  .force("charge", d3.forceManyBody().strength(-220))
  .force("center", d3.forceCenter(w / 2, h / 2))
  .force("collide", d3.forceCollide(30));

sim.on("tick", () => {
  edgeLines.attr("x1", d => d.source.x).attr("y1", d => d.source.y)
           .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
  nodeCircles.attr("cx", d => d.x).attr("cy", d => d.y);
});</pre>

<h3>Build it: edge state from the storm value</h3>
<p>Reuse the lookup table from the core build plan — this is the only place weather touches logic:</p>
<pre class="code">function edgeState(edge, intensity) {
  const delay = estimateWeatherImpact(edge.mode, intensity);   // from the existing lookup
  const slack = edge.bufferMin - delay.addedDelayMin;
  if (slack <= 0 && edge.constraint === "hard") return { state: "broken", strain: 1 };
  const strain = Math.min(1, 1 - slack / edge.bufferMin);
  return { state: strain > 0.6 ? "at_risk" : "ok", strain };
}
// drive width/color from `strain`, e.g. width = 6 - strain*4, color = interpolateGreenToRed(strain)</pre>

<h3>Build it: the snap</h3>
<pre class="code">.edge-breaking { stroke-dasharray: 6 4; animation: snap .6s ease-out forwards; }
@keyframes snap {
  0%   { stroke-dashoffset: 0;  opacity: 1; }
  60%  { stroke-dashoffset: 24; opacity: .5; }
  100% { stroke-dashoffset: 48; opacity: 0; }
}
/* pair with a small node shake on the node it just orphaned */
.node-hit { animation: shake .3s ease-in-out; }
@keyframes shake { 25%{transform:translateX(-3px)} 75%{transform:translateX(3px)} }</pre>

<h2>The storm gauge</h2>
<p>A flat range slider undersells the moment. A dial reads as a control panel — closer to "operating a system" than "adjusting a setting," which is the tone you want for a digital twin.</p>
<pre class="code">&lt;input type="range" id="storm" min="0" max="100" value="0" style="opacity:0; position:absolute; width:100%"&gt;
&lt;svg viewBox="0 0 200 110"&gt;
  &lt;path d="M10,100 A90,90 0 0,1 190,100" stroke="var(--line)" stroke-width="10" fill="none"/&gt;
  &lt;line id="needle" x1="100" y1="100" x2="100" y2="25" stroke="var(--acc)" stroke-width="4"
        style="transform-origin:100px 100px"/&gt;
&lt;/svg&gt;
&lt;script&gt;
storm.addEventListener("input", e => {
  const v = +e.target.value;
  needle.style.transform = `rotate(${(v/100)*180 - 90}deg)`;
  recompute(v);   // recalculates every edge, redraws the graph, fires the log
});
&lt;/script&gt;</pre>
<p>Layer the native range input invisibly over the SVG so it stays draggable and accessible, while the dial is what's actually seen.</p>

<h2>Live cascade narration</h2>
<p>The single biggest gap in a typical map-plus-slider demo: the judge sees an end state, not a story. A ticker beside the graph, printing each effect as it's computed, turns a jump-cut into a sequence — which is also a direct, plain-language demonstration of "identify direct and cascading effects."</p>
<pre class="code">function logEvent(msg, icon = "🌧️") {
  const li = document.createElement("li");
  li.textContent = `${icon} ${msg}`;
  ticker.prepend(li);
}
// called in sequence as recompute() walks the graph:
// logEvent("Rainfall at 45mm/hr on the Andheri–airport leg")
// logEvent("Road leg now needs 90 min, was 45", "⏱️")
// logEvent("Priya's transfer buffer consumed", "⚠️")
// logEvent("Shared cab pickup now unreachable", "💥")</pre>
<p>Stagger each line with a ~300ms delay keyed to the same order the graph animates in, so the two are visibly telling one story rather than one instant recalculation.</p>

<h2>Confidence rings — the uncertainty requirement, made visible</h2>
<p>The brief explicitly wants "probabilistic predictions with associated uncertainty." Most teams will satisfy that with a sentence. Show it instead: a small radial percentage next to any at-risk or broken node.</p>
<pre class="code">&lt;svg width="36" height="36"&gt;
  &lt;circle r="16" cx="18" cy="18" stroke="var(--line)" stroke-width="4" fill="none"/&gt;
  &lt;circle r="16" cx="18" cy="18" stroke="var(--r)" stroke-width="4" fill="none"
    stroke-dasharray="100" stroke-dashoffset="{{100 - confidencePct}}"
    transform="rotate(-90 18 18)"/&gt;
&lt;/svg&gt;</pre>
<p>Derive <code>confidencePct</code> from how far past the threshold the current storm value sits in your lookup table — a simple ratio is honest and defensible; it doesn't need to be a real statistical model to be a legitimate uncertainty signal for this demo.</p>

<h2>Build order and time budget</h2>
<div class="w"><table>
<tr><th>Layer</th><th>Effort</th><th>Priority</th></tr>
<tr><td>Static force graph, real nodes/edges, no interactivity yet</td><td>~45 min</td><td><span class="tag easy">do first</span></td></tr>
<tr><td>Storm dial wired to <code>edgeState</code>, edges recolor/resize live</td><td>~45 min</td><td><span class="tag core">core</span></td></tr>
<tr><td>Snap animation on hard breaks</td><td>~30 min</td><td><span class="tag core">core</span> — this is the moment judges remember</td></tr>
<tr><td>Log ticker</td><td>~30 min</td><td><span class="tag easy">high value, low effort</span></td></tr>
<tr><td>Confidence rings</td><td>~20 min</td><td>do if the core above is solid</td></tr>
<tr><td>Map view (from the earlier plan)</td><td>reuse existing plan</td><td>needed for compliance, build in parallel by a second person</td></tr>
</table></div>
<p>If time runs out, the graph plus the dial plus the snap animation alone — no ticker, no rings — already beats a generic map-and-slider demo. Add the rest in the order above as time allows.</p>

<h2>Demo script</h2>
<ol>
<li>Open on the Graph view. Say what it is in one sentence: "This is your itinerary's actual dependency graph — the same one that powers our core recovery engine."</li>
<li>Turn the storm dial up slowly. Narrate along with the ticker as edges thin, then snap. Let the visual do the work — pause, don't talk over the snap.</li>
<li>Point at a confidence ring: "and it's not just telling you it broke — it's telling you how sure it is."</li>
<li>Switch to Map view for three seconds: "same simulation, geospatially — this is the compliance box." Then switch straight back to the graph to end on the stronger visual.</li>
</ol>

</main></body></html>