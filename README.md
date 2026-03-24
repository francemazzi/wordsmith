# wordsmith-ts

> 🧩 A lightweight functional Node.js library to extract and replace variables in Word (.docx) files with support for dynamic table generation.

[![npm version](https://img.shields.io/npm/v/wordsmith-ts.svg?style=flat-square)](https://www.npmjs.com/package/wordsmith-ts)
[![License](https://img.shields.io/npm/l/wordsmith-ts.svg?style=flat-square)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/francemazzi/wordsmith?style=flat-square)](https://github.com/francemazzi/wordsmith)

---

## ✨ Features

- 📄 **Read and parse .docx files** - Works with file paths or buffers
- 🔍 **Extract variables** - Find all `{{variables}}` in your documents
- 🔁 **Replace dynamically** - Simple text and complex table variables
- 📊 **Dynamic tables** - Expand table rows or columns from arrays
- 🔄 **Transposed tables** - Support for tables with headers in the first column
- 🧮 **Grid tables** - Tables with headers on both first row and first column
- ☑️ **Closed questionnaire DSL** - Native support for yes/no and single-choice markers
- 🎯 **Functional design** - Pure functions, composable, testable
- ⚡️ **TypeScript support** - Full type definitions included
- 🚀 **Zero configuration** - Works out of the box

---

## 🚀 Installation

```bash
npm install wordsmith-ts
```

Or with other package managers:

```bash
yarn add wordsmith-ts
pnpm add wordsmith-ts
```

### Module Compatibility

**wordsmith-ts** supports both **ES Modules (ESM)** and **CommonJS (CJS)**, making it compatible with any Node.js project.

#### ES Modules (ESM)

```javascript
import { extract, replace, process } from "wordsmith-ts";

// Your code here...
```

#### CommonJS (CJS)

```javascript
const { extract, replace, process } = require("wordsmith-ts");

// Your code here...
```

The package automatically detects your project's module system and loads the appropriate format.

---

## 📖 Usage

### Basic Example

```javascript
import { extract, replace, process } from "wordsmith-ts";

// Extract variables from a template
const result = await extract("./template.docx");
console.log(result.variables); // ['name', 'date', ...]
console.log(result.tableVariables); // { items: ['name', 'qty', 'price'] }

// Replace variables
const output = await replace("./template.docx", {
  name: "Mario Rossi",
  date: "2025-11-03",
  company: "Acme Corp",
});

// Save to file
import { writeFileSync } from "fs";
writeFileSync("./output.docx", output);

// Or use process() for one-step operation
await process("./template.docx", data, "./output.docx");
```

---

## 📝 Variable Syntax

### Simple Variables

Use double curly braces `{{variable}}` in your Word document:

```
Hello {{name}},

Your order #{{orderNumber}} dated {{date}} has been confirmed.
Total amount: {{total}} EUR
```

Then replace them:

```javascript
const data = {
  name: "Mario Rossi",
  orderNumber: "2025-001",
  date: "2025-11-03",
  total: "1,250.00",
};

await replace("./template.docx", data);
```

### Table Variables (Dynamic Rows)

Create a template row in your Word table with `{{arrayName.fieldName}}`. Headers go in the first row, variables in a single template row below:

```
┌────────────┬─────────┬────────┬─────────┐
│ Product    │ Qty     │ Price  │ Total   │
├────────────┼─────────┼────────┼─────────┤
│ {{items.name}}│{{items.qty}}│{{items.price}}│{{items.total}}│
└────────────┴─────────┴────────┴─────────┘
```

The library will:

1. Detect the template row (the one containing `{{array.field}}` variables)
2. Clone it for each item in the array
3. Replace variables with actual values

```javascript
const data = {
  items: [
    { name: "Laptop", qty: 2, price: "1,200", total: "2,400" },
    { name: "Mouse", qty: 5, price: "25", total: "125" },
    { name: "Keyboard", qty: 3, price: "80", total: "240" },
  ],
};

await replace("./invoice.docx", data);
```

**Result:**

```
┌────────────┬─────────┬────────┬─────────┐
│ Product    │ Qty     │ Price  │ Total   │
├────────────┼─────────┼────────┼─────────┤
│ Laptop     │ 2       │ 1,200  │ 2,400   │
│ Mouse      │ 5       │ 25     │ 125     │
│ Keyboard   │ 3       │ 80     │ 240     │
└────────────┴─────────┴────────┴─────────┘
```

**Detection rule:** When a single row contains `{{array.field}}` variables, the library expands **rows** vertically.

### Transposed Table Variables (Dynamic Columns)

When headers are in the **first column** instead of the first row, the library automatically detects the transposed layout and expands **columns** horizontally:

```
┌────────────┬──────────────────┐
│ Product    │ {{items.name}}   │
├────────────┼──────────────────┤
│ Qty        │ {{items.qty}}    │
├────────────┼──────────────────┤
│ Price      │ {{items.price}}  │
└────────────┴──────────────────┘
```

```javascript
const data = {
  items: [
    { name: "Laptop", qty: 2, price: "1,200" },
    { name: "Mouse", qty: 5, price: "25" },
    { name: "Keyboard", qty: 3, price: "80" },
  ],
};

await replace("./template.docx", data);
```

**Result:**

```
┌────────────┬─────────┬─────────┬──────────┐
│ Product    │ Laptop  │ Mouse   │ Keyboard │
├────────────┼─────────┼─────────┼──────────┤
│ Qty        │ 2       │ 5       │ 3        │
├────────────┼─────────┼─────────┼──────────┤
│ Price      │ 1,200   │ 25      │ 80       │
└────────────┴─────────┴─────────┴──────────┘
```

**Detection rule:** When **multiple rows** contain `{{array.field}}` variables referencing the **same array**, the library expands **columns** horizontally.

### Grid Tables (Headers on Both Axes)

For tables with headers on both the first row **and** the first column, use **object property access** with a different object name per row:

```
┌──────────────────────────┬──────────────────────────┬───────────────────┐
│                          │ Certificato              │ Note              │
├──────────────────────────┼──────────────────────────┼───────────────────┤
│ La cucina è sicura?      │ {{cucina.certificato}}   │ {{cucina.note}}   │
├──────────────────────────┼──────────────────────────┼───────────────────┤
│ Ha superato il test?     │ {{test.certificato}}     │ {{test.note}}     │
└──────────────────────────┴──────────────────────────┴───────────────────┘
```

```javascript
const data = {
  cucina: { certificato: "Sì", note: "Conforme alle normative" },
  test: { certificato: "No", note: "Da ripetere entro 30gg" },
};

await replace("./checklist.docx", data);
```

**Result:**

```
┌──────────────────────────┬──────────────────────────┬─────────────────────────┐
│                          │ Certificato              │ Note                    │
├──────────────────────────┼──────────────────────────┼─────────────────────────┤
│ La cucina è sicura?      │ Sì                       │ Conforme alle normative │
├──────────────────────────┼──────────────────────────┼─────────────────────────┤
│ Ha superato il test?     │ No                       │ Da ripetere entro 30gg  │
└──────────────────────────┴──────────────────────────┴─────────────────────────┘
```

**Key:** Each row uses a **different object name** (e.g. `cucina`, `test`). The library recognizes they are objects (not arrays) and performs direct variable substitution without any row/column expansion.

### Special Variables

- `{{arrayName.#}}` or `{{arrayName.index}}` - Row/column number (1, 2, 3...)

### Closed Questionnaires (Yes/No and single choice)

For closed questions, you can use the questionnaire DSL syntax:

```text
{{q.apportoModifiche|choice:si|mark:"X"}}
{{q.apportoModifiche|choice:no|mark:"X"}}
{{q.validita|choice:si|mark:"X"}}
```

- `q.apportoModifiche` is the answer path
- `choice:si` is the option that should match
- `mark:"X"` is optional (default mark is `X`)

**Input data:**

```javascript
const data = {
  q: {
    apportoModifiche: "si",
    validita: "no",
  },
};
```

With this data:

- `{{q.apportoModifiche|choice:si|mark:"X"}}` -> `X`
- `{{q.apportoModifiche|choice:no|mark:"X"}}` -> ``
- `{{q.validita|choice:no}}` -> `X` (default mark)

### Migration from Legacy Yes/No Placeholders

Legacy placeholders remain supported:

```text
{{apportoModifiche.si}}
{{apportoModifiche.no}}
```

When you provide `q` answers, the library automatically derives legacy yes/no fields for compatibility:

```javascript
const data = {
  q: {
    apportoModifiche: "si",
  },
};

// Internally derives:
// apportoModifiche.si = "X"
// apportoModifiche.no = ""
```

This lets you migrate templates gradually:

1. Keep existing templates unchanged (legacy placeholders still work)
2. Start writing new templates with questionnaire DSL
3. Move old templates over when convenient

### Real-world Template Example (RAPPORTO MENSILE)

If your template has cells like:

```text
Sono da apportare modifiche? {{apportoModifiche.si}} {{apportoModifiche.no}}
È da considerarsi valida ad oggi? {{validita.si}} {{validita.no}}
```

you can now pass only one answer per question:

```javascript
const data = {
  q: {
    apportoModifiche: "si",
    validita: "no",
  },
};

await replace("./M 5.6.MQ.1C - RAPPORTO MENSILE.docx", data);
```

Resulting markers:

- `{{apportoModifiche.si}}` -> `X`
- `{{apportoModifiche.no}}` -> ``
- `{{validita.si}}` -> ``
- `{{validita.no}}` -> `X`

And if you migrate that table to DSL placeholders, the same input still works:

```text
{{q.apportoModifiche|choice:si|mark:"X"}}
{{q.apportoModifiche|choice:no|mark:"X"}}
{{q.validita|choice:si|mark:"X"}}
{{q.validita|choice:no|mark:"X"}}
```

### Object Property Access

Access properties of single objects (not arrays) in paragraphs and text:

```
Customer: {{user.name}}
Email: {{user.email}}
Address: {{address.street}}, {{address.city}} ({{address.country}})
```

**Data structure:**

```javascript
const data = {
  user: {
    name: "Mario Rossi",
    email: "mario@example.com",
  },
  address: {
    street: "Via Roma 123",
    city: "Milano",
    country: "Italia",
  },
};
```

**Note:** Object properties work everywhere — paragraphs, tables, headers, footers. The library distinguishes between arrays (for table expansion) and objects (for direct substitution) automatically.

### Table Type Detection Summary

The library automatically detects the table type based on the variable layout:

| Layout                                                        | Detection            | Behavior                                           |
| ------------------------------------------------------------- | -------------------- | -------------------------------------------------- |
| 1 row with `{{array.field}}` variables                        | **Standard table**   | Clones the template **row** for each array item    |
| Multiple rows with `{{array.field}}` for the **same** array   | **Transposed table** | Clones the template **column** for each array item |
| Multiple rows with `{{obj.field}}` for **different** objects   | **Grid table**       | Direct substitution, no expansion                  |

### Conditional Blocks

Use conditional logic to show/hide content based on variable values:

```
{{#if isApproved}}
✅ This document has been approved on {{approvalDate}} by {{approverName}}.
{{/if}}
```

Or with else block:

```
{{#if isApproved}}
✅ Document approved
{{else}}
⚠️ Pending approval
{{/if}}
```

**Supported in:** Paragraphs, tables, and any text content.

**Evaluation rules:**

- `true` / `false` → Boolean value
- Numbers → `0` is false, all others are true
- Strings → Empty string is false, all others are true
- Arrays → Empty array is false, all others are true
- `null` / `undefined` → false

**Example:**

```javascript
const data = {
  isApproved: true,
  approvalDate: "2025-11-03",
  approverName: "Dr. Marco Verdi",
  isPending: false,
};

await replace("./template.docx", data);
```

---

## 🔧 API Reference

### `extract(source)`

Extract all variables from a .docx file.

**Parameters:**

- `source: string | Buffer` - File path or Buffer

**Returns:** `Promise<ExtractResult>`

```typescript
type ExtractResult = {
  variables: string[]; // Simple variables
  tableVariables: Record<string, string[]>; // Table variables grouped by array name
  tables: Table[]; // Table metadata
};
```

**Example:**

```javascript
const result = await extract("./template.docx");

console.log(result.variables);
// ['name', 'date', 'total']

console.log(result.tableVariables);
// { items: ['name', 'qty', 'price', 'total'] }
```

---

### `replace(source, data)`

Replace variables in a .docx file.

**Parameters:**

- `source: string | Buffer` - File path or Buffer
- `data: Record<string, any>` - Variable values

**Returns:** `Promise<Buffer>` - Processed .docx file as Buffer

**Example:**

```javascript
const buffer = await replace("./template.docx", {
  name: "John Doe",
  items: [
    { product: "A", qty: 1 },
    { product: "B", qty: 2 },
  ],
});

// Save to file
writeFileSync("./output.docx", buffer);
```

---

### `process(source, data, outputPath)`

All-in-one function: read, replace, and save.

**Parameters:**

- `source: string | Buffer` - Input file path or Buffer
- `data: Record<string, any>` - Variable values
- `outputPath: string` - Output file path

**Returns:** `Promise<void>`

**Example:**

```javascript
await process(
  "./template.docx",
  { name: "Alice", date: "2025-11-03" },
  "./output.docx"
);
```

---

### Advanced API

These lower-level functions are also exported for advanced use cases:

```typescript
import {
  parseVariable,        // Parse a variable name into { name, isTableVariable, arrayName, fieldName }
  extractVariables,     // Extract all variable names from a text string
  processConditionals,  // Process {{#if}}...{{/if}} blocks in a text string
  evaluateCondition,    // Evaluate a value as truthy/falsy (same rules as conditional blocks)
  DEFAULT_PATTERN,             // RegExp for {{variable}} matching
  TABLE_VARIABLE_PATTERN,      // RegExp for {{array.field}} matching
  QUESTIONNAIRE_DSL_PATTERN,   // RegExp for {{q.field|choice:x}} matching
  extractQuestionnaireVariables,
  normalizeQuestionnaireData,
  replaceQuestionnaireDsl,
} from "wordsmith-ts";
```

---

## ⚠️ Error Handling

The library throws descriptive errors for invalid input:

| Scenario                     | Error message                                      |
| ---------------------------- | -------------------------------------------------- |
| File not found               | `File not found: {path}`                           |
| Invalid buffer               | `Invalid buffer provided`                          |
| Invalid data                 | `Invalid data: expected a non-null object`         |
| Corrupt .docx (missing XML)  | `Invalid .docx file: word/document.xml not found`  |
| Malformed XML                | `Failed to parse XML: {details}`                   |

**Missing variables** are left unchanged in the output (e.g. `{{unknown}}` stays as-is).

**Known limitations:**

- When Word splits a `{{variable}}` across multiple XML runs with different formatting, the library heals the token but applies the formatting of the first run to the entire replaced text.
- Very large documents (thousands of tables) may increase memory usage since the entire file is processed in memory.

---

## 💡 Advanced Usage

### Working with Buffers

```javascript
import { readFile } from "fs/promises";

const buffer = await readFile("./template.docx");
const output = await replace(buffer, data);
```

### Multiple Tables

You can have multiple dynamic tables in the same document:

```javascript
const data = {
  // First table
  products: [
    { name: "Product A", price: 100 },
    { name: "Product B", price: 200 },
  ],

  // Second table
  employees: [
    { name: "Mario", role: "Developer" },
    { name: "Luigi", role: "Designer" },
  ],
};
```

---

## 📋 Best Practices

### Creating Templates

✅ **DO:**

- Type variables all at once: `{{name}}`
- Use clear variable names: `{{orderDate}}`, `{{customerName}}`
- Test your template before production
- Keep table structures simple

❌ **DON'T:**

- Don't format part of a variable: `{{na`**`me`**`}}`
- Don't use spaces in names: `{{customer name}}`
- Don't copy/paste from external sources (may include hidden formatting)

### Data Preparation

```javascript
// Good: Prepare data before passing to wordsmith-ts
const data = {
  date: new Date().toLocaleDateString("it-IT"),
  total: formatCurrency(totalAmount),
  items: items.map((item) => ({
    name: item.name,
    qty: item.quantity,
    price: formatCurrency(item.price),
    total: formatCurrency(item.quantity * item.price),
  })),
};

await replace("./template.docx", data);
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Build the project
npm run build
```

---

## 🛠️ Development

```bash
# Clone the repository
git clone https://github.com/francemazzi/wordsmith.git

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Watch mode for development
npm run dev
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

MIT © Francesco

---

Made with ❤️ by frasma using functional programming principles
