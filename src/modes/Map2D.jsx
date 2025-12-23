import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { ensureTags } from '../utils/tags';

const Map2D = forwardRef(({ bubbles, focusedBubble, onFocusBubble, isActive }, ref) => {
  const canvasRef = useRef(null);
  const mapStateRef = useRef(null);
  const mapFrameRef = useRef(null);

  useImperativeHandle(ref, () => ({
    refit: () => mapStateRef.current?.fit?.(),
  }));

  useEffect(() => {
    if (!isActive || !canvasRef.current) return undefined;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let dpr = window.devicePixelRatio || 1;

    const nodes = bubbles.map((bubble, index) => {
      const baseColor = new THREE.Color(bubble.color);
      return {
        id: bubble.id,
        title: bubble.title,
        note: bubble.note,
        tags: bubble.seedTags || ensureTags(bubble.note, bubble.title),
        color: baseColor.getStyle(),
        glow: baseColor.clone().offsetHSL(0, 0, 0.16).getStyle(),
        base: { x: bubble.position.x, y: bubble.position.z },
        drift: 0.25 + Math.random() * 0.2,
        offset: Math.random() * Math.PI * 2 + index * 0.3,
      };
    });

    const connectionPairs = (() => {
      const pairs = [];
      const seen = new Set();
      nodes.forEach((source) => {
        const meta = bubbles.find((candidate) => candidate.id === source.id);
        (meta?.connections || []).forEach((targetId) => {
          const key = [source.id, targetId].sort().join('->');
          if (seen.has(key)) return;
          seen.add(key);
          pairs.push([source.id, targetId]);
        });
      });
      return pairs;
    })();

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
    const state = {
      translate: { x: 0, y: 0 },
      scale: 1,
      minScale: 8,
      maxScale: 64,
      pointers: new Map(),
      tapStart: null,
      tapMoved: false,
      pinchStart: null,
    };
    mapStateRef.current = state;

    const worldToScreen = (point) => ({
      x: point.x * state.scale + state.translate.x,
      y: point.y * state.scale + state.translate.y,
    });

    const screenToWorld = (point) => ({
      x: (point.x - state.translate.x) / state.scale,
      y: (point.y - state.translate.y) / state.scale,
    });

    const fitToNodes = () => {
      const rect = canvas.getBoundingClientRect();
      const minX = Math.min(...nodes.map((node) => node.base.x));
      const maxX = Math.max(...nodes.map((node) => node.base.x));
      const minY = Math.min(...nodes.map((node) => node.base.y));
      const maxY = Math.max(...nodes.map((node) => node.base.y));
      const rangeX = Math.max(maxX - minX, 1);
      const rangeY = Math.max(maxY - minY, 1);
      const baseScale = Math.min(rect.width / rangeX, rect.height / rangeY) * 0.42;
      state.scale = clamp(baseScale, 10, 46);
      state.minScale = state.scale * 0.6;
      state.maxScale = state.scale * 2.6;
      const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
      state.translate.x = rect.width / 2 - center.x * state.scale;
      state.translate.y = rect.height / 2 - center.y * state.scale;
    };

    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fitToNodes();
    };

    const getRelativePointer = (event) => {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    const handleTap = (point) => {
      const { x, y } = point;
      let closest = null;
      let minDist = Infinity;
      nodes.forEach((node) => {
        const time = performance.now() / 1000;
        const current = {
          x: node.base.x + Math.sin(time * 0.7 + node.offset) * node.drift,
          y: node.base.y + Math.cos(time * 0.8 + node.offset) * node.drift,
        };
        const screen = worldToScreen(current);
        const dist = Math.hypot(screen.x - x, screen.y - y);
        if (dist < minDist) {
          minDist = dist;
          closest = node;
        }
      });

      if (closest && minDist < 28) {
        const meta = bubbles.find((bubble) => bubble.id === closest.id);
        if (meta) onFocusBubble(meta);
      }
    };

    const handlePointerDown = (event) => {
      canvas.setPointerCapture(event.pointerId);
      const point = getRelativePointer(event);
      state.pointers.set(event.pointerId, point);
      state.tapStart = point;
      state.tapMoved = false;
      if (state.pointers.size === 1) {
        state.pinchStart = null;
      } else if (state.pointers.size === 2) {
        const [a, b] = Array.from(state.pointers.values());
        state.pinchStart = {
          distance: Math.hypot(a.x - b.x, a.y - b.y),
          scale: state.scale,
        };
      }
    };

    const handlePointerMove = (event) => {
      if (!state.pointers.has(event.pointerId)) return;
      const prevPoint = state.pointers.get(event.pointerId);
      const point = getRelativePointer(event);
      state.pointers.set(event.pointerId, point);

      if (state.pointers.size === 1 && prevPoint) {
        const dx = point.x - prevPoint.x;
        const dy = point.y - prevPoint.y;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) state.tapMoved = true;
        state.translate.x += dx;
        state.translate.y += dy;
      } else if (state.pointers.size === 2 && state.pinchStart) {
        const [a, b] = Array.from(state.pointers.values());
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const worldCenter = screenToWorld(center);
        const nextScale = clamp(
          state.pinchStart.scale * (distance / (state.pinchStart.distance || 1)),
          state.minScale,
          state.maxScale,
        );
        state.scale = nextScale;
        state.translate.x = center.x - worldCenter.x * state.scale;
        state.translate.y = center.y - worldCenter.y * state.scale;
      }
    };

    const handlePointerUp = (event) => {
      if (!state.pointers.has(event.pointerId)) return;
      const point = getRelativePointer(event);
      const wasTap = !state.tapMoved && state.pointers.size === 1;
      state.pointers.delete(event.pointerId);
      if (state.pointers.size < 2) state.pinchStart = null;
      if (wasTap && state.tapStart) handleTap(point);
      state.tapStart = null;
    };

    const handleWheel = (event) => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const cursor = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const worldPos = screenToWorld(cursor);
      const delta = -event.deltaY * 0.001;
      const nextScale = clamp(state.scale * (1 + delta), state.minScale, state.maxScale);
      state.scale = nextScale;
      state.translate.x = cursor.x - worldPos.x * state.scale;
      state.translate.y = cursor.y - worldPos.y * state.scale;
    };

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      const gradient = ctx.createRadialGradient(
        rect.width * 0.3,
        rect.height * 0.3,
        80,
        rect.width / 2,
        rect.height / 2,
        rect.width * 0.8,
      );
      gradient.addColorStop(0, 'rgba(8, 14, 28, 0.96)');
      gradient.addColorStop(1, 'rgba(2, 6, 16, 0.96)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, rect.width, rect.height);

      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      const gridStep = 80;
      const startX = ((-state.translate.x / state.scale) % gridStep) * state.scale + state.translate.x;
      const startY = ((-state.translate.y / state.scale) % gridStep) * state.scale + state.translate.y;
      for (let x = startX; x < rect.width; x += gridStep) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, rect.height);
        ctx.stroke();
      }
      for (let y = startY; y < rect.height; y += gridStep) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(rect.width, y);
        ctx.stroke();
      }
      ctx.restore();

      const time = performance.now() / 1000;
      const animatedPositions = nodes.reduce((acc, node) => {
        const pos = {
          x: node.base.x + Math.sin(time * 0.6 + node.offset) * node.drift,
          y: node.base.y + Math.cos(time * 0.65 + node.offset * 1.2) * node.drift,
        };
        acc[node.id] = pos;
        return acc;
      }, {});

      ctx.lineWidth = 1.4;
      connectionPairs.forEach(([from, to]) => {
        const source = animatedPositions[from];
        const target = animatedPositions[to];
        if (!source || !target) return;
        const start = worldToScreen(source);
        const end = worldToScreen(target);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      });

      nodes.forEach((node) => {
        const pos = animatedPositions[node.id];
        const screen = worldToScreen(pos);
        const radius = focusedBubble?.id === node.id ? 15 : 11;
        const glow = ctx.createRadialGradient(screen.x, screen.y, 4, screen.x, screen.y, radius * 1.9);
        glow.addColorStop(0, node.glow);
        glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, radius * 1.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        ctx.font = '14px "Inter", sans-serif';
        ctx.fillStyle = '#f5fbff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(node.title, screen.x, screen.y + radius + 6);
        ctx.fillStyle = 'rgba(232, 247, 255, 0.7)';
        const tagsPreview = (node.tags || []).slice(0, 2).join(' · ');
        ctx.fillText(tagsPreview, screen.x, screen.y + radius + 22);
      });

      mapFrameRef.current = requestAnimationFrame(render);
    };

    state.fit = fitToNodes;
    mapStateRef.current.fit = fitToNodes;
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(canvas);
    window.addEventListener('resize', updateSize);
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerUp);
    canvas.addEventListener('pointerleave', handlePointerUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    updateSize();
    render();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateSize);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointercancel', handlePointerUp);
      canvas.removeEventListener('pointerleave', handlePointerUp);
      canvas.removeEventListener('wheel', handleWheel);
      if (mapFrameRef.current) cancelAnimationFrame(mapFrameRef.current);
      mapFrameRef.current = null;
      mapStateRef.current = null;
    };
  }, [bubbles, focusedBubble, isActive, onFocusBubble]);

  return (
    <div className="map-viewport" aria-label="Carte 2D du réseau">
      <div className="map-hint">
        <span className="chip subtle">Tactile</span>
        <p className="muted">Glisser pour explorer, pincer ou faire défiler pour zoomer. Touchez une bulle pour entrer.</p>
      </div>
      <canvas ref={canvasRef} className="map-canvas" />
    </div>
  );
});

Map2D.displayName = 'Map2D';

export default Map2D;
