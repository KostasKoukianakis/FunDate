/**
 * Φως: πάνω-δεξιά οθόνης → κέντρο οθόνης (όχι παντού).
 * Συντεταγμένες normalized [0–1] του viewport.
 */
export const LIGHT_WINDOW = { x: 0.93, y: 0.03 };

/** Κέντρο οθόνης — όπου «χτυπάει» η δέσμη στο γραφείο */
export const LIGHT_DESK_FOCAL = { x: 0.5, y: 0.5 };

export function pct(nx: number) {
  return `${Math.round(nx * 1000) / 10}%`;
}

export function beamMidpoint() {
  return {
    x: (LIGHT_WINDOW.x + LIGHT_DESK_FOCAL.x) / 2,
    y: (LIGHT_WINDOW.y + LIGHT_DESK_FOCAL.y) / 2,
  };
}

/**
 * Μάσκα όγκου δέσμης: φως μόνο στο διάδρομο πάνω-δεξιά → κέντρο οθόνης.
 */
export function lightBeamVolumeMask(): string {
  const mid = beamMidpoint();
  /* Λίγο φαρδύτερη ellipse ώστε λεπτές δέσμες να μη «σβήνουν» στα άκρα της μάσκας */
  return `radial-gradient(ellipse 52% 96% at ${pct(mid.x)} ${pct(mid.y)}, black 0%, black 40%, transparent 74%)`;
}
