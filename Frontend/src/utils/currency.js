const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export const formatInr = (value = 0) => {
  const amount = Number(value);
  return inrFormatter.format(Number.isFinite(amount) ? amount : 0);
};
