const { neon } = require('@neondatabase/serverless');

try {
    neon('postgresql://placeholder');
    console.log("SUCCESS for postgresql://placeholder");
} catch (e) {
    console.error("FAILED for postgresql://placeholder", e.message);
}
try {
    neon('postgres://placeholder');
    console.log("SUCCESS for postgres://placeholder");
} catch (e) {
    console.error("FAILED for postgres://placeholder", e.message);
}
