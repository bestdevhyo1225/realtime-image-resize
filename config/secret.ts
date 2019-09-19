import dotenv from 'dotenv';
import fs from 'fs';

if (fs.readFileSync('.env')) {
    dotenv.config({ path : '.env' });
}

const MY_ACCOUNT_NUMBER = process.env.MY_ACCOUNT_NUMBER as string;

export default { MY_ACCOUNT_NUMBER }