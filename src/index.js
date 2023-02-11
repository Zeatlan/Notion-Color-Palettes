const { Client } = require("@notionhq/client")
require('dotenv').config();

const notion = new Client({
    auth: process.env.NOTION_API_KEY
});

const DATABASE_ID = process.env.NOTION_DATABASE_ID;

async function main() {
    try {
        const database = await notion.databases.retrieve({
            database_id: DATABASE_ID
        });

        console.log(`Notion database (${database.title[0].plain_text}) has been successfully initialized.`);
        searchForPalettes();
    }catch(error) {
        console.error(`Couldn't find notion database, please verify your NOTION_DATABASE_ID in the .env file.`);
    }
}

async function searchForPalettes() {
    const query = await notion.databases.query({
        database_id: DATABASE_ID,
        filter:  {
        and: [
          {
            property: 'Name',
            title: {
                starts_with: "{{"
            }
          },
          {
            property: 'Name',
            title: {
                ends_with: "}}"
            }
          },
        ]
      }
    });

    if(query.results.length > 0){
        console.log(query.results[0].properties.Name.title[0].plain_text);
    }
}

main();