import { AlertTriangle } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { getDefinition } from '../data/components';

export default function PinMapper() {
  const { project } = useProject();
  const board = project.board;

  if (!board) return null;

  const leftPins = board.pins.filter((p) => p.side === 'left');
  const rightPins = board.pins.filter((p) => p.side === 'right');
  const maxRows = Math.max(leftPins.length, rightPins.length);

  // Build pin → component mapping (detect conflicts)
  const pinAssignments = new Map<number, { componentName: string; role: string; color: string }[]>();
  const typeColors: Record<string, string> = {
    sensor: '#3fb950',
    binary_sensor: '#58a6ff',
    switch: '#f0883e',
    light: '#d2a8ff',
    output: '#f85149',
    display: '#79c0ff',
    bluetooth: '#1f6feb',
    ir: '#da3633',
    climate: '#56d364',
    media: '#bc8cff',
    fan: '#f778ba',
    cover: '#d29922',
    button: '#a5d6ff',
    number: '#7ee787',
    select: '#e3b341',
    lock: '#f97583',
    text: '#c9d1d9',
    misc: '#8b949e',
  };

  for (const inst of project.components) {
    const def = getDefinition(inst.type);
    if (!def) continue;
    for (const [role, gpio] of Object.entries(inst.pins)) {
      if (gpio == null) continue;
      const pinDef = def.pins.find((p) => p.role === role);
      if (!pinAssignments.has(gpio)) pinAssignments.set(gpio, []);
      pinAssignments.get(gpio)!.push({
        componentName: (inst.config.name as string) || inst.name,
        role: pinDef?.label || role,
        color: typeColors[def.category] || '#8b949e',
      });
    }
  }

  // Conflict set
  const conflictPins = new Set<number>();
  for (const [gpio, users] of pinAssignments) {
    if (users.length > 1) conflictPins.add(gpio);
  }

  // SVG dimensions
  const pinSpacing = 36;
  const boardWidth = 200;
  const svgWidth = 680;
  const pinLabelWidth = 180;
  const svgHeight = maxRows * pinSpacing + 80;
  const boardX = (svgWidth - boardWidth) / 2;
  const boardY = 30;
  const boardHeight = maxRows * pinSpacing + 20;

  return (
    <div className="pin-mapper">
      <h2>Pin Map — {board.name}</h2>
      <p className="pin-mapper-hint">
        Assigned pins are highlighted. Configure pin assignments in the Components tab.
      </p>

      {conflictPins.size > 0 && (
        <div className="pin-conflict-banner">
          <AlertTriangle size={15} /> Pin conflict{conflictPins.size > 1 ? 's' : ''} detected on GPIO{[...conflictPins].join(', GPIO')} — multiple components share the same pin.
        </div>
      )}

      <div className="pin-mapper-svg-container">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          width="100%"
          style={{ maxWidth: svgWidth }}
        >
          {/* Board body */}
          <rect
            x={boardX}
            y={boardY}
            width={boardWidth}
            height={boardHeight}
            rx="8"
            fill="#161b22"
            stroke="#30363d"
            strokeWidth="2"
          />

          {/* USB connector */}
          <rect
            x={boardX + boardWidth / 2 - 20}
            y={boardY + boardHeight - 5}
            width="40"
            height="16"
            rx="3"
            fill="#21262d"
            stroke="#484f58"
            strokeWidth="1"
          />
          <text
            x={boardX + boardWidth / 2}
            y={boardY + boardHeight + 7}
            textAnchor="middle"
            fill="#8b949e"
            fontSize="7"
            fontFamily="monospace"
          >
            USB
          </text>

          {/* Chip label */}
          <rect
            x={boardX + boardWidth / 2 - 35}
            y={boardY + boardHeight / 2 - 18}
            width="70"
            height="36"
            rx="3"
            fill="#21262d"
            stroke="#30363d"
            strokeWidth="1"
          />
          <text
            x={boardX + boardWidth / 2}
            y={boardY + boardHeight / 2 - 2}
            textAnchor="middle"
            fill="#58a6ff"
            fontSize="11"
            fontFamily="monospace"
            fontWeight="bold"
          >
            {board.platform.toUpperCase()}
          </text>
          <text
            x={boardX + boardWidth / 2}
            y={boardY + boardHeight / 2 + 12}
            textAnchor="middle"
            fill="#8b949e"
            fontSize="8"
            fontFamily="monospace"
          >
            {board.board}
          </text>

          {/* Left pins */}
          {leftPins.map((pin, i) => {
            const y = boardY + 20 + i * pinSpacing;
            const assignments = pinAssignments.get(pin.gpio);
            const assigned = assignments?.[0];
            const isConflict = conflictPins.has(pin.gpio);
            const pinColor = isConflict ? '#f85149' : assigned ? assigned.color : '#484f58';

            return (
              <g key={`l-${pin.gpio}`}>
                {/* Pin line */}
                <line x1={boardX} y1={y} x2={boardX - 15} y2={y} stroke={pinColor} strokeWidth={isConflict ? 3 : 2} />
                {/* Pin dot */}
                <circle cx={boardX - 15} cy={y} r="4" fill={pinColor} />
                {isConflict && <circle cx={boardX - 15} cy={y} r="7" fill="none" stroke="#f85149" strokeWidth="2" strokeDasharray="3,2" />}
                {/* GPIO label */}
                <text
                  x={boardX - 22}
                  y={y + 4}
                  textAnchor="end"
                  fill={isConflict ? '#f85149' : 'var(--text-primary)'}
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight={isConflict ? 'bold' : 'normal'}
                >
                  GPIO{pin.gpio}
                </text>
                {/* Pin name */}
                <text
                  x={boardX - 65}
                  y={y + 4}
                  textAnchor="end"
                  fill="var(--text-secondary)"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {pin.label}
                </text>
                {/* Assignment label */}
                {assigned && (
                  <>
                    <rect
                      x={boardX - pinLabelWidth - 80}
                      y={y - 10}
                      width={pinLabelWidth - 40}
                      height="20"
                      rx="3"
                      fill={pinColor}
                      opacity="0.15"
                    />
                    <text
                      x={boardX - pinLabelWidth - 80 + 6}
                      y={y + 4}
                      fill={pinColor}
                      fontSize="9"
                      fontFamily="sans-serif"
                    >
                      {isConflict ? `⚠ ${assignments!.map(a => a.componentName).join(', ')}` : assigned.componentName}
                    </text>
                  </>
                )}
              </g>
            );
          })}

          {/* Right pins */}
          {rightPins.map((pin, i) => {
            const y = boardY + 20 + i * pinSpacing;
            const assignments = pinAssignments.get(pin.gpio);
            const assigned = assignments?.[0];
            const isConflict = conflictPins.has(pin.gpio);
            const pinColor = isConflict ? '#f85149' : assigned ? assigned.color : '#484f58';

            return (
              <g key={`r-${pin.gpio}`}>
                <line x1={boardX + boardWidth} y1={y} x2={boardX + boardWidth + 15} y2={y} stroke={pinColor} strokeWidth={isConflict ? 3 : 2} />
                <circle cx={boardX + boardWidth + 15} cy={y} r="4" fill={pinColor} />
                {isConflict && <circle cx={boardX + boardWidth + 15} cy={y} r="7" fill="none" stroke="#f85149" strokeWidth="2" strokeDasharray="3,2" />}
                <text
                  x={boardX + boardWidth + 22}
                  y={y + 4}
                  textAnchor="start"
                  fill={isConflict ? '#f85149' : 'var(--text-primary)'}
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight={isConflict ? 'bold' : 'normal'}
                >
                  GPIO{pin.gpio}
                </text>
                <text
                  x={boardX + boardWidth + 65}
                  y={y + 4}
                  textAnchor="start"
                  fill="var(--text-secondary)"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {pin.label}
                </text>
                {assigned && (
                  <>
                    <rect
                      x={boardX + boardWidth + pinLabelWidth - 30}
                      y={y - 10}
                      width={pinLabelWidth - 40}
                      height="20"
                      rx="3"
                      fill={pinColor}
                      opacity="0.15"
                    />
                    <text
                      x={boardX + boardWidth + pinLabelWidth - 30 + 6}
                      y={y + 4}
                      fill={pinColor}
                      fontSize="9"
                      fontFamily="sans-serif"
                    >
                      {isConflict ? `⚠ ${assignments!.map(a => a.componentName).join(', ')}` : assigned.componentName}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="pin-mapper-legend">
        {Object.entries(typeColors).map(([cat, color]) => (
          <span key={cat} className="legend-item">
            <span className="legend-dot" style={{ background: color }} />
            {cat.replace('_', ' ')}
          </span>
        ))}
      </div>
    </div>
  );
}
