# Notion Color Palettes

Notion Color Palettes is a project that allows you to visually generate a color palette and store it in a Notion database.

## How it works

1. Place your Notion integration on the page you wish to use as a database.

2. Create a `.env` file in the root of your project with your integration API key and database ID:

```
NOTION_API_KEY=<your-api-key>
NOTION_DATABASE_ID=<your-database-id>
```

3. Create a sub-page in your Notion database with a name such as `{{ Moss | #FFF | #000 | #AAA | #BBB }}`. The `{{ }}` allow the integration to know that it should read this sub-page and replace it with a color palette.

4. Run the command `npm run start` in your terminal to start the application.

And that's it, your color palette is now generated and stored in your Notion database.

## Prerequisites

-   A [Notion](https://www.notion.so/my-integrations) API key.
-   The ID of your Notion Database.
-   `Node.js` and `npm` installed on your computer.

## How to contribute

If you would like to contribute to this project, feel free to submit a pull request on Github.
Any contribution is welcome!
