export const getPublicOrigin = () => {
  return import.meta.env.VITE_PUBLIC_ORIGIN?.replace(/\/+$/, '')
    || (typeof window === 'undefined' ? '' : window.location.origin);
};
