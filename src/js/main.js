/**
 * Neural Network Activation Background
 * Pure 2D Canvas — no dependencies
 *
 * Implements a visible integrate-and-fire neural network:
 * - Neurons placed in a relaxed organic layout across the viewport
 * - Axon connections link nearby neurons with visible lines
 * - Neurons accumulate charge and glow warmer (grey → amber → gold)
 * - At threshold: neuron FIRES with a bright flash + ring pulse
 * - Signal pulses visibly travel along axon lines to neighbors
 * - Receiving neurons accumulate delivered charge → cascading chain reactions
 * - Multiple spontaneous sources keep waves continuously propagating
 */

(function () {
  'use strict';

  // ─── Configuration ───────────────────────────────────────────────
  var NEURON_COUNT = 140;
  var CONNECTION_RADIUS = 140;     // Max axon length in px
  var FIRE_THRESHOLD = 0.85;       // Slightly lower threshold → more cascades
  var CHARGE_DECAY = 0.995;        // Slower leak → charge lingers longer
  var REFRACTORY_FRAMES = 90;      // Longer cooldown for pacing
  var SIGNAL_SPEED = 1.6;          // Slower travel — easier to follow
  var SIGNAL_WEIGHT = 0.24;        // Slightly stronger delivery
  var SPONTANEOUS_RATE = 0.012;    // More frequent random charge bumps
  var BURST_RATE = 0.022;          // More spontaneous fires for visible cascading

  // Visual sizes
  var NEURON_RADIUS_MIN = 2.5;
  var NEURON_RADIUS_MAX = 4.5;
  var CONNECTION_LINE_WIDTH = 0.5;

  // Colors — cool teal palette matching the site theme
  var BG_COLOR = '#F8FAFB';

  // Quiet neuron: cool blue-grey
  var QUIET = { r: 170, g: 180, b: 195 };
  // Charging neuron: teal
  var CHARGING = { r: 20, g: 148, b: 140 };
  // Firing neuron: bright cyan-teal
  var FIRE = { r: 45, g: 212, b: 191 };
  // Bright core flash
  var FLASH_CORE = { r: 180, g: 245, b: 235 };
  // Axon quiet
  var AXON_QUIET = { r: 190, g: 200, b: 210 };
  // Axon active
  var AXON_ACTIVE = { r: 20, g: 160, b: 150 };
  // Signal pulse
  var SIGNAL = { r: 16, g: 185, b: 170 };

  // ─── State ───────────────────────────────────────────────────────
  var canvas, ctx;
  var neurons = [];
  var connections = [];
  var signals = [];
  var width, height;

  // ─── Helpers ─────────────────────────────────────────────────────

  function lerp(a, b, t) { return a + (b - a) * t; }

  function lerpColor(cA, cB, t) {
    return {
      r: Math.round(lerp(cA.r, cB.r, t)),
      g: Math.round(lerp(cA.g, cB.g, t)),
      b: Math.round(lerp(cA.b, cB.b, t))
    };
  }

  function rgba(c, a) {
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a.toFixed(3) + ')';
  }

  function dist(ax, ay, bx, by) {
    var dx = ax - bx, dy = ay - by;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }

  // ─── Initialization ──────────────────────────────────────────────

  function init() {
    var existingCanvas = document.querySelector('canvas');
    canvas = document.createElement('canvas');

    if (existingCanvas) {
      existingCanvas.parentNode.replaceChild(canvas, existingCanvas);
    } else {
      document.body.insertBefore(canvas, document.body.firstChild);
    }

    ctx = canvas.getContext('2d');
    resize();
    placeNeurons();
    buildConnections();

    window.addEventListener('resize', onResize);
    animate();
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  var resizeTimer;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      resize();
      placeNeurons();
      buildConnections();
      signals = [];
    }, 150);
  }

  // ─── Neuron Placement (Poisson-disk-like) ────────────────────────

  function placeNeurons() {
    neurons = [];
    var margin = 30;
    var minDist = Math.max(50, Math.sqrt((width * height) / NEURON_COUNT) * 0.7);

    for (var attempt = 0; attempt < NEURON_COUNT * 80 && neurons.length < NEURON_COUNT; attempt++) {
      var x = margin + Math.random() * (width - margin * 2);
      var y = margin + Math.random() * (height - margin * 2);

      var ok = true;
      for (var j = 0; j < neurons.length; j++) {
        if (dist(x, y, neurons[j].x, neurons[j].y) < minDist) {
          ok = false;
          break;
        }
      }

      if (ok) {
        neurons.push({
          x: x,
          y: y,
          potential: 0,
          cooldown: Math.floor(Math.random() * 30), // Stagger initial cooldowns
          radius: NEURON_RADIUS_MIN + Math.random() * (NEURON_RADIUS_MAX - NEURON_RADIUS_MIN),
          fireFlash: 0,
          ringPulse: 0,   // Expanding ring on fire
          vx: (Math.random() - 0.5) * 0.06,  // Slower drift
          vy: (Math.random() - 0.5) * 0.06,
          neighborCount: 0
        });
      }
    }
  }

  // ─── Connection Graph ────────────────────────────────────────────

  function buildConnections() {
    connections = [];
    // Reset neighbor counts
    for (var n = 0; n < neurons.length; n++) neurons[n].neighborCount = 0;

    for (var i = 0; i < neurons.length; i++) {
      for (var j = i + 1; j < neurons.length; j++) {
        var d = dist(neurons[i].x, neurons[i].y, neurons[j].x, neurons[j].y);
        if (d < CONNECTION_RADIUS) {
          connections.push({ from: i, to: j, length: d });
          neurons[i].neighborCount++;
          neurons[j].neighborCount++;
        }
      }
    }
  }

  // ─── Fire a Neuron ───────────────────────────────────────────────

  function fireNeuron(idx) {
    var n = neurons[idx];
    n.potential = 0;
    n.cooldown = REFRACTORY_FRAMES;
    n.fireFlash = 1.0;
    n.ringPulse = 1.0;

    // Send signals to connected neighbors
    for (var c = 0; c < connections.length; c++) {
      var conn = connections[c];
      var targetIdx = -1;

      if (conn.from === idx) targetIdx = conn.to;
      else if (conn.to === idx) targetIdx = conn.from;
      else continue;

      var target = neurons[targetIdx];
      if (target.cooldown > 0) continue;

      // Distance attenuation
      var attenuation = 1.0 - (conn.length / CONNECTION_RADIUS);
      attenuation = attenuation * attenuation; // Quadratic falloff — nearby neurons get much more

      signals.push({
        fromIdx: idx,
        toIdx: targetIdx,
        fromX: n.x,
        fromY: n.y,
        toX: target.x,
        toY: target.y,
        progress: 0,
        totalDist: conn.length,
        weight: SIGNAL_WEIGHT * (0.5 + attenuation * 0.5),
        x: n.x,
        y: n.y
      });
    }
  }

  // ─── Main Loop ───────────────────────────────────────────────────

  function animate() {
    requestAnimationFrame(animate);

    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, width, height);

    var i, n, s, c;

    // --- 1. Spontaneous activity ---
    for (i = 0; i < neurons.length; i++) {
      n = neurons[i];
      if (n.cooldown === 0 && n.potential < 0.4) {
        if (Math.random() < SPONTANEOUS_RATE) {
          n.potential += 0.25 + Math.random() * 0.2;
        }
      }
    }

    // Spontaneous burst fires — pick a random neuron and fire it
    if (Math.random() < BURST_RATE) {
      var pick = Math.floor(Math.random() * neurons.length);
      if (neurons[pick].cooldown === 0) {
        neurons[pick].potential = FIRE_THRESHOLD + 0.1;
      }
    }

    // --- 2. Update traveling signals ---
    for (s = signals.length - 1; s >= 0; s--) {
      var sig = signals[s];
      sig.progress += SIGNAL_SPEED / sig.totalDist;

      if (sig.progress >= 1.0) {
        // Deliver charge
        var target = neurons[sig.toIdx];
        if (target.cooldown === 0) {
          target.potential += sig.weight;
        }
        signals.splice(s, 1);
      } else {
        sig.x = lerp(sig.fromX, sig.toX, sig.progress);
        sig.y = lerp(sig.fromY, sig.toY, sig.progress);
      }
    }

    // --- 3. Update neurons ---
    for (i = 0; i < neurons.length; i++) {
      n = neurons[i];

      // Gentle drift
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < 15 || n.x > width - 15) n.vx *= -1;
      if (n.y < 15 || n.y > height - 15) n.vy *= -1;

      if (n.cooldown > 0) {
        n.cooldown--;
        n.potential = 0;
      } else {
        n.potential *= CHARGE_DECAY;
        if (n.potential < 0.001) n.potential = 0;

        if (n.potential >= FIRE_THRESHOLD) {
          fireNeuron(i);
        }
      }

      // Flash decay — slower for a more lingering glow
      if (n.fireFlash > 0) {
        n.fireFlash *= 0.96;
        if (n.fireFlash < 0.01) n.fireFlash = 0;
      }

      // Ring pulse expansion + decay — slower expansion
      if (n.ringPulse > 0) {
        n.ringPulse *= 0.97;
        if (n.ringPulse < 0.02) n.ringPulse = 0;
      }
    }

    // Periodically rebuild connections (neurons drift)
    if (Math.random() < 0.02) buildConnections();

    // --- 4. Draw connections (axons) ---
    ctx.lineCap = 'round';
    for (c = 0; c < connections.length; c++) {
      var conn = connections[c];
      var nA = neurons[conn.from];
      var nB = neurons[conn.to];

      var distFactor = 1.0 - (conn.length / CONNECTION_RADIUS);
      var maxAct = Math.max(
        nA.potential, nB.potential,
        nA.fireFlash * 0.8, nB.fireFlash * 0.8
      );
      maxAct = clamp01(maxAct);

      // Quiet connections: visible but subtle. Active: warm and brighter.
      var alpha = lerp(distFactor * 0.18, distFactor * 0.65, maxAct);
      var lineColor = maxAct > 0.08
        ? lerpColor(AXON_QUIET, AXON_ACTIVE, maxAct)
        : AXON_QUIET;
      var lw = CONNECTION_LINE_WIDTH + maxAct * 1.5;

      ctx.beginPath();
      ctx.moveTo(nA.x, nA.y);
      ctx.lineTo(nB.x, nB.y);
      ctx.strokeStyle = rgba(lineColor, alpha);
      ctx.lineWidth = lw;
      ctx.stroke();
    }

    // --- 5. Draw signal pulses (radial gradient + comet trail) ---
    for (s = 0; s < signals.length; s++) {
      var sig = signals[s];
      var pulseIntensity = Math.sin(sig.progress * Math.PI);
      var pAlpha = 0.4 + pulseIntensity * 0.5;

      // Direction vector (for comet tail)
      var dx = sig.toX - sig.fromX;
      var dy = sig.toY - sig.fromY;
      var mag = Math.sqrt(dx * dx + dy * dy) || 1;
      var ux = dx / mag;  // unit direction toward target
      var uy = dy / mag;

      // Comet tail — 3 fading trail dots behind the pulse
      for (var t = 1; t <= 3; t++) {
        var tx = sig.x - ux * t * 4;
        var ty = sig.y - uy * t * 4;
        var tAlpha = pAlpha * (0.3 / t);
        ctx.beginPath();
        ctx.arc(tx, ty, 2.0 - t * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = rgba(SIGNAL, tAlpha);
        ctx.fill();
      }

      // Radial gradient glow — distinguishes pulse from solid neuron circles
      var grad = ctx.createRadialGradient(sig.x, sig.y, 0, sig.x, sig.y, 8);
      grad.addColorStop(0, rgba(FLASH_CORE, pAlpha * 0.9));
      grad.addColorStop(0.3, rgba(SIGNAL, pAlpha * 0.6));
      grad.addColorStop(1, rgba(SIGNAL, 0));

      ctx.beginPath();
      ctx.arc(sig.x, sig.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // --- 6. Draw neurons ---
    for (i = 0; i < neurons.length; i++) {
      n = neurons[i];

      var charge = clamp01(n.potential / FIRE_THRESHOLD);
      var flash = n.fireFlash;
      var active = charge > 0.04 || flash > 0.04;

      // Color: grey → amber → gold
      var bodyColor;
      if (flash > 0.08) {
        bodyColor = lerpColor(CHARGING, FIRE, flash);
      } else if (charge > 0.04) {
        bodyColor = lerpColor(QUIET, CHARGING, charge);
      } else {
        bodyColor = QUIET;
      }

      var bodyAlpha = 0.35 + 0.35 * charge + 0.3 * flash;
      var drawRadius = n.radius + charge * 2.5 + flash * 3.5;

      // Expanding ring pulse on fire
      if (n.ringPulse > 0.05) {
        var ringRadius = n.radius + (1.0 - n.ringPulse) * 25;
        ctx.beginPath();
        ctx.arc(n.x, n.y, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(FIRE, n.ringPulse * 0.3);
        ctx.lineWidth = 1.5 * n.ringPulse;
        ctx.stroke();
      }

      // Outer glow halo for active neurons
      if (active) {
        var glowR = drawRadius + 5 + flash * 14;
        var glowA = charge * 0.06 + flash * 0.15;
        ctx.beginPath();
        ctx.arc(n.x, n.y, glowR, 0, Math.PI * 2);
        ctx.fillStyle = rgba(flash > 0.08 ? FIRE : CHARGING, glowA);
        ctx.fill();
      }

      // Neuron body
      ctx.beginPath();
      ctx.arc(n.x, n.y, drawRadius, 0, Math.PI * 2);
      ctx.fillStyle = rgba(bodyColor, bodyAlpha);
      ctx.fill();

      // Hot core for firing
      if (flash > 0.15) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, drawRadius * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = rgba(FLASH_CORE, flash * 0.55);
        ctx.fill();
      }
    }
  }

  // ─── Bootstrap ───────────────────────────────────────────────────

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})();
