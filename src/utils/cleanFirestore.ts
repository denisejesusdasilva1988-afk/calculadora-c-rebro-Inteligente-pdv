/**
 * Safely removes `undefined` properties recursively from objects and arrays
 * because Firebase Firestore does not support `undefined` as a field value.
 */
export const cleanUndefinedForFirestore = (obj: any): any => {
  if (obj === undefined) {
    return null;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => cleanUndefinedForFirestore(item));
  }
  if (typeof obj === "object" && obj !== null) {
    const prototype = Object.getPrototypeOf(obj);
    const isPlain =
      prototype === null ||
      prototype === Object.prototype ||
      Object.getPrototypeOf(prototype) === null;
    if (isPlain) {
      const cleaned: any = {};
      for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (val !== undefined) {
          cleaned[key] = cleanUndefinedForFirestore(val);
        }
      }
      return cleaned;
    }
  }
  return obj;
};

/**
 * Safe setDoc wrapper that cleans undefined values and catches synchronous
 * or asynchronous validation errors to prevent crashes in React components.
 */
export const safeFirestoreSetDoc = async (
  setDocFn: any,
  docRef: any,
  data: any,
  options = { merge: true }
) => {
  try {
    const cleaned = cleanUndefinedForFirestore(data);
    await setDocFn(docRef, cleaned, options);
  } catch (err) {
    console.warn("Aviso ao persistir dados no Firestore:", err);
  }
};
