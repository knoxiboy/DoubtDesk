const { neon } = require('@neondatabase/serverless');

try {
    neon('postgres://dummy:dummy@localhost/dummy');
    console.log("SUCCESS for postgres://dummy:dummy@localhost/dummy");
} catch (e) {
    console.error("FAILED", e.message);
}

try {
    neon('postgres://user:password@host.region.aws.neon.tech/dbname?sslmode=require');
    console.log("SUCCESS for postgres://user:password@host.region.aws.neon.tech/dbname?sslmode=require");
} catch (e) {
    console.error("FAILED", e.message);
}
