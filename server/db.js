const mysql = require("mysql2/promise");
const { Connector } = require('@google-cloud/cloud-sql-connector');

// Export an object with runSQL function
module.exports = {
    runSQL: async (sql, data) => {
        const connector = new Connector();
        const clientOpts = await connector.getOptions({
            instanceConnectionName: process.env.INSTANCE_CONNECTION_NAME,
            ipType: "PUBLIC", // or "PRIVATE" if you're using private IP
        });

        const pool = await mysql.createPool({
            ...clientOpts,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        });

        // Using pool.execute() directly instead of pool.getConnection()
        const [result] = await pool.execute(sql, data);

        return result;
    }
};