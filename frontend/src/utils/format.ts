export function formatCurrency(
  amount?: number | null,
  currencyCode = 'INR'
): string {
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return '0.00';
  }

  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currencyCode || 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(amount));
  } catch {
    return `${currencyCode || 'INR'} ${Number(amount).toFixed(2)}`;
  }
}

export function formatDate(dateString?: string | null): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatTime(timeString?: string | null): string {
  if (!timeString) return '—';
  if (timeString.includes('T')) {
    try {
      const d = new Date(timeString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return timeString;
    }
  }
  return timeString.slice(0, 5);
}
