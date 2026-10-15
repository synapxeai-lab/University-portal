// startDate/endDate come from a date-only picker and are stored at midnight
// of the chosen day, so a registration ending "on" a date should still count
// as open through the end of that day, not expire at its very first instant.
function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

// A registration is ACTIVE while `now` is within [startDate, endOfDay(endDate)],
// UPCOMING before it starts, and CLOSED once that day has fully passed.
function withRegistrationStatus(registration) {
  if (!registration) return registration;
  const now = new Date();
  const endInclusive = endOfDay(registration.endDate);
  let status = 'UPCOMING';
  if (now >= registration.startDate && now <= endInclusive) status = 'ACTIVE';
  else if (now > endInclusive) status = 'CLOSED';
  return { ...registration, status };
}

module.exports = { withRegistrationStatus, startOfDay, endOfDay };
