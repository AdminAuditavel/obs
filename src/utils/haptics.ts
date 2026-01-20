export const haptics = {
  // Light impact (for selection, toggles)
  impactLight: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
  },

  // Medium impact (for buttons, likes)
  impactMedium: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(40);
    }
  },

  // Heavy impact (for errors, destructive actions)
  impactHeavy: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(70);
    }
  },

  // Success pattern (double tick)
  success: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([30, 50, 30]);
    }
  },

  // Error pattern (triple rapid tick)
  error: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([50, 30, 50, 30, 50]);
    }
  }
};
