// Test script to verify timer functionality logic
console.log("Testing Timer Functionality\n");
console.log("=" .repeat(50));

// Simulate useElapsedTime hook logic
function calculateElapsed(startTime) {
  if (!startTime) {
    return 0;
  }
  
  const start = new Date(startTime).getTime();
  const now = Date.now();
  const elapsedSeconds = Math.floor((now - start) / 1000);
  return elapsedSeconds;
}

// Format elapsed time for display
function formatElapsed(seconds) {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

// Test cases
console.log("\n1. Test with null startTime:");
const elapsed1 = calculateElapsed(null);
console.log(`   Result: ${elapsed1} seconds`);
console.log(`   Expected: 0 seconds`);
console.log(`   ✓ ${elapsed1 === 0 ? 'PASS' : 'FAIL'}`);

console.log("\n2. Test with startTime 30 seconds ago:");
const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
const elapsed2 = calculateElapsed(thirtySecondsAgo);
console.log(`   Start time: ${thirtySecondsAgo}`);
console.log(`   Result: ${elapsed2} seconds`);
console.log(`   Formatted: ${formatElapsed(elapsed2)}`);
console.log(`   Expected: ~30 seconds`);
console.log(`   ✓ ${Math.abs(elapsed2 - 30) <= 1 ? 'PASS' : 'FAIL'}`);

console.log("\n3. Test with startTime 90 seconds ago:");
const ninetySecondsAgo = new Date(Date.now() - 90000).toISOString();
const elapsed3 = calculateElapsed(ninetySecondsAgo);
console.log(`   Start time: ${ninetySecondsAgo}`);
console.log(`   Result: ${elapsed3} seconds`);
console.log(`   Formatted: ${formatElapsed(elapsed3)}`);
console.log(`   Expected: ~90 seconds (1m 30s)`);
console.log(`   ✓ ${Math.abs(elapsed3 - 90) <= 1 ? 'PASS' : 'FAIL'}`);

console.log("\n4. Test with startTime 5 minutes ago:");
const fiveMinutesAgo = new Date(Date.now() - 300000).toISOString();
const elapsed4 = calculateElapsed(fiveMinutesAgo);
console.log(`   Start time: ${fiveMinutesAgo}`);
console.log(`   Result: ${elapsed4} seconds`);
console.log(`   Formatted: ${formatElapsed(elapsed4)}`);
console.log(`   Expected: ~300 seconds (5m 0s)`);
console.log(`   ✓ ${Math.abs(elapsed4 - 300) <= 1 ? 'PASS' : 'FAIL'}`);

console.log("\n" + "=".repeat(50));
console.log("\nISSUE IDENTIFIED:");
console.log("The useElapsedTime hook returns raw seconds (number),");
console.log("but the KanbanCard component displays it directly.");
console.log("The hook should return a formatted string like '1m 30s'.");

console.log("\nRECOMMENDATION:");
console.log("Update useElapsedTime.js to return formatted time string");
console.log("instead of raw seconds for better user experience.");
console.log("=" .repeat(50));
