const { Client } = require("@notionhq/client")
require('dotenv').config();

const notion = new Client({
    auth: process.env.NOTION_API_KEY
});

const DATABASE_ID = process.env.NOTION_DATABASE_ID;
const MAX_LENGTH_PAGE = 42;

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
    // {{ Moss | #006270 | #009394 | #00E0C7 | #FFF }} => [ 'Moss', '#006270', '#009394', '#00E0C7', '#FFF' ]
    let colors = initialPageName.replace("{{", "").replace("}}", "").split('|');
    colors = colors.map(el => el.trim());

    const pageName = colors[0]; // The first index is always the name of the palette
    colors.shift();

    try {
        const updatedPage = await notion.pages.update({
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

        generatePalette(updatedPage, colors, pageName);
    }catch(error){
        console.error(`An error occurred while trying to update the page. The id page was : ${page.id}.`);
    }
}

async function generatePalette(page, colors, pageName) {

    const colorBlocks = generatePrompt('noText', colors, pageName);
    const promptBcolor = generatePrompt('back', colors, pageName);
    const promptFcolor = generatePrompt('front', colors, pageName);

    await notion.blocks.children.append({
        block_id: page.id,
        children: [
            {
                object: 'block',
                type: 'paragraph',
                paragraph: {
                    rich_text: [
                        {
                            equation: { expression: colorBlocks },
                        }
                    ],
                },
            },
            {
                object: 'block',
                type: 'paragraph',
                paragraph: {
                    rich_text: [
                        {
                            equation: { expression: promptBcolor },
                        }
                    ],
                },
            },
            {
                object: 'block',
                type: 'paragraph',
                paragraph: {
                    rich_text: [
                        {
                            equation: { expression: promptFcolor },
                        }
                    ],
                },
            },
        ],
    });

    console.log(`✅ Palette [${pageName}] has been generated.`);
} 

function generatePrompt(usecase, colors, pageName) {
    let prompt = "";
    if(usecase !== 'noText') prompt += "\\begin{array}{c}\\vcenter{";
    prompt += "\\huge";

    for(let i = 0; i < colors.length; i++) {
        let nextColor = colors[i + 1];

        
        if(nextColor === undefined) nextColor = colors[0];

        if(usecase === 'front') prompt += `\\color{${colors[i]}}{${pageName}}`;

        if(usecase === 'back') prompt += `\\fcolorbox{${colors[i]}}{${colors[i]}}{\\color{${nextColor}}{${pageName}}}`;

        if(usecase === 'noText') 
        {
            let customName = pageName;
            for(let j = 0; j < (MAX_LENGTH_PAGE - pageName.length); j++) {
                customName += "a";
            }
            prompt += `\\fcolorbox{${colors[i]}}{${colors[i]}}{\\color{${colors[i]}}{${customName}}}\\\\`;
        }


        if(nextColor !== undefined && usecase !== "noText") prompt += `\\thickspace`;
    }
    
    if(usecase !== 'noText') prompt += "}\\end{array}";

    return prompt;
}

main();