const { Client } = require("@notionhq/client")
require('dotenv').config();

const notion = new Client({
    auth: process.env.NOTION_API_KEY
});

async function main() {
    const databaseId = process.env.NOTION_DATABASE_ID;
    const database = await notion.databases.retrieve({
        database_id: databaseId
    });

    console.log(`Notion database (${database.title[0].plain_text}) has been successfully initialized.`);
}

main();