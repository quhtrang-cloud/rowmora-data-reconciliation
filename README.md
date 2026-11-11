# Rowmora

**A CSV comparison tool for finding and reviewing changes between datasets.**

Rowmora is a React and TypeScript web application that compares two CSV files and highlights differences between their records.

It provides a straightforward workflow for uploading files, matching records using a shared column, and reviewing what has been added, removed, or changed.

The project focuses on practical data comparison, clear interface design, and maintainable frontend development.

## Features

- **CSV upload** - Upload two CSV files for comparison.
- **File preview** - Review the uploaded data before comparing.
- **Column matching** - Select a shared column, such as `sku` or `id`, to identify corresponding records.
- **Swap files** - Switch the original and updated files to reverse the comparison direction.
- **Change detection** - Identify added, removed, changed, and unchanged records.
- **Field-level differences** - Display previous and updated values for changed fields.
- **Summary cards** - View record counts for each comparison status.
- **Result filtering** - Filter the comparison table by record status.
- **Sample data** - Explore the application using two example inventory datasets.
- **Responsive design** - A layout designed for desktop and smaller screens.

## How It Works

### 1. Upload and preview

Upload two CSV files or use the provided sample datasets.

Rowmora displays a preview of the uploaded records so you can check the files before continuing.

### 2. Configure the comparison

Choose which file represents the original dataset and which represents the updated dataset.

Select a shared column to match records between the files. For example, `sku` can be used to match inventory products.

The matching column should contain a unique, non-empty value for each record.

### 3. Compare and review

Rowmora compares the records and assigns one of four statuses:

| Status | Meaning |
|---|---|
| Added | The record exists only in the updated file. |
| Removed | The record exists only in the original file. |
| Changed | The record exists in both files but has different field values. |
| Unchanged | The matching record has no detected differences. |

The results include summary counts, status filters, and details of changed values.

## Tech Stack

| Technology | Purpose |
|---|---|
| React | Building the user interface |
| TypeScript | Type-safe application logic |
| Vite | Development server and production builds |
| CSS Modules | Component-level styling |
| PapaParse | Parsing CSV files |

## Getting Started

### Prerequisites

- Node.js
- npm

### Installation

Clone the repository:

```bash
git clone https://github.com/quhtrang-cloud/rowmora.git
cd rowmora
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local address displayed in your terminal.

### Production Build

```bash
npm run build
```

### Preview the Build

```bash
npm run preview
```

## Sample Data

Rowmora includes two CSV files representing inventory records from an example office equipment and technology accessories retailer.

The files are located in `public/samples/`:

- `inventory-old.csv` — Original inventory dataset
- `inventory-new.csv` — Updated inventory dataset

Each dataset contains the following fields:

| Column | Description |
|---|---|
| `sku` | Unique product identifier |
| `product_name` | Product name |
| `category` | Product category |
| `quantity` | Quantity in stock |
| `unit_price` | Unit price in GBP |
| `supplier` | Supplier name |

The sample datasets illustrate common inventory changes, including stock adjustments, price changes, newly added products, and records missing from the updated dataset.

To try the comparison, select **Use sample data** in the application, then choose `sku` as the matching column.

## Project Structure

```text
rowmora/
├── public/
│   ├── samples/
│   │   ├── inventory-old.csv
│   │   └── inventory-new.csv
│   └── favicon.svg
├── src/
│   ├── assets/
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
├── package.json
├── README.md
└── vite.config.ts
```

## Design and Development

Rowmora is organised around two main features: file upload and data comparison.

The application separates reusable UI components, feature-specific interfaces, comparison logic, and shared styling.

CSS Modules are used for component-level styles, while design tokens provide consistent colours, typography, spacing, and other interface properties.

The interface follows a two-step process to keep the workflow focused and make comparison results easier to interpret.

## Current Limitations

- Supports CSV files, not native Excel `.xlsx` files.
- Compares two datasets at a time.
- Requires a shared matching column.
- Uses exact value comparisons rather than approximate or semantic matching.
- Does not automatically determine the cause of a change.
- Does not currently provide a results export feature.

## Planned Improvements

- Automated unit tests for CSV parsing and comparison logic.
- Integration and end-to-end tests for the comparison workflow.
- Exporting comparison results to CSV.
- Searching and sorting comparison results.
- Support for larger datasets.
- Additional validation and error handling for unusual CSV formats.

## Author

**Trang Nguyen**

[GitHub](https://github.com/quhtrang-cloud) · [Portfolio](https://my-portfolio-ivory-ten-46.vercel.app/)
