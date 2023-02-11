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

// INFO Search for palettes
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
        for(page of query.results) {
            handleNotionPage(page);
        }
    }
}

// INFO Update the notion page (Name and parameters)
async function handleNotionPage(page) {
    const initialPageName = page.properties.Name.title[0].plain_text;

    // Get array of colors and name
    // {{ Moss | #fff | #000 | #AAA | #BBB }} => [ 'Moss', '#fff', '#000', '#AAA', '#BBB' ]
    let colors = initialPageName.replace("{{", "").replace("}}", "").split('|');
    colors = colors.map(el => el.trim());

    const pageName = colors[0]; // The first index is always the name of the palette
    colors.shift();

    try {
        await notion.pages.update({
            page_id: page.id,
            properties: {
                Name: {
                    title: [
                        {
                            text: {
                                content: pageName
                            }
                        }
                    ]
                }
            }
        });
    }catch(error){
        console.error(`An error occurred while trying to update the page. The id page was : ${page.id}.`);
    }
}

main();