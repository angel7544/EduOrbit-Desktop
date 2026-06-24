export const formatPrice = (price: number) => {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "INR",
    }).format(price);
  } catch (e) {
    return `₹${price}`;
  }
};
export const formatWatchTime = (seconds: number | undefined | null) => {
    if (!seconds || isNaN(seconds) || seconds <= 0) return '0m';
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
};
