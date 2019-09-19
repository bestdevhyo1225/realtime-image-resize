import dotenv from 'dotenv';
import fs from 'fs';

if (fs.existsSync('.env')) {
    dotenv.config({ path : '.env' });
}

export const secret = () => ({
    EDGE_LAMBDA_ROLE_ARN : process.env.EDGE_LAMBDA_ROLE_ARN as string,
    REGION : process.env.REGION as string
});