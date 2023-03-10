const { Client } = require("@notionhq/client")
require('dotenv').config();

const notion = new Client({
    auth: process.env.NOTION_API_KEY
});

const DATABASE_ID = process.env.NOTION_DATABASE_ID;
const MAX_LENGTH_PAGE = 42;
const memoName = {};

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
    let isCorrectFormat = true;
    const initialPageName = page.properties.Name.title[0].plain_text;

    // Get array of colors and name
    // {{ Moss | #006270 | #009394 | #00E0C7 | #FFF }} => [ 'Moss', '#006270', '#009394', '#00E0C7', '#FFF' ]
    let colors = initialPageName.replace("{{", "").replace("}}", "").split('|');
    colors = colors.map(el => el.trim());

    const pageName = colors[0]; // The first index is always the name of the palette
    memoName[pageName] = initialPageName; // Keep in memory (In case of error)
    colors.shift();

    // Verify if all colors are hexadecimal
    for(let color of colors) {
        try {
            validateHexadecimal(color);
        } catch(error) {
            console.error(`??? ${pageName} : ${error.message}`);
            isCorrectFormat = false;
        }
    }

    if(!isCorrectFormat) return;

    try {
        await renamePage(page, pageName);

        generatePalette(page, colors, pageName);
    }catch(error){
        console.error(`An error occurred while trying to update the page. The id page was : ${page.id}.`);
        undoNaming(page);
    }
}

async function generatePalette(page, colors, pageName) {

    const colorBlocks = generatePrompt('noText', colors, pageName);
    const promptBcolor = generatePrompt('back', colors, pageName);
    const promptFcolor = generatePrompt('front', colors, pageName);

    try {
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
                {
                    object: 'block',
                    type: 'heading_1',
                    heading_1: {
                        rich_text: [
                            {
                                text: { content: "Copy Paste Hexad??cimal" },
                            }
                        ],
                    }
                }
            ],
        });
    }catch(e) {
        console.error(`An error occurred while putting blocks children : ${e.message}`);
        undoNaming(page);
    }

    let bulletsProperties = [];

    for(let color of colors) {
        bulletsProperties.push({
            object: 'block',
            type: 'bulleted_list_item',
            bulleted_list_item: {
                rich_text: [
                    {
                        text: { content: color },
                    }
                ]
            }
        });
    }

    await appendBullet(page, bulletsProperties)
    console.log(`??? Palette [${pageName}] has been generated.`);
} 

function generatePrompt(usecase, colors, pageName) {
    let prompt = "";
    if(usecase === 'front') prompt += "\\begin{array}{c}\\vcenter{";
    prompt += "\\huge";

    for(let i = 0; i < colors.length; i++) {
        let nextColor = colors[i + 1];

        
        if(nextColor === undefined) nextColor = colors[0];

        if(usecase === 'front') prompt += `\\color{${colors[i]}}{${pageName}}`;

        if(usecase === 'back') {
            colorHexa = colors[i].split("#");
            colorHexa[0] = "#";
            prompt += `\\fcolorbox{${colors[i]}}{${colors[i]}}{\\color{${nextColor}}{\\${colorHexa[0]}${colorHexa[1]}}}\\\\`;
        }

        if(usecase === 'noText') 
        {
            prompt += `\\fcolorbox{${colors[i]}}{${colors[i]}}{\\color{${colors[i]}}{${"o".repeat(MAX_LENGTH_PAGE)}}}\\\\`;
        }


        if(nextColor !== undefined && usecase === "front") prompt += `\\thickspace`;
    }
    
    if(usecase === 'front') prompt += "}\\end{array}";

    return prompt;
}

async function appendBullet(page, bulletsProperties) {
    try {
        await notion.blocks.children.append({
            block_id: page.id,
            children: bulletsProperties
        });
    }catch(e) {
        console.error(`An error occurred while putting bullet points : ${e.message}`);
        undoNaming(page);
    }
}

function validateHexadecimal(color) {
    if(!color.match(/^#([A-Fa-f0-9]{3}){1,2}$/i)) {
        throw new Error(`Invalid hexadecimal parameter : ${color}`);
    }
}

async function undoNaming(page) {
    let promises = [];

    for(const key in memoName) {
        if(memoName.hasOwnProperty(key)) {
            promises.push(await renamePage(page, memoName[key]));
        }
    }

    Promise.all(promises).then(() => {
        console.log(`Pages name resetted.`);
    })
}

async function renamePage(page, newName) {
    await notion.pages.update({
        page_id: page.id,
        properties: {
            Name: {
                title: [{ text: { content: newName } }]
            }
        }
    })
}

main();