/**
 * Generate a UUID v4
 */
export const generateUUID = (): string => {
  return crypto.randomUUID();
};

/**
 * Generate a unique order ID (alias for generateUUID)
 */
export const generateOrderId = (): string => {
  return crypto.randomUUID();
};
