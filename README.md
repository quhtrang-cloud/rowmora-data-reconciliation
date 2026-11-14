# Rowmora

**A simpler way to compare spreadsheets and make sense of data differences.**

Rowmora is a responsive web application built with React and TypeScript that helps users compare two datasets, identify missing or differing records, and investigate data inconsistencies.

The application supports CSV and Excel (`.xlsx`) files, allowing users to compare separate files or worksheets within an Excel workbook.

With a straightforward two-step workflow, Rowmora makes it easier to explore differences between datasets without manually checking records row by row.

**[Live Demo](https://rowmora-csv-compare.vercel.app/)**

## Why Rowmora?

Business data is often stored across multiple spreadsheets or exported from different systems. Even when those sources contain related records, their values may not match.

For example, a booking system and a finance export might show different fees for the same booking, contain records missing from one source, or include duplicate booking references. Checking these discrepancies manually can be time-consuming.

Rowmora lets users compare two datasets using a shared identifier, such as a booking reference or product ID. It highlights differences and matching issues for review, but does not decide which source is correct or automatically resolve business inconsistencies.

## Features

### File Upload and Data Preparation

- **CSV and Excel support** - Upload CSV or Excel (`.xlsx`) files.
- **Worksheet selection** - Choose which worksheet to use from an Excel workbook.
- **Header row selection** - Specify the row containing column headers.
- **Data preview** - Inspect parsed records before comparing datasets.
- **Sample datasets** - Explore the application using example inventory files.

### Data Comparison

- **Column matching** - Select a shared column, such as a product ID or booking reference, to match records.
- **Source swapping** - Reverse Source A and Source B to change the comparison direction.
- **Record classification** - Identify records that are present in only one source, contain different values, or match exactly.
- **Field-level differences** - View differing values side by side.
- **Comparison summary** - Review the number of records in each comparison category.
- **Result filtering** - Filter records by comparison status.

### Data Validation

- **Duplicate key detection** - Identify duplicate values in the selected matching column.
- **Missing key detection** - Flag records with missing matching values.
- **Needs review** - Highlight records that cannot be matched reliably and require further investigation.

### User Interface

- **Responsive layout** - Designed for desktop and smaller screens.
- **Light and dark themes** - Switch between appearance modes.
- **Accessible interactions** - Includes keyboard-accessible controls and visible focus indicators.

## How It Works

Rowmora follows a two-step workflow: upload and configure data sources, then compare and review the results.

### Step 1: Upload and Prepare

Upload CSV or Excel files, or select **Try sample data** to explore the application.

For Excel files, choose the worksheet and identify the header row containing the column names.

Rowmora displays a preview of the parsed data so users can verify their selections before proceeding.

### Step 2: Compare and Review

Select a shared matching column that identifies corresponding records across the two sources.

For example:

- `sku` for inventory records
- `id` for general datasets
- `Booking Ref` for booking records

For reliable matching, the selected column should contain unique, non-empty values.

Run the comparison to classify records and inspect field-level differences.

### Understanding Comparison Results

Rowmora classifies records into four categories:

| Status | Description |
| --- | --- |
| **Added** | A record exists in Source B but not in Source A. |
| **Removed** | A record exists in Source A but not in Source B. |
| **Changed** | A matching record contains one or more different field values. |
| **Unchanged** | A matching record contains no detected differences. |

**Important:** Added and Removed describe differences relative to Source A and Source B. They do not necessarily indicate that a record was created or deleted over time.

Similarly, a Changed result indicates a difference between recorded values, not necessarily a business error.

### Reviewing Matching Issues

Some records cannot be compared reliably when their matching keys are missing or duplicated.

Rowmora identifies these cases in the **Needs review** section.

Users can inspect the affected records before interpreting or using the comparison results.

Ambiguous records should not be treated as reliable matches without further investigation.

## Tech Stack

| Technology | Purpose |
| --- | --- |
| React | Component-based user interface |
| TypeScript | Type-safe application development |
| Vite | Development tooling and production builds |
| CSS Modules | Component-scoped styling |
| CSS Custom Properties | Shared design tokens and theme configuration |
| PapaParse | CSV parsing |
| ESLint | Static code analysis |

Excel parsing is implemented in `src/utils/parseExcel.ts`.

The application also uses a custom React hook for managing the light and dark themes.

## Getting Started

### Prerequisites

Make sure Node.js and npm are installed.

### Installation

Clone the repository:

```bash
git clone https://github.com/quhtrang-cloud/rowmora-data-reconciliation.git
cd rowmora-data-reconciliation
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL displayed in your terminal.

### Code Quality

Run ESLint:

```bash
npm run lint
```

### Production Build

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Sample Data

Rowmora includes two example CSV datasets representing inventory records for an office equipment and technology accessories retailer.

The files are located in `public/samples/`:

- `inventory-old.csv`
- `inventory-new.csv`

Both datasets contain the following columns:

| Column | Description |
| --- | --- |
| `sku` | Unique product identifier |
| `product_name` | Product name |
| `category` | Product category |
| `quantity` | Available stock quantity |
| `unit_price` | Unit price in GBP |
| `supplier` | Supplier name |

The sample datasets demonstrate differences such as:

- Inventory quantity adjustments
- Product price differences
- Records present in only one dataset
- Changes to product information
- Records with identical values

To explore the comparison:

1. Select **Start a comparison**.
2. Choose **Try sample data**.
3. Continue to the comparison page.
4. Select `sku` as the matching column.
5. Run the comparison and review the results.

The sample data is illustrative and does not represent live inventory or verified market prices.

## Project Structure

```text
rowmora/
├── public/
│   ├── samples/
│   │   ├── inventory-new.csv
│   │   └── inventory-old.csv
│   ├── favicon.svg
│   └── rowmora-mark.svg
├── src/
│   ├── components/
│   │   └── ui/
│   │       └── Button/
│   │           ├── Button.module.css
│   │           └── Button.tsx
│   ├── features/
│   │   ├── comparison/
│   │   │   ├── ComparisonPage.module.css
│   │   │   └── ComparisonPage.tsx
│   │   └── upload/
│   │       ├── FileDropzone.module.css
│   │       ├── FileDropzone.tsx
│   │       ├── UploadPage.module.css
│   │       └── UploadPage.tsx
│   ├── hooks/
│   │   └── useTheme.ts
│   ├── styles/
│   │   └── tokens.css
│   ├── utils/
│   │   ├── compareRows.ts
│   │   ├── parseCsv.ts
│   │   └── parseExcel.ts
│   ├── App.css
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── .gitignore
├── eslint.config.js
├── index.html
├── package-lock.json
├── package.json
├── README.md
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

Generated directories such as `node_modules/` and `dist/` are omitted from the source tree.

The empty `.github/` directory is also omitted because it does not currently contain tracked configuration files.

## Design and Development

Rowmora follows a feature-based architecture that separates file preparation, comparison functionality, reusable UI components, and data-processing utilities.

The main areas of the application are:

- **Upload feature** - Handles file selection, worksheet configuration, header row selection, and data previews.
- **Comparison feature** - Manages matching configuration, comparison results, filtering, and issue review.
- **Utilities** - Contain parsing and record comparison logic.
- **Reusable components** - Provide consistent interface elements.
- **Theme hook** - Manages appearance preferences.
- **Design tokens** - Define shared colors, typography, spacing, and other visual properties.

The interface uses a restrained cream-and-sage color palette, Fraunces display typography, and Inter for body text.

The design focuses on readable data presentation, clear navigation, and a straightforward comparison workflow.

## Current Limitations

Rowmora is an early-stage application focused on two-source data comparison.

Current limitations include:

- Compares two data sources at a time.
- Requires a shared matching column.
- Uses exact value comparison rather than semantic or approximate matching.
- Does not automatically determine whether a difference represents a business error.
- Does not automatically reconcile conflicting records.
- Does not currently provide an export function for comparison results.
- Performance with very large datasets has not yet been established.

Matching issues, including duplicate or missing keys, require user review.

## Planned Improvements

Future development may include:

- Unit tests for parsing and comparison logic using Vitest.
- Integration and end-to-end tests for key user workflows.
- Continuous Integration using GitHub Actions.
- Exporting comparison results to CSV.
- Search and sorting functionality for comparison results.
- Performance improvements for larger datasets.
- Additional validation for unusual file structures and edge cases.
- More advanced reconciliation rules for business datasets.

## Deployment

Rowmora is deployed on Vercel.

**Live application:** https://rowmora-csv-compare.vercel.app/

Vite generates the production build in the `dist/` directory.

## Author

**Trang Nguyen**

[GitHub](https://github.com/quhtrang-cloud) · [Portfolio](https://my-portfolio-ivory-ten-46.vercel.app/)
