/**
 * Feature flags — toggle functionalities on/off without deleting code.
 * Set a flag to `false` to disable the feature, `true` to enable it.
 */
export const FEATURE_FLAGS = {
  /**
   * Mobile editor: when true, the simple editor (preview + form fields) is
   * shown first and the user taps a button to switch to the canvas editor.
   * When false, the canvas editor is shown directly on mobile.
   */
  MOBILE_SIMPLE_EDITOR: false,
} as const;
