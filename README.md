# Rowmora

**A simple way to compare CSV files and review data changes.**

Rowmora is a responsive web application built with React and TypeScript. It helps users compare two CSV datasets, identify differences between records, and review changes in a clear, structured interface.

The application provides a straightforward workflow for uploading files, matching records using a shared column, and exploring comparison results.

**[Live Demo](https://rowmora-csv-compare.vercel.app/)** 

## Features

- **CSV upload** - Upload two CSV files for comparison.
- **Data preview** - Review uploaded records before comparing.
- **Column matching** - Choose a shared column, such as `sku` or `id`, to match records.
- **Swap files** - Switch the original and updated datasets to reverse the comparison direction.
- **Change detection** - Identify added, removed, changed, and unchanged records.
- **Field-level differences** - View previous and updated values for modified fields.
- **Comparison summary** - See record counts for each status.
- **Result filtering**  Filter records by comparison status.
- **Sample datasets**  Explore the application using example inventory files.
- **Responsive interface** - Use the application across desktop and smaller screens.

## How It Works

### 1. Upload and preview

Upload two CSV files or select **Try sample data** to explore the application with example datasets.

Rowmora displays a preview of the records before proceeding to the comparison.

### 2. Configure the comparison

Choose which file represents the original dataset and which represents the updated dataset.

Select a shared column to match corresponding records. For example, `sku` can be used to identify products in an inventory dataset.

For reliable results, the matching column should contain unique, non-empty values.

### 3. Compare and review

Rowmora compares the datasets and classifies records into four categories:

| Status | Description |
|---|---|
| **Added** | A record exists only in the updated dataset. |
| **Removed** | A record exists only in the original dataset. |
| **Changed** | A matching record contains one or more different field values. |
| **Unchanged** | A matching record contains no detected differences. |

The results page displays summary counts, filtering options, and details of changed values.

## Tech Stack

| Technology | Purpose |
|---|---|
| React | Component-based user interface |
| TypeScript | Type-safe application development |
| Vite | Development tooling and production builds |
| CSS Modules | Component-scoped styling |
| PapaParse | CSV parsing |
| ESLint | Static code analysis |
| Vitest | Installed for unit testing |

## Getting Started

### Prerequisites

- Node.js
- npm

### Installation

Clone the repository:

```bash
git clone https://github.com/quhtrang-cloud/rowmora-csv-compare.git
cd rowmora-csv-compare
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

- `inventory-old.csv` - Original inventory dataset
- `inventory-new.csv` - Updated inventory dataset

Both datasets use the following columns:

| Column | Description |
|---|---|
| `sku` | Unique product identifier |
| `product_name` | Product name |
| `category` | Product category |
| `quantity` | Available stock quantity |
| `unit_price` | Unit price in GBP |
| `supplier` | Supplier name |

The example datasets illustrate stock adjustments, price changes, new products, and records that are no longer present in the updated file.

To explore the comparison, select **Try sample data**, continue to the comparison page, and choose `sku` as the matching column.

Sample data is illustrative and does not represent live inventory or verified market prices.

## Project Structure

```text
rowmora/
├── public/
│   ├── samples/
│   │   ├── inventory-old.csv
│   │   └── inventory-new.csv
│   └── favicon.svg
├── src/
│   ├── components/
│   │   └── ui/
│   │       └── Button/
│   │           ├── Button.tsx
│   │           └── Button.module.css
│   ├── features/
│   │   ├── comparison/
│   │   │   ├── ComparisonPage.tsx
│   │   │   └── ComparisonPage.module.css
│   │   └── upload/
│   │       ├── FileDropzone.tsx
│   │       ├── FileDropzone.module.css
│   │       ├── UploadPage.tsx
│   │       └── UploadPage.module.css
│   ├── styles/
│   │   └── tokens.css
│   ├── utils/
│   │   ├── compareRows.ts
│   │   └── parseCsv.ts
│   ├── App.tsx
│   ├── App.css
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

## Design and Development

Rowmora uses a feature-based project structure to separate the upload workflow, comparison interface, reusable components, and data-processing utilities.

CSS Modules provide component-level styling, while shared design tokens maintain consistent typography, colors, spacing, and interface elements.

The visual design uses a restrained color palette, clear typography, and a two-step workflow to make data comparison approachable without unnecessary complexity.

## Current Limitations

- Supports CSV files, not native Excel `.xlsx` files.
- Compares two datasets at a time.
- Requires a shared matching column.
- Uses exact value comparisons rather than approximate or semantic matching.
- Does not determine the underlying reason for a data change.
- Does not currently support exporting comparison results.

## Planned Improvements

- Unit tests for CSV parsing and comparison logic using Vitest.
- Integration and end-to-end tests for key user workflows.
- Continuous Integration with GitHub Actions.
- Exporting comparison results to CSV.
- Searching and sorting comparison results.
- Improved handling of larger datasets.
- Additional validation for unusual CSV structures and edge cases.

## Deployment

Rowmora is deployed on Vercel.

**Live application:** https://rowmora-csv-compare.vercel.app/

The project uses Vite to generate a production build in the `dist` directory.

## Author

**Trang Nguyen**

[GitHub](https://github.com/quhtrang-cloud) · [Portfolio](https://my-portfolio-ivory-ten-46.vercel.app/)

